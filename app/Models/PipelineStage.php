<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PipelineStage extends Model
{
    protected $table = 'pipeline_stages';

    protected $fillable = [
        'stage_code',
        'stage_name',
        'stage_description',
        'sort_order',
        'is_initial',
        'is_final'
    ];

    protected $casts = [
        'is_initial' => 'boolean',
        'is_final'   => 'boolean',
    ];

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}