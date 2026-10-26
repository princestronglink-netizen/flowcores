<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ItemBrand extends Model
{
    protected $fillable = ['item_id', 'brand_name'];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ItemVariant::class);
    }
}