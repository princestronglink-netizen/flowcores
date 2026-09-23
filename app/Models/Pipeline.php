<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pipeline extends Model
{
    protected $table = 'pipelines';

    protected $fillable = [
        'pipeline_code',
        'pipeline_name',
        'pipeline_description',
    ];
}
