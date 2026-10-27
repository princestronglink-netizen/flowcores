<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationVersion extends Model
{
    protected $fillable = ['quotation_id', 'version', 'quotation_number', 'snapshot', 'edited_by'];

    protected $casts = ['snapshot' => 'array'];

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }
}