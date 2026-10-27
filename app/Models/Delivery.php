<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Delivery extends Model
{
    /** Why returned goods were NOT put back into stock. Keep in sync with returnReasons.js. */
    public const RETURN_REASONS = [
        'damaged'   => 'Damaged',
        'defective' => 'Defective',
        'expired'   => 'Expired',
        'lost'      => 'Lost / missing',
        'other'     => 'Other',
    ];

    protected $fillable = [
        'transaction_id',
        'delivered_by',
        'delivered_at',
        'note',
        'is_return',
        'request_token',
    ];

    protected $casts = [
        'delivered_at' => 'datetime',
        'is_return'    => 'boolean',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function deliverer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivered_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(DeliveryItem::class);
    }
}