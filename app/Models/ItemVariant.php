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

    protected $fillable = ['item_brand_id', 'unit_of_measure', 'size', 'price', 'stock', 'reorder_level'];

    /** Sent to the frontend with every variant, so badges need no extra queries. */
    protected $appends = ['stock_status'];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(ItemBrand::class, 'item_brand_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /** out = 0 units · low = at or below the reorder level · ok = otherwise. */
    public function getStockStatusAttribute(): string
    {
        $stock = (int) $this->stock;

        if ($stock <= 0) {
            return self::STATUS_OUT;
        }

        return $stock <= (int) $this->reorder_level ? self::STATUS_LOW : self::STATUS_OK;
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