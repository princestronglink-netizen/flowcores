<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryItem extends Model
{
    protected $fillable = [
        'delivery_id',
        'transaction_item_id',
        'quantity',
        'written_off_quantity',
        'reason',
        'needs_replacement',
    ];

    protected $casts = [
        'needs_replacement' => 'boolean',
    ];

    public function delivery()
    {
        return $this->belongsTo(Delivery::class);
    }

    public function transactionItem()
    {
        return $this->belongsTo(TransactionItem::class);
    }
}