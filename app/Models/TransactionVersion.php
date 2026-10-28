<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** An older version of a transaction's quotation (replaced by a later edit). */
class TransactionVersion extends Model
{
    protected $fillable = ['transaction_id', 'version', 'quotation_number', 'snapshot', 'edited_by'];

    protected $casts = ['snapshot' => 'array'];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    /** Who made the edit that replaced this version. */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by');
    }
}
