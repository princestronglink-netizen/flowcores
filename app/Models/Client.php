<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $table = 'clients';

    protected $fillable = [
        'client_name',
        'address',
    ];

    public function contactPeople(): HasMany
    {
        return $this->hasMany(ClientContactPerson::class);
    }
}