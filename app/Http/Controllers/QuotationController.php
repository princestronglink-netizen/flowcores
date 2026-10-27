<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesLineItems;
use App\Models\Client;
use App\Models\Quotation;
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
        ]);
    }

    /** Printable / PDF-able view. */
    public function print(Quotation $quotation)
    {
        return Inertia::render('Quotation/Print', [
            'quotation' => $quotation->load(['client', 'contactPerson', 'items']),
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

        DB::transaction(function () use ($v, $rows, $quotation) {
            $new = $this->fields($v) + [
                'amount' => collect($rows)->sum(fn ($r) => $r['quantity'] * $r['unit_price']),
            ];

            // Only a real change creates a new version (saving without edits does nothing).
            if ($this->hasChanges($quotation, $new, $rows)) {
                $quotation->versions()->create([
                    'version'          => $quotation->version,
                    'quotation_number' => $quotation->quotation_number,
                    'snapshot'         => $quotation->snapshot(),
                    'edited_by'        => auth()->id(),
                ]);

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