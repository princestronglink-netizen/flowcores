<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $table='transactions' ;
    
    protected $fillable=[
       'client_name',
       'contact_person',
       'pipeline',
       'amount',
       'note',
    ];
}
