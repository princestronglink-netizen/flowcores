<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaction extends Model
{
    protected $table = 'transactions';

    protected $fillable = [
        'name',
        'client_id',
        'client_contact_person_id',
        'pipeline_id',
        'pipeline_stage_id',
        'status',
        'priority',
        'winning_message',
        'amount',
        'note',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function contactPerson(): BelongsTo
    {
        return $this->belongsTo(ClientContactPerson::class, 'client_contact_person_id');
    }

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class, 'pipeline_id');
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'pipeline_stage_id');
    }

    public function stageHistory(): HasMany
    {
        return $this->hasMany(TransactionStageHistory::class)->latest();
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    /**
     * Move this transaction to a new stage and log the change.
     * Validates the stage actually belongs to this transaction's
     * pipeline, so you can't move a "Sales" transaction into a
     * "Support" pipeline's stage by mistake.
     */
    public function moveToStage(PipelineStage $stage, ?int $changedBy = null, ?string $note = null): void
    {
        if ($stage->pipeline_id !== $this->pipeline_id) {
            throw new \InvalidArgumentException(
                'That stage does not belong to this transaction\'s pipeline.'
            );
        }

        $this->update(['pipeline_stage_id' => $stage->id]);

        $this->stageHistory()->create([
            'pipeline_stage_id' => $stage->id,
            'changed_by' => $changedBy,
            'note' => $note,
        ]);
    }

    /**
     * Advance to whatever stage comes next in sort_order.
     * Returns false if already on the final stage (or has no stage set).
     */
    public function advanceStage(?int $changedBy = null, ?string $note = null): bool
    {
        if (! $this->stage) {
            return false;
        }

        $next = $this->pipeline->stages()
            ->where('sort_order', '>', $this->stage->sort_order)
            ->orderBy('sort_order')
            ->first();

        if (! $next) {
            return false;
        }

        $this->moveToStage($next, $changedBy, $note);

        return true;
    }

    /**
     * Mark this transaction as won or lost. Keeps its pipeline_stage_id
     * as-is (for reporting on where it was when it closed) and logs
     * the change in the same history table as stage moves.
     */
    public function markStatus(string $status, ?int $changedBy = null, ?string $note = null): void
    {
        if (! in_array($status, ['won', 'lost'], true)) {
            throw new \InvalidArgumentException('Status must be "won" or "lost".');
        }

        $this->update(['status' => $status]);

        $this->stageHistory()->create([
            'pipeline_stage_id' => $this->pipeline_stage_id,
            'changed_by'        => $changedBy,
            'note'               => $note ?? ucfirst($status) . ' via pipeline board',
        ]);
    }

    /**
     * Sum of (quantity * unit_price) across this transaction's items.
     * Used by the Kanban board card. Eager-load "items" before
     * accessing this on a list of transactions to avoid N+1 queries.
     */
    public function getTotalAttribute(): float
    {
        return $this->items->sum(fn ($item) => $item->quantity * $item->unit_price);
    }
}