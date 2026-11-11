<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesPerPage;
use App\Models\Client;
use App\Models\Delivery;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Transaction;
use App\Models\TransactionVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

/**
 * PERMISSIONS (TransactionPolicy):
 *   index            -> viewAny  (transaction.view)
 *   create / store   -> create   (transaction.create)
 *   edit / update    -> update   (transaction.edit)
 *   destroy          -> delete   (transaction.delete)
 *   updateStage      -> moveToStage (one permission per pipeline stage)
 *   updateStatus     -> deal.won / deal.lost
 *   crossCheck       -> viewAny  (prices only with amounts.view)
 * Prices are only sent to users with amounts.view.
 *
 * CONFIRMED CLIENT PO:
 *   Once a client PO is confirmed, the quotation is locked (only priority and winning message
 *   can still change) and the card can no longer go back to a previous stage.
 *
 * DELIVERED ITEMS:
 *   Once anything is delivered (even partially) the card can no longer go back to a previous stage.
 */
class TransactionController extends Controller
{
    use ResolvesPerPage;

    public function index(Request $request)
    {
        Gate::authorize('viewAny', Transaction::class);

        $status   = $request->string('status')->toString();   // open | won | lost | all
        $search   = trim($request->string('search')->toString());
        $stageId  = $request->string('stage')->toString();    // '' | <stage id>
        $priority = $request->string('priority')->toString(); // '' | Low | Medium | High | Critical
        $perPage  = $this->perPage($request);

        // The page defaults to the "open" tab when no status is sent.
        $status   = in_array($status, ['open', 'won', 'lost', 'all'], true) ? $status : 'open';
        $priority = in_array($priority, ['Low', 'Medium', 'High', 'Critical'], true) ? $priority : '';

        // Tab counts across ALL transactions (not just the current page).
        $counts = Transaction::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $transactions = Transaction::with([
            'client',
            'contactPerson',
            'pipeline',
            'stage',
            'items',

            'stageHistory' => fn ($q) => $q
                ->with(['stage:id,stage_name', 'changedBy:id,name'])
                ->latest('id'),

            // Delivery history: deliveries AND returns, newest first.
            'deliveries' => fn ($q) => $q
                ->with([
                    'deliverer:id,name',
                    'items.transactionItem.variant.brand.item', // brand.item is needed for ItemVariant::label
                ])
                ->orderByDesc('delivered_at')
                ->orderByDesc('id'),
        ])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($priority !== '', fn ($q) => $q->where('priority', $priority))
            ->when(ctype_digit($stageId), fn ($q) => $q->where('pipeline_stage_id', (int) $stageId))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . addcslashes($search, '%_\\') . '%';

                $q->where(function ($q) use ($like) {
                    $q->where('name', 'like', $like)
                        ->orWhereHas('client', fn ($c) => $c->where('client_name', 'like', $like))
                        ->orWhereHas('contactPerson', fn ($c) => $c->where('contact_person', 'like', $like))
                        ->orWhereHas('stage', fn ($s) => $s->where('stage_name', 'like', $like))
                        ->orWhereHas('items', fn ($i) => $i->where('item_name', 'like', $like)
                            ->orWhere('brand_name', 'like', $like));
                });
            })
            ->latest()
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        // Delivery history payload (quantities only, no prices) for the Delivery history modal.
        $transactions->getCollection()->each(function ($t) {
            $t->setAttribute('delivery_history', $t->deliveries->map(fn ($d) => [
                'id'           => $d->id,
                'delivered_at' => $d->delivered_at?->toIso8601String(),
                'is_return'    => (bool) $d->is_return,
                'units'        => (int) $d->items->sum('quantity'), // negative for returns
                'dr_number'    => $d->dr_number,
                'dr_file_name' => $d->dr_file_name,
                'dr_file_url'  => $d->dr_file_path ? route('deliveries.dr-file', $d->id) : null,
                'note'         => $d->note,
                'by'           => $d->deliverer?->name,
                'lines'        => $d->items->map(fn ($i) => [
                    'item_name'    => $i->transactionItem?->item_name,
                    'brand_name'   => $i->transactionItem?->brand_name,
                    'variant_name' => $i->transactionItem?->variant?->label,
                    'quantity'     => (int) $i->quantity,
                    'written_off'  => (int) $i->written_off_quantity,
                    'reason'       => $i->reason ? (Delivery::RETURN_REASONS[$i->reason] ?? $i->reason) : null,
                    'replace'      => (bool) $i->needs_replacement,
                ])->values(),
            ])->values());

            $t->unsetRelation('deliveries'); // don't send the raw models twice
        });

        // No amounts.view = the prices never leave the server.
        if (! $request->user()->can('amounts.view')) {
            $transactions->getCollection()->each(function ($t) {
                $t->makeHidden([
                    'amount', 'subtotal', 'markup_percent', 'markup_amount',
                    'vat_percent', 'vat_amount', 'total',
                ]);
                $t->items->each->makeHidden(['unit_price', 'subtotal', 'line_total']);
            });
        }

        // Stage filter options: every stage of the pipeline, in order (not just stages on this page).
        $stages = PipelineStage::orderBy('sort_order')->get(['id', 'stage_name', 'sort_order', 'max_days']);

        return Inertia::render('Transaction/Index', [
            'transactions' => $transactions,
            'stages'       => $stages,
            'counts'       => [
                'open' => (int) ($counts['open'] ?? 0),
                'won'  => (int) ($counts['won'] ?? 0),
                'lost' => (int) ($counts['lost'] ?? 0),
                'all'  => (int) $counts->sum(),
            ],
            'filters'      => [
                'status'   => $status,
                'search'   => $search,
                'stage'    => $stageId,
                'priority' => $priority,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create()
    {
        Gate::authorize('create', Transaction::class);

        return Inertia::render('Transaction/Create', [
            'clients' => Client::with('contactPeople')->orderBy('client_name')->get(),
            'catalog' => $this->catalog(),
        ]);
    }

    public function edit(Transaction $transaction)
    {
        Gate::authorize('update', $transaction);

        $transaction->load([
            'client',
            'contactPerson',
            'pipeline',
            // needed to pre-select the dropdowns, plus how much of each line is already delivered
            'items' => fn ($q) => $q
                ->with('variant.brand')
                ->withSum('deliveryItems as delivered_quantity', 'quantity'),
        ]);

        return Inertia::render('Transaction/Edit', [
            'transaction' => $transaction,
            'clients'     => Client::with('contactPeople')->orderBy('client_name')->get(),
            'catalog'     => $this->catalog(),
            // Same rule update() uses: once anything was delivered, items are frozen.
            'itemsLocked' => $transaction->deliveries()->exists(),
            // A confirmed client PO freezes the whole quotation.
            'poConfirmed' => $this->hasConfirmedPo($transaction),
            // Older quotation versions (the current one is the transaction itself), newest first.
            'versions'    => $transaction->quotationVersions()
                ->with('editor:id,name')
                ->get()
                ->sortByDesc('version')
                ->values()
                ->map(fn (TransactionVersion $v) => [
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

    /**
     * Done deal: the final quotation, the confirmed client PO, what was actually delivered
     * and the uploaded DR files, side by side so they can be cross-checked.
     *
     * Shows: quotation vs PO breakdown (subtotal -> markup -> VAT -> total) and, per
     * item -> brand -> variant, the quoted / PO / final / delivered quantities with each DR.
     */
    public function crossCheck(Request $request, Transaction $transaction)
    {
        Gate::authorize('viewAny', Transaction::class);
        abort_unless($transaction->status === 'won', 404);

        $showAmounts = $request->user()->can('amounts.view');

        $transaction->load(['client', 'contactPerson', 'stage']);

        $markup = (float) $transaction->markup_percent;
        $vat    = (float) $transaction->vat_percent;

        // subtotal -> markup -> VAT -> total (same order as the form and Transaction::breakdown)
        $breakdown = function (float $subtotal, float $markupPct, float $vatPct): array {
            $markupAmt = round($subtotal * $markupPct / 100, 2);
            $net       = round($subtotal + $markupAmt, 2);
            $vatAmt    = round($net * $vatPct / 100, 2);

            return [
                'subtotal'       => round($subtotal, 2),
                'markup_percent' => $markupPct,
                'markup_amount'  => $markupAmt,
                'vat_percent'    => $vatPct,
                'vat_amount'     => $vatAmt,
                'total'          => round($net + $vatAmt, 2),
            ];
        };

        // ---- 1. Final quotation (the sent copy) ----
        $doc        = $transaction->hasQuotation() ? $transaction->quotationDocument() : null;
        $quoteLines = collect($doc ? data_get($doc, 'items', []) : [])->map(fn ($i) => [
            'variant_id'   => (int) data_get($i, 'item_variant_id'),
            'item_name'    => data_get($i, 'item_name'),
            'brand_name'   => data_get($i, 'brand_name'),
            'variant_name' => data_get($i, 'variant_name'),
            'quantity'     => (int) data_get($i, 'quantity'),
            'unit_price'   => (float) data_get($i, 'unit_price'),
        ])->keyBy('variant_id');

        // ---- 2. Confirmed client PO ----
        $po = $transaction->clientPurchaseOrders()
            ->where('status', 'confirmed')
            ->with('items')
            ->latest('confirmed_at')
            ->first();

        $poLines = collect($po?->items ?? [])->map(fn ($i) => [
            'variant_id'   => (int) $i->item_variant_id,
            'item_name'    => $i->item_name,
            'brand_name'   => $i->brand_name,
            'variant_name' => $i->variant_name ?? null,
            'quantity'     => (int) $i->quantity,
            'unit_price'   => (float) $i->unit_price,
        ])->keyBy('variant_id');

        // ---- 3. Final order on the transaction + net delivered per line ----
        $itemModels = $transaction->items()
            ->withSum('deliveryItems as delivered_quantity', 'quantity')
            ->get();

        $finalLines = $itemModels->keyBy('item_variant_id');
        $itemsById  = $itemModels->keyBy('id');

        $variantIds = $quoteLines->keys()
            ->merge($poLines->keys())
            ->merge($finalLines->keys())
            ->unique()
            ->values();

        // Variant names (the snapshots only store item + brand names).
        // A variant has no name column: its label is size + unit of measure (ItemVariant::label).
        $variantModels = ItemVariant::with('brand.item')->whereIn('id', $variantIds)->get()->keyBy('id');
        $variantLabel  = fn ($vid, $fallback = null) => $fallback
            ?? $variantModels->get($vid)?->label
            ?? '—';

        // ---- Deliveries (loaded once; used for the DR list AND the per-variant breakdown) ----
        $deliveryModels = $transaction->deliveries()->with('items')->orderBy('delivered_at')->get();

        // variant_id => [ ['delivery_id', 'dr_number', 'delivered_at', 'is_return', 'quantity'], ... ]
        $deliveredByVariant = [];
        foreach ($deliveryModels as $d) {
            foreach ($d->items as $di) {
                $vid = $itemsById->get($di->transaction_item_id)?->item_variant_id;
                if (! $vid) {
                    continue;
                }
                $deliveredByVariant[$vid][] = [
                    'delivery_id'  => $d->id,
                    'dr_number'    => $d->dr_number,
                    'delivered_at' => $d->delivered_at?->toIso8601String(),
                    'is_return'    => (bool) $d->is_return,
                    'quantity'     => (int) $di->quantity, // negative for returns
                ];
            }
        }

        // ---- Line-by-line comparison (one row per variant) ----
        $rows = $variantIds->map(function ($vid) use (
            $quoteLines, $poLines, $finalLines, $po, $doc, $showAmounts, $variantLabel, $deliveredByVariant
        ) {
            $q = $quoteLines->get($vid);
            $p = $poLines->get($vid);
            $f = $finalLines->get($vid);

            $final     = $f ? (int) $f->quantity : null;
            $delivered = $f ? (int) $f->delivered_quantity : 0;
            $issues    = [];

            if ($doc && ! $q) {
                $issues[] = 'Not on the quotation';
            }
            if ($po && ! $p) {
                $issues[] = 'Not on the client PO';
            }
            if ($q && $p && $q['quantity'] !== $p['quantity']) {
                $issues[] = "Quantity changed: quotation {$q['quantity']} → PO {$p['quantity']}";
            }
            if ($q && $p && abs($q['unit_price'] - $p['unit_price']) > 0.001) {
                $issues[] = 'Unit price differs between quotation and PO';
            }
            if ($f) {
                if ($delivered < $final) {
                    $issues[] = 'Short delivered by ' . ($final - $delivered);
                }
                if ($delivered > $final) {
                    $issues[] = 'Over delivered by ' . ($delivered - $final);
                }
            } else {
                $issues[] = 'Not on the final order';
            }

            return [
                'variant_id'   => $vid,
                'item_name'    => $f?->item_name ?? ($p['item_name'] ?? ($q['item_name'] ?? '—')),
                'brand_name'   => $f?->brand_name ?? ($p['brand_name'] ?? ($q['brand_name'] ?? '')),
                'variant_name' => $variantLabel($vid, $q['variant_name'] ?? $p['variant_name'] ?? null),
                'quoted_qty'   => $q['quantity'] ?? null,
                'po_qty'       => $p['quantity'] ?? null,
                'final_qty'    => $final,
                'delivered'    => $delivered,
                'deliveries'   => $deliveredByVariant[$vid] ?? [],
                // Unit prices
                'quoted_price' => $showAmounts ? ($q['unit_price'] ?? null) : null,
                'po_price'     => $showAmounts ? ($p['unit_price'] ?? null) : null,
                'final_price'  => $showAmounts && $f ? (float) $f->unit_price : null,
                // Line totals (qty x unit price, before markup and VAT)
                'quoted_total'    => $showAmounts && $q ? round($q['quantity'] * $q['unit_price'], 2) : null,
                'po_total'        => $showAmounts && $p ? round($p['quantity'] * $p['unit_price'], 2) : null,
                'final_total'     => $showAmounts && $f ? round($final * (float) $f->unit_price, 2) : null,
                'delivered_total' => $showAmounts && $f ? round($delivered * (float) $f->unit_price, 2) : null,
                'issues'       => $issues,
            ];
        })->sortBy([['item_name', 'asc'], ['brand_name', 'asc'], ['variant_name', 'asc']])->values();

        // ---- Deliveries and their DR files ----
        $deliveries = $deliveryModels->map(function ($d) use ($itemsById, $variantLabel) {
            return [
                'id'           => $d->id,
                'delivered_at' => $d->delivered_at?->toIso8601String(),
                'is_return'    => (bool) $d->is_return,
                'units'        => (int) $d->items->sum('quantity'), // negative for returns
                'dr_number'    => $d->dr_number,
                'dr_file_name' => $d->dr_file_name,
                'has_file'     => filled($d->dr_file_path),
                'file_url'     => filled($d->dr_file_path) ? route('deliveries.dr-file', $d->id) : null,
                'note'         => $d->note,
                'lines'        => $d->items->map(function ($i) use ($itemsById, $variantLabel) {
                    $line = $itemsById->get($i->transaction_item_id);

                    return [
                        'item_name'    => $line?->item_name,
                        'brand_name'   => $line?->brand_name,
                        'variant_name' => $line ? $variantLabel($line->item_variant_id) : null,
                        'quantity'     => (int) $i->quantity,
                    ];
                })->values(),
            ];
        })->values();

        // ---- Breakdowns: quotation vs client PO (subtotal -> markup -> VAT -> total) ----
        $quoteBreakdown = $quoteLines->isNotEmpty()
            ? $breakdown(
                (float) $quoteLines->sum(fn ($l) => $l['quantity'] * $l['unit_price']),
                (float) data_get($doc, 'markup_percent', $markup),
                (float) data_get($doc, 'vat_percent', $vat),
            )
            : null;

        $poBreakdown = $po
            ? $breakdown(
                (float) $poLines->sum(fn ($l) => $l['quantity'] * $l['unit_price']),
                (float) ($po->markup_percent ?? $markup),
                (float) ($po->vat_percent ?? $vat),
            ) + ['stored_total' => (float) $po->total]
            : null;

        $quoteTotal = $quoteBreakdown['total'] ?? null;
        $poTotal    = $po ? (float) $po->total : null;

        $deliveredBreakdown = $breakdown(
            (float) $itemModels->sum(fn ($l) => (int) $l->delivered_quantity * (float) $l->unit_price),
            $markup,
            $vat,
        );
        $deliveredValue = $deliveredBreakdown['total'];

        // ---- Checklist ----
        $realDeliveries = $deliveries->where('is_return', false);
        $missingDr      = $realDeliveries->filter(fn ($d) => ! $d['dr_number'] || ! $d['has_file'])->count();
        $lineIssues     = $rows->filter(fn ($r) => count($r['issues']) > 0)->count();

        $checks = [
            [
                'label'  => 'Quotation was issued and sent',
                'ok'     => (bool) $doc,
                'detail' => $transaction->quotation_number ?? 'No quotation number',
            ],
            [
                'label'  => 'Client PO is confirmed',
                'ok'     => (bool) $po,
                'detail' => $po ? "{$po->cpo_number} · client PO {$po->client_po_number}" : 'No confirmed client PO',
            ],
            [
                'label'  => 'Every line matches (quotation, PO, final order, delivered)',
                'ok'     => $lineIssues === 0,
                'detail' => $lineIssues === 0 ? 'All lines match' : "{$lineIssues} line(s) need a look",
            ],
            [
                'label'  => 'Every delivery has a DR number and an uploaded DR file',
                'ok'     => $realDeliveries->isNotEmpty() && $missingDr === 0,
                'detail' => $realDeliveries->isEmpty()
                    ? 'No deliveries recorded'
                    : ($missingDr === 0 ? 'All DRs on file' : "{$missingDr} delivery(ies) missing a DR"),
            ],
        ];

        if ($showAmounts) {
            $amount   = (float) $transaction->amount;
            $checks[] = [
                'label'  => 'Quotation total, PO total and deal amount agree',
                'ok'     => $quoteTotal !== null && $poTotal !== null
                    && abs($quoteTotal - $poTotal) < 0.01
                    && abs($poTotal - $amount) < 0.01,
                'detail' => 'Compare the totals below',
            ];
        }

        return Inertia::render('Transaction/CrossCheck', [
            'transaction' => [
                'id'               => $transaction->id,
                'name'             => $transaction->name,
                'status'           => $transaction->status,
                'quotation_number' => $transaction->quotation_number,
                'client'           => $transaction->client?->client_name,
                'contact'          => $transaction->contactPerson?->contact_person,
                'stage'            => $transaction->stage?->stage_name,
                'markup_percent'   => $markup,
                'vat_percent'      => $vat,
            ],
            'po' => $po ? [
                'id'               => $po->id,
                'cpo_number'       => $po->cpo_number,
                'client_po_number' => $po->client_po_number,
                'client_po_date'   => $po->client_po_date?->toDateString(),
                'confirmed_at'     => $po->confirmed_at?->toIso8601String(),
            ] : null,
            'showAmounts' => $showAmounts,
            'rows'        => $rows,
            'deliveries'  => $deliveries,
            'checks'      => $checks,
            'totals'      => $showAmounts ? [
                'quotation' => $quoteTotal,
                'po'        => $poTotal,
                'final'     => (float) $transaction->amount,
                'delivered' => $deliveredValue,
            ] : null,
            // Prices only leave the server for users with amounts.view.
            'breakdowns'  => $showAmounts ? [
                'quotation' => $quoteBreakdown,
                'po'        => $poBreakdown,
                'delivered' => $deliveredBreakdown,
            ] : null,
        ]);
    }

    /** Items -> brands -> variants (with category), used by the line-item dropdowns. */
    protected function catalog()
    {
        return Item::with('category', 'brands.variants')->orderBy('item_name')->get();
    }

    /** A confirmed client PO freezes the quotation and stops the card from going back. */
    private function hasConfirmedPo(Transaction $transaction): bool
    {
        return $transaction->clientPurchaseOrders()->where('status', 'confirmed')->exists();
    }

    protected function itemRules(): array
    {
        return [
            'items'                   => 'required|array|min:1',
            'items.*.item_variant_id' => 'required|exists:item_variants,id|distinct',
            'items.*.quantity'        => 'required|integer|min:1',
            'items.*.unit_price'      => 'required|numeric|min:0',
        ];
    }

    protected function transactionRules(): array
    {
        return array_merge([
            'name'                     => 'required|string|max:255',
            'client_id'                => 'required|exists:clients,id',
            'client_contact_person_id' => 'required|exists:client_contact_people,id',
            'priority'                 => 'required|in:Low,Medium,High,Critical',
            'winning_message'          => 'nullable|string',
            // Remarks are printed on the quotation.
            'remarks'                  => 'nullable|string',
            'prepared_by'              => 'nullable|string|max:255',
            'prepared_by_position'     => 'nullable|string|max:255',
            'markup_percent'           => 'required|numeric|min:0|max:1000',
            'vat_percent'              => 'required|numeric|min:0|max:100',
        ], $this->itemRules());
    }

    /**
     * Turn the submitted rows (variant id, qty, price) into rows for
     * transaction_items, filling in item_name and brand_name on the server
     * so the browser can't send wrong values.
     */
    protected function buildItemRows(array $items): array
    {
        $variants = ItemVariant::with('brand.item')
            ->whereIn('id', collect($items)->pluck('item_variant_id'))
            ->get()
            ->keyBy('id');

        return collect($items)->map(function ($row) use ($variants) {
            $variant = $variants[$row['item_variant_id']];

            return [
                'item_variant_id' => $variant->id,
                'item_name'       => $variant->brand->item->item_name,
                'brand_name'      => $variant->brand->brand_name,
                'quantity'        => $row['quantity'],
                'unit_price'      => $row['unit_price'],
            ];
        })->all();
    }

    public function store(Request $request)
    {
        Gate::authorize('create', Transaction::class);

        $validated = $request->validate($this->transactionRules());

        $pipeline     = Pipeline::default();
        $initialStage = $pipeline->initialStage();

        if (! $initialStage) {
            return back()->withErrors([
                'name' => 'The pipeline has no stages yet. Add a stage before creating transactions.',
            ]);
        }

        // Subtotal -> markup -> VAT -> grand total (the amount stored on the transaction).
        $subtotal = collect($validated['items'])->sum(fn ($item) => $item['quantity'] * $item['unit_price']);
        $amount   = Transaction::breakdown(
            (float) $subtotal,
            (float) $validated['markup_percent'],
            (float) $validated['vat_percent'],
        )['total'];

        $itemRows = $this->buildItemRows($validated['items']);

        $user     = auth()->user();
        $messages = [];

        DB::transaction(function () use ($validated, $pipeline, $initialStage, $amount, $itemRows, $user, &$messages) {
            $transaction = Transaction::create([
                'name'                     => $validated['name'],
                'client_id'                => $validated['client_id'],
                'client_contact_person_id' => $validated['client_contact_person_id'],
                'pipeline_id'              => $pipeline->id,
                'pipeline_stage_id'        => $initialStage->id,
                'stage_entered_at'         => now(), // first stage: counting starts at creation
                'status'                   => 'open',
                'priority'                 => $validated['priority'],
                'winning_message'          => $validated['winning_message'] ?? null,
                'remarks'                  => $validated['remarks'] ?? null,
                // Prepared by defaults to the logged-in user (name + position).
                'prepared_by'              => $validated['prepared_by'] ?? $user?->name,
                'prepared_by_position'     => $validated['prepared_by_position'] ?? $user?->position,
                'amount'                   => $amount,
                'markup_percent'           => $validated['markup_percent'],
                'vat_percent'              => $validated['vat_percent'],
            ]);

            $transaction->items()->createMany($itemRows);

            $transaction->stageHistory()->create([
                'pipeline_stage_id' => $initialStage->id,
                'changed_by'        => auth()->id(),
                'note'              => 'Transaction created',
            ]);

            // The first stage can also be flagged (quotation / client PO / purchase order / delivery).
            $messages = $transaction->runStageAutomation($initialStage, auth()->id());
        });

        $response = redirect()->route('transactions.index');

        return $messages ? $response->with('stock', implode(' ', $messages)) : $response;
    }

    public function update(Request $request, Transaction $transaction)
    {
        Gate::authorize('update', $transaction);

        // Client PO confirmed: the quotation is locked. Only priority and winning message
        // (which are not printed on the quotation) can still be changed.
        if ($this->hasConfirmedPo($transaction)) {
            $v = $request->validate([
                'priority'        => 'required|in:Low,Medium,High,Critical',
                'winning_message' => 'nullable|string',
            ]);

            $transaction->update([
                'priority'        => $v['priority'],
                'winning_message' => $v['winning_message'] ?? null,
            ]);

            return $this->backTo($request);
        }

        $validated = $request->validate($this->transactionRules());
        $itemRows  = $this->buildItemRows($validated['items']);

        $fields = [
            'name'                     => $validated['name'],
            'client_id'                => $validated['client_id'],
            'client_contact_person_id' => $validated['client_contact_person_id'],
            'priority'                 => $validated['priority'],
            'winning_message'          => $validated['winning_message'] ?? null,
            'remarks'                  => $validated['remarks'] ?? null,
            'prepared_by'              => $validated['prepared_by'] ?? null,
            'prepared_by_position'     => $validated['prepared_by_position'] ?? null,
            'markup_percent'           => $validated['markup_percent'],
            'vat_percent'              => $validated['vat_percent'],
        ];

        // Once anything has been delivered, the items are locked:
        // replacing them would erase the delivery records.
        $itemsLocked = $transaction->deliveries()->exists();

        // Creates the next quotation version when something printed on it really changed.
        $newVersion = $transaction->saveEdit($fields, $itemsLocked ? null : $itemRows, auth()->id());

        // Markup / VAT may have changed without the items changing: keep `amount` correct either way.
        $transaction->refresh()->syncAmount();

        // Keep any DRAFT client PO in step with the edited quotation. Confirmed POs are untouched.
        $transaction->clientPurchaseOrders()->where('status', 'draft')->get()
            ->each->syncFromTransaction();

        $response = $this->backTo($request);

        return $newVersion
            ? $response->with('stock', "Saved as {$transaction->quotation_number}.")
            : $response;
    }

    /** Back to the pipeline when the edit was started from a card, otherwise to the list. */
    private function backTo(Request $request)
    {
        return $request->query('from') === 'pipeline'
            ? redirect()->route('pipelines.index')
            : redirect()->route('transactions.index');
    }

    public function updateStage(Request $request, Transaction $transaction)
    {
        $validated = $request->validate([
            'pipeline_stage_id' => 'required|exists:pipeline_stages,id',
        ]);

        $stage = PipelineStage::findOrFail($validated['pipeline_stage_id']);
        $from  = $transaction->stage;

        if ($stage->pipeline_id !== $transaction->pipeline_id) {
            return back()->withErrors([
                'pipeline_stage_id' => 'That stage does not belong to this transaction\'s pipeline.',
            ]);
        }

        // Permission: the user must be allowed to move cards INTO this stage.
        if (Gate::denies('moveToStage', [$transaction, $stage])) {
            return back()->withErrors([
                'pipeline_stage_id' => "You don't have permission to move cards to {$stage->stage_name}.",
            ]);
        }

        // Stages can't be skipped: only the next or previous stage is allowed.
        if ($from && abs($stage->sort_order - $from->sort_order) !== 1) {
            return back()->withErrors([
                'pipeline_stage_id' => 'Stages cannot be skipped. Move the transaction one stage at a time.',
            ]);
        }

        // Once the client PO is confirmed, the card can only move forward.
        if ($from && $stage->sort_order < $from->sort_order && $this->hasConfirmedPo($transaction)) {
            return back()->withErrors([
                'pipeline_stage_id' => 'The client purchase order is confirmed, so this transaction can no longer go back to a previous stage.',
            ]);
        }

        // Once anything has been delivered (even partially), the card can only move forward.
        // Returning the goods (net delivered back to 0) lifts this again.
        if ($from && $stage->sort_order < $from->sort_order && $transaction->hasDeliveredItems()) {
            return back()->withErrors([
                'pipeline_stage_id' => 'Items have been delivered, so this transaction can no longer go back to a previous stage.',
            ]);
        }

        // Leaving the client PO stage: the client's PO must be confirmed first.
        if ($from && $from->creates_client_po && $stage->sort_order > $from->sort_order && $transaction->clientPoBlocksProgress()) {
            return back()->withErrors([
                'pipeline_stage_id' => 'Confirm the client purchase order before moving past this stage.',
            ]);
        }

        $deliveryStage = $transaction->deliveryStage();

        if ($deliveryStage && $from) {
            $movingForward = $stage->sort_order > $from->sort_order;

            // Leaving the delivery stage: everything must be delivered first.
            if ($from->id === $deliveryStage->id && $movingForward && ! $transaction->isFullyDelivered()) {
                return back()->withErrors([
                    'pipeline_stage_id' => 'Deliver every item in full before moving past the delivery stage.',
                ]);
            }

        }

        if ($stage->is_final && $transaction->deliveryBlocksCompletion()) {
            return back()->withErrors([
                'pipeline_stage_id' => 'Deliver every item in full before moving to the final stage.',
            ]);
        }

        try {
            $messages = $transaction->moveToStage($stage, auth()->id(), 'Moved via pipeline board');
        } catch (\RuntimeException $e) {
            return back()->withErrors(['pipeline_stage_id' => $e->getMessage()]);
        }

        return $messages ? back()->with('stock', implode(' ', $messages)) : back();
    }

    /** Delivery records are never wiped: goods that are still out must be returned first. */
    public function destroy(Transaction $transaction)
    {
        Gate::authorize('delete', $transaction);

        if ($transaction->hasDeliveredItems()) {
            return back()->withErrors([
                'delete' => 'Items from this transaction are still delivered. Return them first (or mark the deal as lost) before deleting.',
            ]);
        }

        $transaction->delete();

        return redirect()->route('transactions.index');
    }

    public function updateStatus(Request $request, Transaction $transaction)
    {
        $validated = $request->validate([
            'status'  => 'required|in:won,lost',
            'restock' => 'nullable|boolean',
            'reason'  => 'nullable|string|in:' . implode(',', array_keys(Delivery::RETURN_REASONS)),
        ]);

        // Permission: deal.won = Done Deal, deal.lost = Lost Deal.
        // Checked first, before anything touches stock or status.
        if (! $request->user()->can("deal.{$validated['status']}")) {
            return back()->withErrors([
                'status' => $validated['status'] === 'won'
                    ? "You don't have permission to mark deals as Done."
                    : "You don't have permission to mark deals as Lost.",
            ]);
        }

        $restock = $request->boolean('restock', true);

        // A deal can only be won from the final stage. Lost is allowed from any stage.
        if ($validated['status'] === 'won') {
            if (! $transaction->stage?->is_final) {
                return back()->withErrors([
                    'status' => 'A deal can only be marked as done from the final stage.',
                ]);
            }

            if ($transaction->deliveryBlocksCompletion()) {
                return back()->withErrors([
                    'status' => 'Deliver every item in full before marking the deal as done.',
                ]);
            }
        }

        $outstanding = $validated['status'] === 'lost' ? $transaction->deliveredQuantity() : 0;

        if ($outstanding > 0 && ! $restock && empty($validated['reason'])) {
            return back()->withErrors([
                'status' => 'Choose a reason for not putting the items back into stock.',
            ]);
        }

        try {
            $transaction->markStatus($validated['status'], auth()->id(), null, $restock, $validated['reason'] ?? null);
        } catch (\RuntimeException $e) {
            return back()->withErrors(['status' => $e->getMessage()]);
        }

        $response = back();

        if ($outstanding > 0) {
            $response->with('stock_returned', $restock
                ? "{$outstanding} delivered unit(s) put back into stock."
                : "{$outstanding} delivered unit(s) written off, stock not changed.");
        }

        return $response;
    }
}