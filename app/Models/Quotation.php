<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_number', 'version', 'subject', 'client_id', 'client_contact_person_id',
        'valid_until', 'amount', 'note', 'terms', 'transaction_id', 'created_by',
        'pipeline_id', 'pipeline_stage_id',
    ];

    protected $casts = ['valid_until' => 'date:Y-m-d', 'version' => 'integer'];

    protected $appends = ['is_expired', 'version_label'];

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

    public function versions(): HasMany
    {
        return $this->hasMany(QuotationVersion::class)->orderBy('version');
    }

    public function transaction(): BelongsTo { return $this->belongsTo(Transaction::class); }

    public function getIsExpiredAttribute(): bool
    {
        return $this->valid_until
            && $this->valid_until->copy()->endOfDay()->isPast();
    }

    /** "Initial" for the first copy, "Version 1", "Version 2"... after each edit. */
    public function getVersionLabelAttribute(): string
    {
        return $this->version > 0 ? "Version {$this->version}" : 'Initial';
    }

    /** QT-2026-00012 (without any -1, -2 suffix). */
    public function baseNumber(): string
    {
        return preg_replace('/-\d+$/', '', preg_replace('/^(QT-\d{4}-\d{5}).*$/', '$1', $this->quotation_number));
    }

    /** Full copy of the current state, stored when a new version replaces it. */
    public function snapshot(): array
    {
        $this->loadMissing('items');

        return [
            'subject'                  => $this->subject,
            'client_id'                => $this->client_id,
            'client_contact_person_id' => $this->client_contact_person_id,
            'valid_until'              => $this->valid_until?->toDateString(),
            'amount'                   => (float) $this->amount,
            'note'                     => $this->note,
            'terms'                    => $this->terms,
            'items'                    => $this->items->map(fn ($i) => [
                'item_variant_id' => $i->item_variant_id,
                'item_name'       => $i->item_name,
                'brand_name'      => $i->brand_name,
                'quantity'        => $i->quantity,
                'unit_price'      => (float) $i->unit_price,
            ])->all(),
        ];
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
            'version'                  => 0,
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