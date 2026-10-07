<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\PipelineStage;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pipeline extends Model
{
    protected $table = 'pipelines';

    protected $fillable = [
        'pipeline_code',
        'pipeline_name',
        'pipeline_description',
    ];

    public function stages(): HasMany
    {
        return $this->hasMany(PipelineStage::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}