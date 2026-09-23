<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    protected $table = 'clients';

    protected $fillable = [
        'client_code',
        'client_name',
    ];

    public function contactPeople() : HasMany 
    {
        return $this -> hasMany(ClientContactPerson::class);
    }
}
