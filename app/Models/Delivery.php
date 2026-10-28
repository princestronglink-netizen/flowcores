<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Delivery extends Model
{
    /** Keep in sync with resources/js/Components/Pipeline/returnReasons.js */
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
        'dr_number',      // DR
        'dr_file_path',   // DR
        'dr_file_name',   // DR
        'is_return',
        'request_token',
    ];

    protected $casts = [
        'delivered_at' => 'datetime',
        'is_return'    => 'boolean',
    ];

    // DR: never send the storage path to the browser, send a URL instead.
    protected $hidden  = ['dr_file_path'];
    protected $appends = ['dr_file_url'];

    public function getDrFileUrlAttribute(): ?string
    {
        return $this->dr_file_path ? route('deliveries.dr-file', $this->id) : null;
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DeliveryItem::class);
    }

    public function deliverer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivered_by');
    }
}