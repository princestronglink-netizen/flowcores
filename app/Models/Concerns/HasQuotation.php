<?php

namespace App\Models\Concerns;

use App\Models\Client;
use App\Models\ClientContactPerson;
use App\Models\PipelineStage;
use App\Models\TransactionVersion;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

/**
 * The transaction IS the quotation. Once the card reaches the quotation stage the transaction
 * is stamped with a quotation number; "the quotation" is just a printable document of it.
 *
 * Life of the quotation:
 *   - before the quotation stage     no number, edit freely
 *   - in the quotation stage         number issued (QT-2026-00012), version 0
 *                                    every real change -> -1, -2, ... (old state kept in transaction_versions)
 *   - after the quotation stage      FROZEN: quotation_snapshot holds what was sent. Edits no longer
 *                                    create versions, and printing shows the snapshot.
 *   - moved back to quotation stage  thawed again (snapshot cleared)
 *
 * Used by App\Models\Transaction ( `use HasQuotation;` ).
 */
trait HasQuotation
{
    /** Called by Eloquent when the model is built: no need to touch $fillable / $casts / $appends by hand. */
    public function initializeHasQuotation(): void
    {
        $this->mergeFillable([
            'quotation_number', 'version', 'valid_until', 'terms', 'quotation_issued_at', 'quotation_snapshot',
        ]);

        $this->mergeCasts([
            'valid_until'         => 'date:Y-m-d',
            'version'             => 'integer',
            'quotation_issued_at' => 'datetime',
            'quotation_snapshot'  => 'array',
        ]);

        $this->append(['version_label', 'quotation_is_expired', 'quotation_frozen']);

        // The saved copy can be big and the pages only need `quotation_frozen`, so keep it out of the JSON.
        $this->makeHidden(['quotation_snapshot']);
    }

    /* ------------------------------ Relations ------------------------------ */

    public function quotationVersions(): HasMany
    {
        return $this->hasMany(TransactionVersion::class)->orderBy('version');
    }

    /* ------------------------------- State -------------------------------- */

    public function hasQuotation(): bool
    {
        return $this->quotation_number !== null;
    }

    public function quotationIsFrozen(): bool
    {
        return $this->hasQuotation() && $this->quotation_snapshot !== null;
    }

    public function getQuotationFrozenAttribute(): bool
    {
        return $this->quotationIsFrozen();
    }

    public function getQuotationIsExpiredAttribute(): bool
    {
        return $this->hasQuotation()
            && $this->valid_until
            && $this->valid_until->copy()->endOfDay()->isPast();
    }

    /** "Initial" for the first copy, "Version 1", "Version 2"... after each edit. */
    public function getVersionLabelAttribute(): ?string
    {
        if (! $this->hasQuotation()) {
            return null;
        }

        return $this->version > 0 ? "Version {$this->version}" : 'Initial';
    }

    /** QT-2026-00012-3 -> QT-2026-00012 */
    public function baseQuotationNumber(): string
    {
        preg_match('/^(QT-\d{4}-\d+)(?:-\d+)?$/', (string) $this->quotation_number, $m);

        return $m[1] ?? (string) $this->quotation_number;
    }

    public function quotationStage(): ?PipelineStage
    {
        return $this->pipeline->stages()->where('creates_quotation', true)->first();
    }

    /* ------------------------------ Issuing ------------------------------- */

    /**
     * Stamp the transaction with its quotation number. Returns the number, or null when there
     * was nothing to do (already issued, or no items yet).
     */
    public function issueQuotation(?int $by = null): ?string
    {
        if ($this->hasQuotation() || ! $this->items()->exists()) {
            return null;
        }

        $year = now()->year;

        // Next free number of the year. The unique index on quotation_number is the safety net.
        $last = static::where('quotation_number', 'like', "QT-{$year}-%")
            ->pluck('quotation_number')
            ->map(fn ($n) => (int) (explode('-', $n)[2] ?? 0))
            ->max() ?? 0;

        $this->update([
            'quotation_number'    => sprintf('QT-%d-%05d', $year, $last + 1),
            'version'             => 0,
            'valid_until'         => $this->valid_until ?? now()->addDays(30)->toDateString(),
            'quotation_issued_at' => now(),
        ]);

        return $this->quotation_number;
    }

    /**
     * Freeze the quotation when the card is past the quotation stage, thaw it when it is back.
     * Called from moveToStage() after the stage changed.
     */
    public function syncQuotationFreeze(PipelineStage $stage): void
    {
        if (! $this->hasQuotation() || ! ($qs = $this->quotationStage())) {
            return;
        }

        if ($stage->sort_order > $qs->sort_order) {
            if ($this->quotation_snapshot === null) {
                $this->update(['quotation_snapshot' => $this->quotationSnapshot()]);
            }
        } elseif ($this->quotation_snapshot !== null) {
            $this->update(['quotation_snapshot' => null]);
        }
    }

    /* ------------------------------ Snapshots ----------------------------- */

