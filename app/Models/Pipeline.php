<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
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

    /** There is one pipeline: the oldest. */
    public static function default(): self
    {
        return static::orderBy('id')->firstOrFail();
    }

    public function initialStage(): ?PipelineStage
    {
        return $this->stages()->where('is_initial', true)->first()
            ?? $this->stages()->orderBy('sort_order')->first();
    }
}