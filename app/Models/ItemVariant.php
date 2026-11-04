<?php

namespace App\Models;

use App\Exceptions\InsufficientStockException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ItemVariant extends Model
{
    public const STATUS_OUT = 'out';
    public const STATUS_LOW = 'low';
    public const STATUS_OK  = 'ok';

    /** Rolling window (in days) used to measure demand. */
    public const DEMAND_DAYS = 30;

    /** Days between placing a supplier order and receiving it. Adjust to your reality. */
    public const LEAD_TIME_DAYS = 7;

    /** Extra days of cover as a buffer against demand spikes or late deliveries. */
    public const SAFETY_STOCK_DAYS = 3;

    protected $fillable = ['item_brand_id', 'unit_of_measure', 'size', 'stock'];

    /** Sent to the frontend with every variant, so badges need no extra queries. */
    protected $appends = ['stock_status', 'demand', 'avg_daily_demand', 'reorder_point'];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(ItemBrand::class, 'item_brand_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * Attach "demand" = total quantity ordered in the last 30 days
     * (all transactions created in the window, except lost ones).
     * Use it like: ItemVariant::withDemand()  or  ->with(['brands.variants' => fn ($q) => $q->withDemand()])
     */
    public function scopeWithDemand($query)
    {
        return $query->select('item_variants.*')->addSelect([
            'demand' => TransactionItem::query()
                ->selectRaw('COALESCE(SUM(transaction_items.quantity), 0)')
                ->whereColumn('transaction_items.item_variant_id', 'item_variants.id')
                ->whereIn(
                    'transaction_items.transaction_id',
                    Transaction::select('id')
                        ->where('status', '!=', 'lost')
                        ->where('created_at', '>=', now()->subDays(self::DEMAND_DAYS))
                ),
        ]);
    }

    /** Total quantity ordered in the last 30 days (0 if loaded without withDemand()). */
    public function getDemandAttribute(): int
    {
        return max(0, (int) ($this->attributes['demand'] ?? 0));
    }

    /** Average units ordered per day over the demand window. */
    public function getAvgDailyDemandAttribute(): float
    {
        return round($this->demand / self::DEMAND_DAYS, 2);
    }

    /**
     * Reorder point = average daily demand × (lead time + safety stock days).
     * Rounded up so we never under-order. 0 when there is no recent demand.
     */
    public function getReorderPointAttribute(): int
    {
        return (int) ceil(
            ($this->demand / self::DEMAND_DAYS) * (self::LEAD_TIME_DAYS + self::SAFETY_STOCK_DAYS)
        );
    }

    /** out = 0 units · low = at or below the reorder point · ok = otherwise. */
    public function getStockStatusAttribute(): string
    {
        $stock = (int) $this->stock;

        if ($stock <= 0) {
            return self::STATUS_OUT;
        }

        return $stock <= $this->reorder_point ? self::STATUS_LOW : self::STATUS_OK;
    }

    /**
     * The ONLY place stock should change. Updates the number and writes the ledger row.
     * Call it on a row you already locked with lockForUpdate() inside a DB transaction.
     *
     * @param int   $delta  signed change (negative = stock out)
     * @param array $ctx    transaction_id, delivery_id, user_id, reference, reason, note, written_off
     * @throws InsufficientStockException  if the result would be below zero
     */
    public function applyStock(int $delta, string $type, array $ctx = []): StockMovement
    {
        $before = (int) $this->stock;
        $after  = $before + $delta;

        if ($after < 0) {
            throw new InsufficientStockException("Stock cannot go below zero (available {$before}).");
        }

        $this->update(['stock' => $after]);

        return $this->movements()->create([
            'type'           => $type,
            'quantity'       => $delta,
            'written_off'    => $ctx['written_off'] ?? 0,
            'stock_before'   => $before,
            'stock_after'    => $after,
            'transaction_id' => $ctx['transaction_id'] ?? null,
            'delivery_id'    => $ctx['delivery_id'] ?? null,
            'user_id'        => $ctx['user_id'] ?? null,
            'reference'      => $ctx['reference'] ?? null,
            'reason'         => $ctx['reason'] ?? null,
            'note'           => $ctx['note'] ?? null,
        ]);
    }
}