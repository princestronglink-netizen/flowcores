<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    public const TYPE_OPENING    = 'opening';
    public const TYPE_STOCK_IN   = 'stock_in';    // received from a supplier
    public const TYPE_STOCK_OUT  = 'stock_out';   // damaged / expired / lost in the warehouse
    public const TYPE_DELIVERY   = 'delivery';
    public const TYPE_RETURN     = 'return';      // came back and was restocked
    public const TYPE_WRITE_OFF  = 'write_off';   // came back from a customer but NOT restocked
    public const TYPE_ADJUSTMENT = 'adjustment';  // manual correction (+ or -)

    public const TYPES = [
        self::TYPE_OPENING    => 'Opening stock',
        self::TYPE_STOCK_IN   => 'Stock in',
        self::TYPE_STOCK_OUT  => 'Stock out',
        self::TYPE_DELIVERY   => 'Delivery',
        self::TYPE_RETURN     => 'Returned to stock',
        self::TYPE_WRITE_OFF  => 'Written off',
        self::TYPE_ADJUSTMENT => 'Adjustment',
    ];

    /** Reasons allowed when a manual adjustment ADDS stock. Keep in sync with stockReasons.js. */
    public const ADJUST_REASONS_IN = [
        'received'         => 'Stock received',
        'count_correction' => 'Miscount',
        'other'            => 'Other',
    ];

    /** Reasons allowed when a manual adjustment REMOVES stock. Keep in sync with stockReasons.js. */
    public const ADJUST_REASONS_OUT = [
        'damaged'          => 'Damaged',
        'defective'        => 'Defective',
        'expired'          => 'Expired',
        'lost'             => 'Lost / missing',
        'count_correction' => 'Miscount',
        'internal'         => 'Internal use / sample',
        'other'            => 'Other',
    ];

    protected $fillable = [
        'item_variant_id', 'type', 'quantity', 'written_off', 'stock_before', 'stock_after',
        'transaction_id', 'delivery_id', 'user_id', 'reference', 'reason', 'note',
    ];

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class, 'item_variant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}