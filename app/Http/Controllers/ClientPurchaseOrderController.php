<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesLineItems;
use App\Models\ClientPurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ClientPurchaseOrderController extends Controller
{
    use HandlesLineItems;

    public function index()
    {
        return Inertia::render('ClientPurchaseOrder/Index', [
            'clientPurchaseOrders' => ClientPurchaseOrder::with([
                'client', 'contactPerson', 'items', 'transaction:id,name,status',
            ])->latest()->get(),
            'statuses' => ClientPurchaseOrder::STATUSES,
        ]);
    }

    public function edit(Request $request, ClientPurchaseOrder $clientPurchaseOrder)
    {
        $from = $request->query('from') === 'pipeline' ? 'pipeline' : null;

        if ($reason = $clientPurchaseOrder->lockReason()) {
            return redirect()
                ->route($from === 'pipeline' ? 'pipelines.index' : 'client-purchase-orders.index')
                ->with('stock_warning', $reason);
        }

        return Inertia::render('ClientPurchaseOrder/Edit', [
            'clientPurchaseOrder' => $clientPurchaseOrder->load([
                'client', 'contactPerson', 'quotation:id,quotation_number',
                'transaction:id,name,amount', 'items.variant.brand',
            ]),
            'catalog' => $this->catalog(),
            'from'    => $from,
        ]);
    }

    protected function rules(): array
    {
        return [
            'from'                    => 'nullable|string|in:pipeline',
            'client_po_number'        => 'nullable|string|max:120',
            'client_po_date'          => 'nullable|date',
            'note'                    => 'nullable|string|max:500',
            'confirm'                 => 'nullable|boolean',
            'items'                   => 'required|array|min:1',
            'items.*.item_variant_id' => 'required|exists:item_variants,id',
            'items.*.quantity'        => 'required|integer|min:1|max:1000000',
            'items.*.unit_price'      => 'required|numeric|min:0',
        ];
    }

    public function update(Request $request, ClientPurchaseOrder $clientPurchaseOrder)
    {
        if ($reason = $clientPurchaseOrder->lockReason()) {
            return back()->withErrors(['client_po' => $reason]);
        }

        $v    = $request->validate($this->rules());
        $rows = $this->buildItemRows($v['items'], 'unit_price');
        $wantsConfirm = $request->boolean('confirm') && $clientPurchaseOrder->status === 'draft';

        try {
            DB::transaction(function () use ($v, $rows, $clientPurchaseOrder, $wantsConfirm) {
                $clientPurchaseOrder->update([
                    'client_po_number' => $v['client_po_number'] ?? null,
                    'client_po_date'   => $v['client_po_date'] ?? null,
                    'note'             => $v['note'] ?? null,
                    'amount'           => collect($rows)->sum(fn ($r) => $r['quantity'] * $r['unit_price']),
                ]);

                $clientPurchaseOrder->items()->delete();
                $clientPurchaseOrder->items()->createMany($rows);

                if ($clientPurchaseOrder->status === 'confirmed') {
                    // Already confirmed: keep the transaction in step with the edit.
                    $clientPurchaseOrder->syncToTransaction();
                } elseif ($wantsConfirm) {
                    $clientPurchaseOrder->confirm(auth()->id());
                }
            });
        } catch (\RuntimeException $e) {
            // Everything above is rolled back, so nothing is half-saved.
            return back()->withErrors(['client_po' => $e->getMessage()]);
        }

        $message = $wantsConfirm
            ? "{$clientPurchaseOrder->cpo_number} confirmed. The transaction's items and amount now match it."
            : ($clientPurchaseOrder->status === 'confirmed'
                ? "{$clientPurchaseOrder->cpo_number} saved. The transaction's items and amount were updated."
                : "{$clientPurchaseOrder->cpo_number} saved as a draft.");

        // Came from the pipeline card? Go back to the board.
        $target = ($v['from'] ?? null) === 'pipeline' ? 'pipelines.index' : 'client-purchase-orders.index';

        return redirect()->route($target)->with('stock', $message);
    }

    public function confirm(ClientPurchaseOrder $clientPurchaseOrder)
    {
        try {
            $clientPurchaseOrder->confirm(auth()->id());
        } catch (\RuntimeException $e) {
            return back()->withErrors(['status' => $e->getMessage()]);
        }

        return back()->with('stock', "{$clientPurchaseOrder->cpo_number} confirmed. The transaction's items and amount now match it.");
    }

    public function cancel(ClientPurchaseOrder $clientPurchaseOrder)
    {
        if ($clientPurchaseOrder->status !== 'draft') {
            return back()->withErrors(['status' => 'Only a draft client purchase order can be cancelled.']);
        }

        $clientPurchaseOrder->update(['status' => 'cancelled']);

        return back();
    }

    public function destroy(ClientPurchaseOrder $clientPurchaseOrder)
    {
        if (! in_array($clientPurchaseOrder->status, ['draft', 'cancelled'], true)) {
            return back()->with('stock_warning', 'Only draft or cancelled client purchase orders can be deleted.');
        }

        $clientPurchaseOrder->delete();

        return redirect()->route('client-purchase-orders.index');
    }
}