    /** Full copy of the quotation content as it is right now. */
    public function quotationSnapshot(): array
    {
        $items = $this->items()->get();

        return [
            'subject'                  => $this->name,
            'client_id'                => $this->client_id,
            'client_contact_person_id' => $this->client_contact_person_id,
            'valid_until'              => $this->valid_until?->toDateString(),
            'amount'                   => (float) $this->amount,
            'note'                     => $this->note,
            'terms'                    => $this->terms,
            'items'                    => $items->map(fn ($i) => [
                'item_variant_id' => $i->item_variant_id,
                'item_name'       => $i->item_name,
                'brand_name'      => $i->brand_name,
                'quantity'        => $i->quantity,
                'unit_price'      => (float) $i->unit_price,
            ])->all(),
        ];
    }

    /** What the Quotation/Print page shows for the current version. */
    public function quotationDocument(): array
    {
        return $this->documentFrom(
            $this->quotation_snapshot ?? $this->quotationSnapshot(),
            (string) $this->quotation_number,
            $this->id,
        );
    }

    /** Print data for an older version, rebuilt from its stored snapshot. */
    public function versionDocument(TransactionVersion $v): array
    {
        return $this->documentFrom($v->snapshot, $v->quotation_number, $v->id);
    }

    private function documentFrom(array $s, string $number, int $id): array
    {
        return [
            'id'               => $id,
            'quotation_number' => $number,
            'subject'          => $s['subject'] ?? null,
            'valid_until'      => $s['valid_until'] ?? null,
            'amount'           => $s['amount'] ?? 0,
            'note'             => $s['note'] ?? null,
            'terms'            => $s['terms'] ?? null,
            // The date printed on the sheet: when the quotation was first issued.
            'created_at'       => $this->quotation_issued_at ?? $this->created_at,
            'client'           => Client::find($s['client_id'] ?? null),
            'contact_person'   => ClientContactPerson::find($s['client_contact_person_id'] ?? null),
            'items'            => collect($s['items'] ?? [])
                ->map(fn ($i) => $i + ['subtotal' => round($i['quantity'] * $i['unit_price'], 2)])
                ->all(),
        ];
    }

    /* ------------------------------- Editing ------------------------------ */

    /** Did the submitted header fields / items change anything that is printed on the quotation? */
    public function quotationChanged(array $new, ?array $rows): bool
    {
        $norm = fn (array $d) => array_map(fn ($v) => (string) ($v ?? ''), [
            $d['name'] ?? '',
            $d['client_id'] ?? '',
            $d['client_contact_person_id'] ?? '',
            $d['valid_until'] ?? '',
            $d['note'] ?? '',
            $d['terms'] ?? '',
        ]);

        $old = [
            'name'                     => $this->name,
            'client_id'                => $this->client_id,
            'client_contact_person_id' => $this->client_contact_person_id,
            'valid_until'              => $this->valid_until?->toDateString(),
            'note'                     => $this->note,
            'terms'                    => $this->terms,
        ];

        // Fields the caller did not send are not a change.
        $new = $new + $old;

        if ($norm($old) !== $norm($new)) {
            return true;
        }

        if ($rows === null) {
            return false;
        }

        $sig = fn ($items) => collect($items)
            ->map(fn ($i) => [
                (int) $i['item_variant_id'],
                (int) $i['quantity'],
                number_format((float) $i['unit_price'], 2, '.', ''),
            ])
            ->sortBy(fn ($r) => implode('|', $r))
            ->values()
            ->all();

        return $sig($this->items()->get(['item_variant_id', 'quantity', 'unit_price'])->toArray()) !== $sig($rows);
    }

    /**
     * Save an edit. When the quotation is issued and not frozen, a real change first keeps the
     * current state as an old version, then the live row becomes the next one:
     * QT-2026-00012 -> -1 -> -2 -> ...  Saving without changes creates nothing.
     *
     * $rows = null leaves the items (and amount) alone (items locked after delivery).
     *
     * @return bool true when a new version was created
     */
    public function saveEdit(array $fields, ?array $rows, ?int $by = null): bool
    {
        return DB::transaction(function () use ($fields, $rows, $by) {
            // Lock the row so two people saving at once can't create the same version number.
            $this->lockAndRefresh();

            $newVersion = $this->hasQuotation()
                && ! $this->quotationIsFrozen()
                && $this->quotationChanged($fields, $rows);

            if ($newVersion) {
                $this->quotationVersions()->create([
                    'version'          => $this->version,
                    'quotation_number' => $this->quotation_number,
                    'snapshot'         => $this->quotationSnapshot(),
                    'edited_by'        => $by,
                ]);

                $next                      = $this->version + 1;
                $fields['version']         = $next;
                $fields['quotation_number'] = $this->baseQuotationNumber() . '-' . $next;
            }

            if ($rows !== null) {
                $fields['amount'] = collect($rows)->sum(fn ($r) => $r['quantity'] * $r['unit_price']);
            }

            $this->update($fields);

            if ($rows !== null) {
                $this->items()->delete();
                $this->items()->createMany($rows);
                $this->unsetRelation('items');
            }

            return $newVersion;
        });
    }
}