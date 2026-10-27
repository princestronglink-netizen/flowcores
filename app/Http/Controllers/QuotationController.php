<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesLineItems;
use App\Models\Client;
use App\Models\ClientContactPerson;
use App\Models\Quotation;
use App\Models\QuotationVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class QuotationController extends Controller
{
    use HandlesLineItems;

    public function index()
    {
        return Inertia::render('Quotation/Index', [
            'quotations' => Quotation::with(['client', 'contactPerson', 'items', 'transaction:id,name'])
                ->latest()->get(),
        ]);
    }

    public function edit(Quotation $quotation)
    {
        return Inertia::render('Quotation/Edit', [
            'quotation' => $quotation->load('items.variant.brand'),
            'clients'   => Client::with('contactPeople')->orderBy('client_name')->get(),
            'catalog'   => $this->catalog(),
            // Older versions, newest first. The live row is always the latest version.
            'versions'  => $quotation->versions()
                ->with('editor:id,name')
                ->get()
                ->sortByDesc('version')
                ->values()
                ->map(fn (QuotationVersion $v) => [
                    'id'               => $v->id,
                    'version'          => $v->version,
                    'version_label'    => $v->version > 0 ? "Version {$v->version}" : 'Initial',
                    'quotation_number' => $v->quotation_number,
                    'amount'           => $v->snapshot['amount'] ?? 0,
                    'item_count'       => count($v->snapshot['items'] ?? []),
                    'replaced_at'      => $v->created_at?->toIso8601String(),
                    'edited_by'        => $v->editor?->name,
                ]),
        ]);
    }

    /** Printable / PDF-able view of the current version. */
    public function print(Quotation $quotation)
    {
        return Inertia::render('Quotation/Print', [
            'quotation' => $quotation->load(['client', 'contactPerson', 'items']),
        ]);
    }

    /** Printable view of an older version, rebuilt from its stored snapshot. */
    public function printVersion(Quotation $quotation, QuotationVersion $version)
    {
        abort_unless($version->quotation_id === $quotation->id, 404);

        $s = $version->snapshot;

        return Inertia::render('Quotation/Print', [
            'quotation' => [
                'id'               => $version->id,
                'quotation_number' => $version->quotation_number,
                'subject'          => $s['subject'] ?? null,
                'valid_until'      => $s['valid_until'] ?? null,
                'amount'           => $s['amount'] ?? 0,
                'note'             => $s['note'] ?? null,
                'terms'            => $s['terms'] ?? null,
                // The date printed on the sheet: when the quotation was first created.
                'created_at'       => $quotation->created_at,
                'client'           => Client::find($s['client_id'] ?? null),
                'contact_person'   => ClientContactPerson::find($s['client_contact_person_id'] ?? null),
                'items'            => collect($s['items'] ?? [])
                    ->map(fn ($i) => $i + ['subtotal' => round($i['quantity'] * $i['unit_price'], 2)])
                    ->all(),
            ],
        ]);
    }

    protected function rules(Request $request): array
    {
        return [
            'subject'                  => 'required|string|max:255',
            'client_id'                => 'required|exists:clients,id',
            'client_contact_person_id' => [
                'required',
                Rule::exists('client_contact_people', 'id')->where('client_id', $request->input('client_id')),
            ],
            'valid_until'              => 'nullable|date',
            'note'                     => 'nullable|string',
            'terms'                    => 'nullable|string',
            'items'                    => 'required|array|min:1',
            'items.*.item_variant_id'  => 'required|exists:item_variants,id',
            'items.*.quantity'         => 'required|integer|min:1',
            'items.*.unit_price'       => 'required|numeric|min:0',
        ];
    }

    private function fields(array $v): array
    {
        return [
            'subject'                  => $v['subject'],
            'client_id'                => $v['client_id'],
            'client_contact_person_id' => $v['client_contact_person_id'],
            'valid_until'              => $v['valid_until'] ?? null,
            'note'                     => $v['note'] ?? null,
            'terms'                    => $v['terms'] ?? null,
        ];
    }

    public function update(Request $request, Quotation $quotation)
    {
        $v    = $request->validate($this->rules($request));
        $rows = $this->buildItemRows($v['items']);
        $id   = $quotation->id;

        DB::transaction(function () use ($v, $rows, $id) {
            // Lock the row so two people saving at once can't create the same version number.
            $quotation = Quotation::whereKey($id)->lockForUpdate()->firstOrFail();

            $new = $this->fields($v) + [
                'amount' => collect($rows)->sum(fn ($r) => $r['quantity'] * $r['unit_price']),
            ];

            // Only a real change creates a new version (saving without edits does nothing).
            if ($this->hasChanges($quotation, $new, $rows)) {
                // 1. Keep the current state as an old version, with the number it has now.
                $quotation->versions()->create([
                    'version'          => $quotation->version,
                    'quotation_number' => $quotation->quotation_number,
                    'snapshot'         => $quotation->snapshot(),
                    'edited_by'        => auth()->id(),
                ]);

                // 2. The live row becomes the next version: QT-2026-00012 -> -1 -> -2 -> -3 ...
                $next                    = $quotation->version + 1;
                $new['version']          = $next;
                $new['quotation_number'] = $quotation->baseNumber() . '-' . $next;
            }

            $quotation->update($new);

            $quotation->items()->delete();
            $quotation->items()->createMany($rows);
        });

        return redirect()->route('quotations.index');
    }

    /** Compare the saved quotation with the submitted data (header fields and line items). */
    private function hasChanges(Quotation $quotation, array $new, array $rows): bool
    {
        $quotation->load('items');

        $header = fn (array $d) => [
            (string) $d['subject'],
            (string) $d['client_id'],
            (string) $d['client_contact_person_id'],
            (string) ($d['valid_until'] ?? ''),
            (string) ($d['note'] ?? ''),
            (string) ($d['terms'] ?? ''),
        ];

        $old = [
            'subject'                  => $quotation->subject,
            'client_id'                => $quotation->client_id,
            'client_contact_person_id' => $quotation->client_contact_person_id,
            'valid_until'              => $quotation->valid_until?->toDateString(),
            'note'                     => $quotation->note,
            'terms'                    => $quotation->terms,
        ];

        if ($header($old) !== $header($new)) {
            return true;
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

        return $sig($quotation->items->map->only(['item_variant_id', 'quantity', 'unit_price'])) !== $sig($rows);
    }

    public function destroy(Quotation $quotation)
    {
        $quotation->delete();

        return redirect()->route('quotations.index');
    }
}