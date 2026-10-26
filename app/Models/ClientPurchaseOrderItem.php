<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientPurchaseOrderItem extends Model
{
    protected $fillable = [
        'client_purchase_order_id', 'item_variant_id', 'item_name', 'brand_name', 'quantity', 'unit_price',
    ];

    protected $appends = ['subtotal'];

    public function getSubtotalAttribute(): float
    {
        return round($this->quantity * $this->unit_price, 2);
    }

    public function clientPurchaseOrder(): BelongsTo
    {
        return $this->belongsTo(ClientPurchaseOrder::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class, 'item_variant_id');
    }
}