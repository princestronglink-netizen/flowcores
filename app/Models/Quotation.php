<?php

namespace App\Models;

use App\Models\Concerns\PlacedInPipeline;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_number', 'subject', 'client_id', 'client_contact_person_id',
        'valid_until', 'amount', 'note', 'terms', 'transaction_id', 'created_by',
        'pipeline_id', 'pipeline_stage_id',
    ];

    protected $casts = ['valid_until' => 'date:Y-m-d'];

    protected $appends = ['is_expired'];

    protected static function booted(): void
    {
        static::created(function (self $q) {
            $q->forceFill(['quotation_number' => sprintf('QT-%d-%05d', now()->year, $q->id)])->saveQuietly();
        });
    }

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }

    public function contactPerson(): BelongsTo
    {
        return $this->belongsTo(ClientContactPerson::class, 'client_contact_person_id');
    }

    public function items(): HasMany { return $this->hasMany(QuotationItem::class); }

    public function transaction(): BelongsTo { return $this->belongsTo(Transaction::class); }

    public function getIsExpiredAttribute(): bool
    {
        return $this->valid_until
            && $this->valid_until->copy()->endOfDay()->isPast();
    }

    public static function generateFor(Transaction $tx, ?int $by = null): ?self
    {
        // One quotation per transaction.
        if ($tx->quotations()->exists()) {
            return null;
        }

        $lines = $tx->items()->get();
        if ($lines->isEmpty()) {
            return null;
        }

        $q = static::create([
            'subject'                  => $tx->name,
            'client_id'                => $tx->client_id,
            'client_contact_person_id' => $tx->client_contact_person_id,
            'valid_until'              => now()->addDays(30)->toDateString(),
            'amount'                   => $lines->sum(fn ($l) => $l->quantity * $l->unit_price),
            'note'                     => $tx->note,
            'transaction_id'           => $tx->id,
            'created_by'               => $by,
        ]);

        $q->items()->createMany($lines->map(fn ($l) => [
            'item_variant_id' => $l->item_variant_id,
            'item_name'       => $l->item_name,
            'brand_name'      => $l->brand_name,
            'quantity'        => $l->quantity,
            'unit_price'      => $l->unit_price,
        ])->all());

        return $q;
    }
}