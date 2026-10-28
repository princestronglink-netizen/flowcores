<?php

namespace App\Http\Controllers;

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
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function index()
    {
        return Inertia::render('Transaction/Index', [
            'transactions' => Transaction::with([
                'client',
                'contactPerson',
                'pipeline',
                'stage', // the pipeline stage each transaction is currently in
                'items',
            ])->latest()->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('Transaction/Create', [
            'clients' => Client::with('contactPeople')->orderBy('client_name')->get(),
            'catalog' => $this->catalog(),
        ]);
    }

    public function edit(Transaction $transaction)
    {
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

    /** Items -> brands -> variants (with category), used by the line-item dropdowns. */
    protected function catalog()
    {
        return Item::with('category', 'brands.variants')->orderBy('item_name')->get();
    }

    protected function itemRules(): array
    {
        return [
            'items'                   => 'required|array|min:1',
            'items.*.item_variant_id' => 'required|exists:item_variants,id',
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

        // Stages can't be skipped: only the next or previous stage is allowed.
        if ($from && abs($stage->sort_order - $from->sort_order) !== 1) {
            return back()->withErrors([
                'pipeline_stage_id' => 'Stages cannot be skipped. Move the transaction one stage at a time.',
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

            // Going back before the delivery stage while goods are out would leave stock inconsistent.
            if ($stage->sort_order < $deliveryStage->sort_order && $transaction->hasDeliveredItems()) {
                return back()->withErrors([
                    'pipeline_stage_id' => 'Return the delivered items first, then move this transaction back.',
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