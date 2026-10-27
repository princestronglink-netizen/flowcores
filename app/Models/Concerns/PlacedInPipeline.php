<?php

namespace App\Models\Concerns;

use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * For records that sit on the pipeline board next to transactions (quotations, purchase orders).
 * The model must define: STAGE_FLAG, BOARD_STATUSES, INITIAL_STATUS, MOVED_STATUS.
 */
trait PlacedInPipeline
{
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'pipeline_stage_id');
    }

    /** The stage flagged for this record type ("creates quotation" / "creates PO"), else the first stage. */
    public static function entryStage(?Pipeline $pipeline): ?PipelineStage
    {
        if (! $pipeline) {
            return null;
        }

        return $pipeline->stages()->where(static::STAGE_FLAG, true)->first()
            ?? $pipeline->initialStage();
    }

    /** Where a new record goes. Empty if no pipeline exists yet (placed later). */
    public function pipelinePlacement(): array
    {
        $pipeline = Pipeline::orderBy('id')->first();

        return [
            'pipeline_id'       => $pipeline?->id,
            'pipeline_stage_id' => static::entryStage($pipeline)?->id,
        ];
    }

    /** Old records created before this existed: put the open ones in their entry stage. */
    public static function placeUnassigned(): void
    {
        if (! Pipeline::exists()) {
            return;
        }

        static::whereNull('pipeline_stage_id')
            ->whereIn('status', static::BOARD_STATUSES)
            ->get()
            ->each(fn ($r) => $r->forceFill($r->pipelinePlacement())->saveQuietly());
    }

    /** One stage forward or back. Status follows the stage (see statusAfterMove). */
    public function moveToStage(PipelineStage $stage): void
    {
        if ($stage->pipeline_id !== $this->pipeline_id) {
            throw new \RuntimeException('That stage does not belong to this pipeline.');
        }

        if (! in_array($this->status, static::BOARD_STATUSES, true)) {
            throw new \RuntimeException('This record is closed and cannot be moved.');
        }

        if ($stage->deducts_stock) {
            throw new \RuntimeException('Only transactions can go to the delivery stage.');
        }

        $from = $this->stage;

        if ($from && abs($stage->sort_order - $from->sort_order) !== 1) {
            throw new \RuntimeException('Stages cannot be skipped. Move it one stage at a time.');
        }

        $status = $this->statusAfterMove($stage);

        $this->update(['pipeline_stage_id' => $stage->id] + ($status ? ['status' => $status] : []));
    }

    /** The entry stage means "not sent yet". Any other stage means it has gone out. */
    protected function statusAfterMove(PipelineStage $stage): ?string
    {
        $isEntry = $stage->id === static::entryStage($this->pipeline)?->id;

        if ($isEntry) {
            return $this->status === static::MOVED_STATUS ? static::INITIAL_STATUS : null;
        }

        return $this->status === static::INITIAL_STATUS ? static::MOVED_STATUS : null;
    }

    /** After a status change made outside the board, keep the card in a matching stage. */
    public function syncStageToStatus(): void
    {
        if (! $this->pipeline_id || ! in_array($this->status, static::BOARD_STATUSES, true) || ! $this->stage) {
            return;
        }

        $current = $this->stage;
        $entry   = static::entryStage($this->pipeline);

        if (! $entry) {
            return;
        }

        if ($this->status === static::INITIAL_STATUS && $current->id !== $entry->id) {
            $target = $entry;
        } elseif ($this->status !== static::INITIAL_STATUS && $current->id === $entry->id) {
            $target = $this->pipeline->stages()
                ->where('sort_order', '>', $current->sort_order)
                ->where('deducts_stock', false)
                ->orderBy('sort_order')
                ->first();
        } else {
            return;
        }

        if ($target) {
            $this->update(['pipeline_stage_id' => $target->id]);
        }
    }
}