<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

/**
 * The client's own order, sent after they accept a quotation.
 * Starts as a copy of the accepted quotation (or the transaction's items). The user edits it to
 * match what the client really ordered. Confirming copies the final items and amount onto the
 * transaction, so delivery and stock code keeps reading transaction_items unchanged.
 */
class ClientPurchaseOrder extends Model
{
    public const STATUSES = [
        'draft'     => 'Draft',
        'confirmed' => 'Confirmed',
        'cancelled' => 'Cancelled',
    ];

    protected $fillable = [
        'cpo_number', 'client_po_number', 'client_po_date', 'status', 'amount', 'note', 'confirmed_at',
        'transaction_id', 'quotation_id', 'client_id', 'client_contact_person_id', 'created_by',
    ];

    protected $casts = [
        'client_po_date' => 'date:Y-m-d',
        'confirmed_at'   => 'datetime',
    ];

    protected static function booted(): void
    {
        static::created(function (self $po) {
            $po->forceFill(['cpo_number' => sprintf('CPO-%d-%05d', now()->year, $po->id)])->saveQuietly();
        });
    }

    public function items(): HasMany { return $this->hasMany(ClientPurchaseOrderItem::class); }

    public function transaction(): BelongsTo { return $this->belongsTo(Transaction::class); }

    public function quotation(): BelongsTo { return $this->belongsTo(Quotation::class); }

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }

    public function contactPerson(): BelongsTo
    {
        return $this->belongsTo(ClientContactPerson::class, 'client_contact_person_id');
    }

    /** Why this record can't be edited right now, or null if it can. */
    public function lockReason(): ?string
    {
        if ($this->status === 'cancelled') {
            return "A cancelled client purchase order can't be edited.";
        }

        $tx = $this->transaction;

        if (! $tx || $tx->status !== 'open') {
            return 'The transaction is already closed.';
        }

        if ($tx->deliveries()->exists() || $tx->isLegacyDeducted()) {
            return 'Goods from this transaction were already delivered, so the order is locked. Return them first.';
        }

        return null;
    }

    /** Copy this order's items and amount onto the transaction (replaces its items). */
    public function syncToTransaction(): void
    {
        $tx    = $this->transaction()->firstOrFail();
        $lines = $this->items()->get();

        $tx->items()->delete();
        $tx->items()->createMany($lines->map(fn ($l) => [
            'item_variant_id' => $l->item_variant_id,
            'item_name'       => $l->item_name,
            'brand_name'      => $l->brand_name,
            'quantity'        => $l->quantity,
            'unit_price'      => $l->unit_price,
        ])->all());

        $tx->update(['amount' => $lines->sum(fn ($l) => $l->quantity * $l->unit_price)]);
    }

    /**
     * draft -> confirmed. Needs the client's PO number. Updates the transaction's items and amount.
     *
     * @throws \RuntimeException
     */
    public function confirm(?int $by = null): void
    {
        DB::transaction(function () use ($by) {
            // Lock the transaction first so a delivery can't slip in while we replace its items.
            $tx = Transaction::whereKey($this->transaction_id)->lockForUpdate()->firstOrFail();
            $this->refresh();
            $this->setRelation('transaction', $tx);

            if ($this->status !== 'draft') {
                throw new \RuntimeException('Only a draft client purchase order can be confirmed.');
            }

            if (blank($this->client_po_number)) {
                throw new \RuntimeException("Enter the client's PO number before confirming.");
            }

            if ($reason = $this->lockReason()) {
                throw new \RuntimeException($reason);
            }

            if ($this->items()->doesntExist()) {
                throw new \RuntimeException('Add at least one item.');
            }

            $this->syncToTransaction();
            $this->update(['status' => 'confirmed', 'confirmed_at' => now()]);

            $tx->stageHistory()->create([
                'pipeline_stage_id' => $tx->pipeline_stage_id,
                'changed_by'        => $by,
                'note'              => "Client PO {$this->client_po_number} confirmed ({$this->cpo_number}): items updated",
            ]);
        });
    }

    /** Called by the pipeline when a transaction enters the "creates client purchase order" stage. */
    public static function generateFor(Transaction $tx, ?int $by = null): ?self
    {
        // One live client PO per transaction (a cancelled one can be replaced).
        if ($tx->clientPurchaseOrders()->where('status', '!=', 'cancelled')->exists()) {
            return null;
        }

        $quotation = $tx->quotations()->latest('id')->first();
        $lines     = $quotation ? $quotation->items()->get() : $tx->items()->get();

        if ($lines->isEmpty()) {
            return null;
        }

        $po = static::create([
            'status'                   => 'draft',
            'amount'                   => $lines->sum(fn ($l) => $l->quantity * $l->unit_price),
            'note'                     => $quotation ? "From quotation {$quotation->quotation_number}" : null,
            'transaction_id'           => $tx->id,
            'quotation_id'             => $quotation?->id,
            'client_id'                => $tx->client_id,
            'client_contact_person_id' => $tx->client_contact_person_id,
            'created_by'               => $by,
        ]);

        $po->items()->createMany($lines->map(fn ($l) => [
            'item_variant_id' => $l->item_variant_id,
            'item_name'       => $l->item_name,
            'brand_name'      => $l->brand_name,
            'quantity'        => $l->quantity,
            'unit_price'      => $l->unit_price,
        ])->all());

        return $po;
    }
}