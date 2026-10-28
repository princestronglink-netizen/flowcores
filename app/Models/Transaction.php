<?php

namespace App\Models;

use App\Exceptions\InsufficientStockException;
use App\Models\Concerns\HasQuotation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class Transaction extends Model
{
    use HasQuotation;

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
        'markup_percent',
        'vat_percent',
        'remarks',              // printed on the quotation
        'prepared_by',          // printed on the quotation
        'prepared_by_position', // printed on the quotation
    ];

    protected $casts = [
        'markup_percent' => 'float',
        'vat_percent'    => 'float',
    ];

    // `total` is the grand total (subtotal + markup + VAT). The rest feed the breakdown in the UI.
    protected $appends = ['total', 'subtotal', 'markup_amount', 'vat_amount'];

    protected $attributes = [
        'status'         => 'open',
        'markup_percent' => 0,
        'vat_percent'    => 12,
    ];

    /* ------------------------------ Relations ------------------------------ */

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

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }

    /* ------------------------------- Stages -------------------------------- */

    public function moveToStage(PipelineStage $stage, ?int $changedBy = null, ?string $note = null): array
    {
        if ($stage->pipeline_id !== $this->pipeline_id) {
            throw new \InvalidArgumentException('That stage does not belong to this transaction\'s pipeline.');
        }

        $messages = [];

        DB::transaction(function () use ($stage, $changedBy, $note, &$messages) {
            $this->update(['pipeline_stage_id' => $stage->id]);
            $this->unsetRelation('stage');

            // Freeze the quotation once the card is past the quotation stage, thaw it when it is back.
            $this->syncQuotationFreeze($stage);

            $this->stageHistory()->create([
                'pipeline_stage_id' => $stage->id,
                'changed_by'        => $changedBy,
                'note'              => $note,
            ]);

            $messages = $this->runStageAutomation($stage, $changedBy);
        });

        return $messages;
    }

    /** Issue the quotation number / auto-create the client purchase order when this stage is flagged for it. */
    public function runStageAutomation(PipelineStage $stage, ?int $by = null): array
    {
        $messages = [];

        if ($stage->creates_quotation && ($number = $this->issueQuotation($by))) {
            $this->stageHistory()->create([
                'pipeline_stage_id' => $stage->id, 'changed_by' => $by,
                'note' => "Quotation {$number} issued",
            ]);
            $messages[] = "Quotation {$number} was issued. You can print it from the card.";
        }

        if ($stage->creates_client_po && ($cpo = ClientPurchaseOrder::generateFor($this, $by))) {
            $this->stageHistory()->create([
                'pipeline_stage_id' => $stage->id, 'changed_by' => $by,
                'note' => "Client purchase order {$cpo->cpo_number} generated",
            ]);
            $messages[] = "Client purchase order {$cpo->cpo_number} was generated. Open it, enter the client's PO number and confirm the final items.";
        }

        return $messages;
    }

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

    /** The one stage of this pipeline where deliveries are recorded. */
    public function deliveryStage(): ?PipelineStage
    {
        return $this->pipeline->stages()->where('deducts_stock', true)->first();
    }

    /** If the card is past the delivery stage, send it back to it. Otherwise it stays put. */
    public function returnToDeliveryStage(?int $changedBy = null, ?string $note = null): ?PipelineStage
    {
        $target = $this->deliveryStage();

        if (! $target || ! $this->stage || $this->stage->sort_order <= $target->sort_order) {
            return null;
        }

        $this->moveToStage($target, $changedBy, $note);

        return $target;
    }

    /**
     * Mark as won or lost.
     * Won: stock stays out (it left with the deliveries).
     * Lost: whatever is still delivered comes back. $restock decides whether it goes back
     *       on the shelf (true) or is written off (false, needs a reason).
     */
    public function markStatus(
        string $status,
        ?int $changedBy = null,
        ?string $note = null,
        bool $restock = true,
        ?string $reason = null
    ): void {
        if (! in_array($status, ['won', 'lost'], true)) {
            throw new \InvalidArgumentException('Status must be "won" or "lost".');
        }

        DB::transaction(function () use ($status, $changedBy, $note, $restock, $reason) {
            $this->lockAndRefresh();

            if ($this->status !== 'open') {
                throw new \RuntimeException('This transaction is already closed.');
            }

            $this->update(['status' => $status]);

            $historyNote = $note ?? ucfirst($status) . ' via pipeline board';

            if ($status === 'lost') {
                $this->returnOutstanding(
                    $restock,
                    $changedBy,
                    $reason,
                    $restock ? 'Deal marked as lost: stock restored' : 'Deal marked as lost: not restocked'
                );

                if (! $restock) {
                    $historyNote .= ' (delivered items written off)';
                }
            }

            $this->stageHistory()->create([
                'pipeline_stage_id' => $this->pipeline_stage_id,
                'changed_by'        => $changedBy,
                'note'              => $historyNote,
            ]);
        });
    }

    /* --------------------------- Delivery status --------------------------- */

    /** Does this transaction's pipeline have a stage that deducts stock? */
    public function requiresDelivery(): bool
    {
        return $this->pipeline->stages()->where('deducts_stock', true)->exists();
    }

    /** Net delivered quantity (deliveries minus returns). */
    public function deliveredQuantity(): int
    {
        return (int) DeliveryItem::whereIn('delivery_id', $this->deliveries()->select('id'))->sum('quantity');
    }

    public function hasDeliveredItems(): bool
    {
        return $this->deliveredQuantity() > 0;
    }

    /**
     * ADDED: true when stock was deducted the old way (before delivery records existed):
     * a "delivery" ledger row that belongs to this transaction but to no delivery record.
     * Used by ClientPurchaseOrder::lockReason().
     */
    public function isLegacyDeducted(): bool
    {
        return StockMovement::where('transaction_id', $this->id)
            ->where('type', StockMovement::TYPE_DELIVERY)
            ->whereNull('delivery_id')
            ->exists();
    }

    public function isFullyDelivered(): bool
    {
        return $this->items()
            ->withSum('deliveryItems as delivered_quantity', 'quantity')
            ->get()
            ->every(fn ($line) => (int) $line->delivered_quantity >= $line->quantity);
    }

    /** True when the pipeline expects deliveries and this transaction isn't fully delivered yet. */
    public function deliveryBlocksCompletion(): bool
    {
        return $this->requiresDelivery() && ! $this->isFullyDelivered();
    }

    /* ---------------------------- Delivery & stock ---------------------------- */

    /**
     * Record one (possibly partial) delivery and deduct exactly those quantities.
     * Every deduction is written to the stock ledger.
     *
     * $token is a one-time id sent by the browser. If the same token arrives twice
     * (double click, network retry) the first delivery is returned and nothing changes.
     *
     * $dr is the optional delivery receipt: ['dr_number' => ?string, 'dr_file_path' => ?string, 'dr_file_name' => ?string]
     *
     * @param  array<int, array{transaction_item_id:int, quantity:int}>  $rows
     * @throws InsufficientStockException  stock is short (nothing is saved)
     * @throws \RuntimeException           the delivery isn't allowed (nothing is saved)
     */
    public function recordDelivery(
        array $rows,
        ?int $deliveredBy = null,
        ?string $note = null,
        ?string $token = null,
        array $dr = [] // DR
    ): Delivery {
        $rows = $this->normalizeRows($rows);

        return DB::transaction(function () use ($rows, $deliveredBy, $note, $token, $dr) {
            $this->lockAndRefresh();

            // Same request sent twice: return the first result, change nothing.
            if ($token && ($existing = $this->deliveries()->where('request_token', $token)->first())) {
                return $existing;
            }

            if ($this->status !== 'open') {
                throw new \RuntimeException('This transaction is already closed.');
            }

            if (! $this->stage?->deducts_stock) {
                throw new \RuntimeException('Deliveries can only be recorded in the delivery stage.');
            }

            if ($rows->isEmpty()) {
                throw new \RuntimeException('Enter a quantity for at least one item.');
            }

            $lines = $this->linesWithDelivered();

            // 1. Every row must be a real line with enough left to deliver.
            foreach ($rows as $row) {
                $line = $lines->get($row['transaction_item_id'])
                    ?? throw new \RuntimeException('One of the items does not belong to this transaction.');

                $remaining = $line->quantity - (int) $line->delivered_quantity;

                if ($row['quantity'] > $remaining) {
                    throw new \RuntimeException("Only {$remaining} left to deliver for {$this->lineLabel($line)}.");
                }
            }

            // 2. Stock check per variant (two lines can share a variant).
            $needByVariant = $rows
                ->groupBy(fn ($r) => $lines[$r['transaction_item_id']]->item_variant_id)
                ->map(fn ($group) => (int) $group->sum('quantity'));

            $variants = $this->lockVariants($needByVariant->keys());

            $short = [];
            foreach ($needByVariant as $variantId => $need) {
                $available = (int) ($variants->get($variantId)?->stock ?? 0);

                if ($available < $need) {
                    $label   = $this->lineLabel($lines->firstWhere('item_variant_id', $variantId));
                    $short[] = "{$label} (available {$available}, needed {$need})";
                }
            }

            if ($short) {
                throw new InsufficientStockException('Not enough stock: ' . implode('; ', $short) . '.');
            }

            // 3. Save.
            $delivery = $this->deliveries()->create([
                'delivered_by'  => $deliveredBy,
                'delivered_at'  => now(),
                'note'          => $note,
                'dr_number'     => $dr['dr_number'] ?? null,     // DR
                'dr_file_path'  => $dr['dr_file_path'] ?? null,  // DR
                'dr_file_name'  => $dr['dr_file_name'] ?? null,  // DR
                'is_return'     => false,
                'request_token' => $token,
            ]);

            foreach ($needByVariant as $variantId => $need) {
                $variants[$variantId]->applyStock(-$need, StockMovement::TYPE_DELIVERY, [
                    'transaction_id' => $this->id,
                    'delivery_id'    => $delivery->id,
                    'user_id'        => $deliveredBy,
                    'reference'      => "Transaction: {$this->name}" . (! empty($dr['dr_number']) ? " · DR {$dr['dr_number']}" : ''), // DR
                    'note'           => $note,
                ]);
            }

            foreach ($rows as $row) {
                $delivery->items()->create([
                    'transaction_item_id' => $row['transaction_item_id'],
                    'quantity'            => $row['quantity'],
                ]);
            }

            return $delivery;
        });
    }

    /**
     * Return delivered items. For every line the user says how many came back and how many
     * of those are NOT restockable (damaged, defective, ...):
     *   - restockable units go back into stock            (ledger: "return")
     *   - non-restockable units stay out of stock         (ledger: "write_off", reason required)
     *
     * And, independently, whether the customer gets a replacement:
     *   - replace = true  → the units stay on the order and can be delivered again
     *   - replace = false → the order shrinks by the returned quantity (amount is recalculated)
     *
     * Allowed in the delivery stage and in any stage after it.
     *
     * @param  array<int, array{transaction_item_id:int, quantity:int, written_off?:int, reason?:string, replace?:bool}>  $rows
     * @throws \RuntimeException  the return isn't allowed (nothing is saved)
     */
    public function recordReturn(array $rows, ?int $returnedBy = null, ?string $note = null, ?string $token = null): Delivery
    {
        $rows = $this->normalizeRows($rows);

        return DB::transaction(function () use ($rows, $returnedBy, $note, $token) {
            $this->lockAndRefresh();

            // Same request sent twice: return the first result, change nothing.
            if ($token && ($existing = $this->deliveries()->where('request_token', $token)->first())) {
                return $existing;
            }

            if ($this->status !== 'open') {
                throw new \RuntimeException('This transaction is already closed.');
            }

            $deliveryStage = $this->deliveryStage();

            if (! $deliveryStage || ! $this->stage || $this->stage->sort_order < $deliveryStage->sort_order) {
                throw new \RuntimeException('Items can only be returned once the transaction has reached the delivery stage.');
            }

            if ($rows->isEmpty()) {
                throw new \RuntimeException('Enter a quantity for at least one item.');
            }

            $lines = $this->linesWithDelivered();

            // 1. Validate every line before touching anything.
            foreach ($rows as $row) {
                $line = $lines->get($row['transaction_item_id'])
                    ?? throw new \RuntimeException('One of the items does not belong to this transaction.');

                $delivered = (int) $line->delivered_quantity;
                $label     = $this->lineLabel($line);

                if ($row['quantity'] > $delivered) {
                    throw new \RuntimeException(
                        "Only {$delivered} delivered for {$label}, so you can't return {$row['quantity']}."
                    );
                }

                if ($row['written_off'] > $row['quantity']) {
                    throw new \RuntimeException("For {$label}, the not-restockable quantity can't exceed the returned quantity.");
                }

                if ($row['written_off'] > 0 && ! $row['reason']) {
                    throw new \RuntimeException("Choose a reason for the units of {$label} that can't go back into stock.");
                }

                if ($row['reason'] && ! array_key_exists($row['reason'], Delivery::RETURN_REASONS)) {
                    throw new \RuntimeException("Unknown return reason for {$label}.");
                }

                if (! $row['replace'] && $line->quantity - $row['quantity'] < 0) {
                    throw new \RuntimeException("The order for {$label} can't go below zero.");
                }
            }

            // 2. Save: one return document, one ledger row per outcome per line.
            $variants = $this->lockVariants($rows->map(fn ($r) => $lines[$r['transaction_item_id']]->item_variant_id));

            $delivery = $this->deliveries()->create([
                'delivered_by'  => $returnedBy,
                'delivered_at'  => now(),
                'note'          => $note,
                'is_return'     => true,
                'request_token' => $token,
            ]);

            $cancelledAny = false;

            foreach ($rows as $row) {
                $line       = $lines[$row['transaction_item_id']];
                $variant    = $variants->get($line->item_variant_id);
                $writtenOff = $row['written_off'];
                $restock    = $row['quantity'] - $writtenOff;

                $ctx = [
                    'transaction_id' => $this->id,
                    'delivery_id'    => $delivery->id,
                    'user_id'        => $returnedBy,
                    'reference'      => "Transaction: {$this->name}",
                    'note'           => $note,
                ];

                if ($variant) {
                    if ($restock > 0) {
                        $variant->applyStock($restock, StockMovement::TYPE_RETURN, $ctx);
                    }

                    if ($writtenOff > 0) {
                        $variant->applyStock(0, StockMovement::TYPE_WRITE_OFF, $ctx + [
                            'written_off' => $writtenOff,
                            'reason'      => $row['reason'],
                        ]);
                    }
                }

                $delivery->items()->create([
                    'transaction_item_id'  => $row['transaction_item_id'],
                    'quantity'             => -$row['quantity'],
                    'written_off_quantity' => $writtenOff,
                    'reason'               => $writtenOff > 0 ? $row['reason'] : null,
                    'needs_replacement'    => $row['replace'],
                ]);

                // No replacement: the customer no longer wants these units, so the order shrinks.
                if (! $row['replace']) {
                    TransactionItem::whereKey($line->id)->decrement('quantity', $row['quantity']);
                    $cancelledAny = true;
                }
            }

            // Keep the stored amount in sync with the reduced order (markup and VAT included).
            if ($cancelledAny) {
                $this->syncAmount();
            }

            return $delivery;
        });
    }

    /**
     * Close out everything that is still delivered (used when a deal is lost).
     * History is always kept: a "return" delivery is added, nothing is wiped.
     *
     * @param bool $restock true  → units go back on the shelf
     *                      false → units are written off (stock unchanged), $reason is kept
     */
    public function returnOutstanding(bool $restock = true, ?int $by = null, ?string $reason = null, ?string $note = null): void
    {
        if (! $this->deliveries()->exists()) {
            return; // nothing was ever delivered
        }

        DB::transaction(function () use ($restock, $by, $reason, $note) {
            $ctx = fn (array $extra = []) => $extra + [
                'transaction_id' => $this->id,
                'user_id'        => $by,
                'reference'      => "Transaction: {$this->name}",
                'reason'         => $restock ? null : $reason,
                'note'           => $note,
            ];

            // delivered_quantity is a net sum (returns are negative), so this is only what is still out.
            $out = $this->linesWithDelivered()->filter(fn ($l) => (int) $l->delivered_quantity > 0);

            if ($out->isEmpty()) {
                return;
            }

            $variants = $this->lockVariants($out->pluck('item_variant_id'));

            $delivery = $this->deliveries()->create([
                'delivered_by' => $by,
                'delivered_at' => now(),
                'note'         => $note,
                'is_return'    => true,
            ]);

            foreach ($out as $line) {
                $qty = (int) $line->delivered_quantity;

                $delivery->items()->create([
                    'transaction_item_id'  => $line->id,
                    'quantity'             => -$qty,
                    'written_off_quantity' => $restock ? 0 : $qty,
                    'reason'               => $restock ? null : $reason,
                ]);

                if ($variant = $variants->get($line->item_variant_id)) {
                    $this->settleVariant($variant, $qty, $restock, $ctx(['delivery_id' => $delivery->id]));
                }
            }
        });
    }

    /* ------------------------------- Pricing ------------------------------- */

    /** One place that knows how the money adds up: subtotal → markup → VAT → grand total. */
    public static function breakdown(float $subtotal, float $markupPercent, float $vatPercent): array
    {
        $markup = round($subtotal * $markupPercent / 100, 2);
        $net    = round($subtotal + $markup, 2);
        $vat    = round($net * $vatPercent / 100, 2);

        return [
            'subtotal'      => round($subtotal, 2),
            'markup_amount' => $markup,
            'net'           => $net,
            'vat_amount'    => $vat,
            'total'         => round($net + $vat, 2),
        ];
    }

    public function currentBreakdown(): array
    {
        $subtotal = $this->items->sum(fn ($item) => $item->quantity * $item->unit_price);

        return static::breakdown((float) $subtotal, (float) $this->markup_percent, (float) $this->vat_percent);
    }

    public function getSubtotalAttribute(): float
    {
        return $this->currentBreakdown()['subtotal'];
    }

    public function getMarkupAmountAttribute(): float
    {
        return $this->currentBreakdown()['markup_amount'];
    }

    public function getVatAmountAttribute(): float
    {
        return $this->currentBreakdown()['vat_amount'];
    }

    public function getTotalAttribute(): float
    {
        return $this->currentBreakdown()['total'];
    }

    /** Re-save the stored `amount` from the items + markup + VAT (call after any change to them). */
    public function syncAmount(): void
    {
        $this->unsetRelation('items');
        $total = $this->currentBreakdown()['total'];

        if ((float) $this->amount !== $total) {
            $this->update(['amount' => $total]);
        }
    }

    /* ------------------------------- Helpers ------------------------------- */

    private function settleVariant(ItemVariant $variant, int $qty, bool $restock, array $ctx): void
    {
        if ($restock) {
            $variant->applyStock($qty, StockMovement::TYPE_RETURN, $ctx);
        } else {
            $variant->applyStock(0, StockMovement::TYPE_WRITE_OFF, $ctx + ['written_off' => $qty]);
        }
    }

    /** Clean the submitted rows: ints only, no zero rows, duplicates merged. */
    private function normalizeRows(array $rows): Collection
    {
        return collect($rows)
            ->map(fn ($r) => [
                'transaction_item_id' => (int) ($r['transaction_item_id'] ?? 0),
                'quantity'            => (int) ($r['quantity'] ?? 0),
                'written_off'         => (int) ($r['written_off'] ?? 0),
                'reason'              => ! empty($r['reason']) ? (string) $r['reason'] : null,
                'replace'             => array_key_exists('replace', $r)
                    ? filter_var($r['replace'], FILTER_VALIDATE_BOOLEAN)
                    : true,
            ])
            ->filter(fn ($r) => $r['quantity'] > 0)
            ->groupBy('transaction_item_id')
            ->map(fn ($group, $id) => [
                'transaction_item_id' => (int) $id,
                'quantity'            => (int) $group->sum('quantity'),
                'written_off'         => (int) $group->sum('written_off'),
                'reason'              => $group->pluck('reason')->filter()->first(),
                'replace'             => $group->every(fn ($r) => $r['replace']),
            ])
            ->values();
    }

    /** Lock this row so two simultaneous deliveries can't both pass the "remaining" check. */
    private function lockAndRefresh(): void
    {
        static::whereKey($this->getKey())->lockForUpdate()->firstOrFail();
        $this->refresh();
    }

    private function linesWithDelivered(): Collection
    {
        return $this->items()
            ->withSum('deliveryItems as delivered_quantity', 'quantity')
            ->get()
            ->keyBy('id');
    }

    /** Lock variants in id order (prevents deadlocks between two requests). */
    private function lockVariants(Collection $variantIds): Collection
    {
        return ItemVariant::whereIn('id', $variantIds->unique()->values())
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
    }

    private function lineLabel(?TransactionItem $line): string
    {
        if (! $line) {
            return 'an item';
        }

        return trim(($line->item_name ?? 'an item') . ($line->brand_name ? " ({$line->brand_name})" : ''));
    }

    public function clientPurchaseOrders(): HasMany
    {
        return $this->hasMany(ClientPurchaseOrder::class, 'transaction_id');
    }

    /** A draft client PO must be confirmed before the card leaves its stage. */
    public function clientPoBlocksProgress(): bool
    {
        return $this->clientPurchaseOrders()->where('status', 'draft')->exists();
    }
}