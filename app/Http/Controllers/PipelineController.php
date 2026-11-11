<?php

namespace App\Http\Controllers;

use App\Models\ItemVariant;
use App\Models\Pipeline;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PipelineController extends Controller
{
    public function index(Request $request)
    {
        $pipelines = Pipeline::with([
            'stages' => fn ($q) => $q->orderBy('sort_order'),
            'stages.transactions' => fn ($q) => $q->where('status', 'open')->latest(),
            'stages.transactions.client',
            'stages.transactions.contactPerson',
            // `variant` is loaded so every line has variant.label (size + unit of measure).
            'stages.transactions.items' => fn ($q) => $q
                ->with('variant')
                ->withSum('deliveryItems as delivered_quantity', 'quantity'),
            // Delivery history shown in the modal (newest first).
            'stages.transactions.deliveries' => fn ($q) => $q
                ->with(['items', 'deliverer:id,name'])
                ->latest('delivered_at')
                ->latest('id'),
            // Client POs include their items so the card modal can show what the client ordered.
            // markup_percent / vat_percent are selected so the appended totals compute correctly.
            // item_variant_id is selected so PO lines can be matched to quotation lines per variant.
            'stages.transactions.clientPurchaseOrders' => fn ($q) => $q
                ->select(
                    'id', 'cpo_number', 'client_po_number', 'client_po_date', 'status', 'amount',
                    'markup_percent', 'vat_percent', 'transaction_id'
                )
                ->with('items:id,client_purchase_order_id,item_variant_id,item_name,brand_name,quantity,unit_price'),
        ])
            ->withCount([
                'transactions as won_count'  => fn ($q) => $q->where('status', 'won'),
                'transactions as lost_count' => fn ($q) => $q->where('status', 'lost'),
            ])
            ->orderBy('id')
            ->get();

        // PO lines only store item + brand names, so add the variant label to each one.
        $this->attachVariantLabels($pipelines);

        // No permission = the prices never leave the server.
        if (! $request->user()->can('amounts.view')) {
            $this->hideAmounts($pipelines);
        }

        return Inertia::render('Pipeline/Index', [
            'pipelines' => $pipelines,
        ]);
    }

    /** Give every client PO line a `variant_label` (one query for all of them). */
    private function attachVariantLabels($pipelines): void
    {
        $lines = collect();

        foreach ($pipelines as $pipeline) {
            foreach ($pipeline->stages as $stage) {
                foreach ($stage->transactions as $transaction) {
                    foreach ($transaction->clientPurchaseOrders as $cpo) {
                        foreach ($cpo->items as $line) {
                            $lines->push($line);
                        }
                    }
                }
            }
        }

        if ($lines->isEmpty()) {
            return;
        }

        $variants = ItemVariant::whereIn('id', $lines->pluck('item_variant_id')->filter()->unique())
            ->get()
            ->keyBy('id');

        $lines->each(fn ($line) => $line->setAttribute(
            'variant_label',
            $variants->get($line->item_variant_id)?->label
        ));
    }

    /** Remove every price / amount field from the board data. */
    private function hideAmounts($pipelines): void
    {
        $transactionFields = ['subtotal', 'markup_percent', 'markup_amount', 'vat_percent', 'vat_amount', 'total'];

        foreach ($pipelines as $pipeline) {
            foreach ($pipeline->stages as $stage) {
                foreach ($stage->transactions as $transaction) {
                    $transaction->makeHidden($transactionFields);

                    foreach ($transaction->items as $item) {
                        $item->makeHidden(['unit_price', 'subtotal', 'line_total']);
                    }

                    foreach ($transaction->clientPurchaseOrders as $cpo) {
                        $cpo->makeHidden([
                            'amount', 'subtotal', 'markup_percent', 'markup_amount',
                            'vat_percent', 'vat_amount', 'total',
                        ]);

                        foreach ($cpo->items as $item) {
                            $item->makeHidden(['unit_price']);
                        }
                    }
                }
            }
        }
    }

    // Who may create / edit the pipeline is decided by PipelinePolicy through the route middleware.

    protected function rules(?Pipeline $pipeline = null): array
    {
        return [
            'pipeline_code'              => [
                'required', 'string', 'max:255',
                Rule::unique('pipelines', 'pipeline_code')->ignore($pipeline?->id),
            ],
            'pipeline_name'              => 'required|string|max:255',
            'pipeline_description'       => 'nullable|string',
            'stages'                     => 'required|array|min:1',
            'stages.*.id'                => 'nullable|integer',
            'stages.*.stage_code'        => 'required|string|max:255|distinct',
            'stages.*.stage_name'        => 'required|string|max:255',
            'stages.*.stage_description' => 'nullable|string|max:255',
            // Days a card may stay in this stage before it is overdue (empty = no limit).
            'stages.*.max_days'          => 'nullable|integer|min:1|max:365',
            'stages.*.deducts_stock'     => 'nullable|boolean',
            'stages.*.creates_quotation' => 'nullable|boolean',
            'stages.*.creates_client_po' => 'nullable|boolean',
        ];
    }

    /** The modal enforces this too, but never trust the browser. */
    protected function stageProblem(array $stages): ?string
    {
        $flagged = fn (string $flag) => collect($stages)->filter(fn ($s) => ! empty($s[$flag]))->count();

        if ($flagged('deducts_stock') > 1) {
            return 'Only one stage can deduct stock.';
        }

        if ($flagged('creates_quotation') > 1) {
            return 'Only one stage can be where quotations are created.';
        }

        if ($flagged('creates_client_po') > 1) {
            return 'Only one stage can be where client purchase orders are created.';
        }

        $clash = collect($stages)->first(
            fn ($s) => ! empty($s['deducts_stock'])
                && (! empty($s['creates_quotation']) || ! empty($s['creates_client_po']))
        );

        if ($clash) {
            return 'The delivery stage cannot also be where quotations or client purchase orders are created.';
        }

        return null;
    }

    public function store(Request $request)
    {
        if (Pipeline::exists()) {
            return back()->withErrors(['pipeline_name' => 'There is only one pipeline. Edit it instead.']);
        }

        $validated = $request->validate($this->rules());

        if ($problem = $this->stageProblem($validated['stages'])) {
            return back()->withErrors(['stages' => $problem]);
        }

        DB::transaction(function () use ($validated) {
            $pipeline = Pipeline::create([
                'pipeline_code'        => $validated['pipeline_code'],
                'pipeline_name'        => $validated['pipeline_name'],
                'pipeline_description' => $validated['pipeline_description'] ?? null,
            ]);

            $this->syncStages($pipeline, $validated['stages']);
        });

        return redirect()->back();
    }

    public function update(Request $request, Pipeline $pipeline)
    {
        $validated = $request->validate($this->rules($pipeline));

        if ($problem = $this->stageProblem($validated['stages'])) {
            return back()->withErrors(['stages' => $problem]);
        }

        // Refuse to delete a stage that still holds transactions.
        $keptIds = collect($validated['stages'])->pluck('id')->filter()->all();
        $blocked = $pipeline->stages()
            ->whereNotIn('id', $keptIds)
            ->whereHas('transactions')
            ->pluck('stage_name');

        if ($blocked->isNotEmpty()) {
            return back()->withErrors([
                'stages' => 'Move the cards out of these stages before removing them: ' . $blocked->implode(', '),
            ]);
        }

        DB::transaction(function () use ($validated, $pipeline) {
            $pipeline->update([
                'pipeline_code'        => $validated['pipeline_code'],
                'pipeline_name'        => $validated['pipeline_name'],
                'pipeline_description' => $validated['pipeline_description'] ?? null,
            ]);

            $this->syncStages($pipeline, $validated['stages']);
        });

        return redirect()->back();
    }

    private function syncStages(Pipeline $pipeline, array $stages): void
    {
        $last    = count($stages) - 1;
        $keptIds = [];

        foreach ($stages as $index => $stage) {
            $attributes = [
                'stage_code'        => $stage['stage_code'],
                'stage_name'        => $stage['stage_name'],
                'stage_description' => $stage['stage_description'] ?? null,
                'max_days'          => ! empty($stage['max_days']) ? (int) $stage['max_days'] : null,
                'deducts_stock'     => (bool) ($stage['deducts_stock'] ?? false),
                'creates_quotation' => (bool) ($stage['creates_quotation'] ?? false),
                'creates_client_po' => (bool) ($stage['creates_client_po'] ?? false),
                'sort_order'        => $index,
                'is_initial'        => $index === 0,
                'is_final'          => $index === $last,
            ];

            $existing = ! empty($stage['id'])
                ? $pipeline->stages()->find($stage['id'])
                : null;

            if ($existing) {
                $existing->update($attributes);
                $keptIds[] = $existing->id;
            } else {
                $keptIds[] = $pipeline->stages()->create($attributes)->id;
            }
        }

        // ->get()->each->delete() so the model "deleted" event fires
        // and each removed stage's permission is cleaned up too.
        $pipeline->stages()->whereNotIn('id', $keptIds)->get()->each->delete();
    }
}