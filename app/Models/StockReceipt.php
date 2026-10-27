<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockReceipt extends Model
{
    protected $fillable = ['supplier', 'reference', 'received_at', 'note', 'received_by'];

    protected $casts = ['received_at' => 'date:Y-m-d'];

    public function items(): HasMany
    {
        return $this->hasMany(StockReceiptItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}