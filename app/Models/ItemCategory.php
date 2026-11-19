<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Models\Concerns\LogsActivity;

class ItemCategory extends Model
{
    use LogsActivity;

    protected function activityLabel(): string
    {
        return (string) $this->category_name;
    }
    
    protected $fillable = ['category_name', 'description'];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }
}
