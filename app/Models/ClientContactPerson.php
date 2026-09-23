<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class ClientContactPerson extends Model
{
    protected $table = 'client_contact_people';

    protected $fillable = [
        'client_id',
        'contact_person',
        'contact_number',
        'email',
    ];

    public function client() : BelongsTo 
    {
        return $this -> belongsTo(Client::class);
    }
}
