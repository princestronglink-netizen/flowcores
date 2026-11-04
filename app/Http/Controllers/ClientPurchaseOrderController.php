<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesLineItems;
use App\Models\ClientPurchaseOrder;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

/**
 * PERMISSIONS (ClientPurchaseOrderPolicy):
 *   index                    -> viewAny  (client_po.view)
 *   edit / update / cancel   -> update   (client_po.edit)
 *   confirm                  -> confirm  (client_po.confirm)
 *                               (update() with "confirm" ticked needs it too)
 *   destroy                  -> delete   (client_po.delete)
 * Prices are only sent to users with amounts.view.
 */
class ClientPurchaseOrderController extends Controller
{
    use HandlesLineItems;

    public function index(Request $request)
    {
        Gate::authorize('viewAny', ClientPurchaseOrder::class);

        $orders = ClientPurchaseOrder::with([
            'client', 'contactPerson', 'items', 'transaction:id,name,status',
        ])->latest()->get();

        // No amounts.view = the prices never leave the server.
        if (! $request->user()->can('amounts.view')) {
            $orders->each(function ($order) {
                $order->makeHidden([
                    'amount', 'subtotal', 'markup_percent', 'markup_amount',
                    'vat_percent', 'vat_amount', 'total',
                ]);
                $order->items->each->makeHidden(['unit_price', 'subtotal', 'line_total']);
            });
        }

        return Inertia::render('ClientPurchaseOrder/Index', [
            'clientPurchaseOrders' => $orders,
            'statuses'             => ClientPurchaseOrder::STATUSES,
        ]);
    }

    public function edit(Request $request, ClientPurchaseOrder $clientPurchaseOrder)
    {
        Gate::authorize('update', $clientPurchaseOrder);

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

            // Same fields the quotation prints.
            'markup_percent'          => 'required|numeric|min:0|max:1000',
            'vat_percent'             => 'required|numeric|min:0|max:100',
            'remarks'                 => 'nullable|string',
            'prepared_by'             => 'nullable|string|max:255',
            'prepared_by_position'    => 'nullable|string|max:255',

            'items'                   => 'required|array|min:1',
            'items.*.item_variant_id' => 'required|exists:item_variants,id',
            'items.*.quantity'        => 'required|integer|min:1|max:1000000',
            'items.*.unit_price'      => 'required|numeric|min:0',
        ];
    }

    public function update(Request $request, ClientPurchaseOrder $clientPurchaseOrder)
    {
        Gate::authorize('update', $clientPurchaseOrder);

        if ($reason = $clientPurchaseOrder->lockReason()) {
            return back()->withErrors(['client_po' => $reason]);
        }

        $v    = $request->validate($this->rules());
        $rows = $this->buildItemRows($v['items'], 'unit_price');
        $wantsConfirm = $request->boolean('confirm') && $clientPurchaseOrder->status === 'draft';

        // "Save and confirm" is a confirmation, so it needs the confirm permission as well.
        if ($wantsConfirm) {
            Gate::authorize('confirm', $clientPurchaseOrder);
        }

        try {
            DB::transaction(function () use ($v, $rows, $clientPurchaseOrder, $wantsConfirm) {
                $subtotal = (float) collect($rows)->sum(fn ($r) => $r['quantity'] * $r['unit_price']);

                $clientPurchaseOrder->update([
                    'client_po_number'     => $v['client_po_number'] ?? null,
                    'client_po_date'       => $v['client_po_date'] ?? null,
                    'note'                 => $v['note'] ?? null,
                    'markup_percent'       => $v['markup_percent'],
                    'vat_percent'          => $v['vat_percent'],
                    'remarks'              => $v['remarks'] ?? null,
                    'prepared_by'          => $v['prepared_by'] ?? null,
                    'prepared_by_position' => $v['prepared_by_position'] ?? null,
                    // Grand total: subtotal + markup + VAT.
                    'amount'               => Transaction::breakdown(
                        $subtotal,
                        (float) $v['markup_percent'],
                        (float) $v['vat_percent'],
                    )['total'],
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
            ? "{$clientPurchaseOrder->cpo_number} confirmed. The transaction's items, markup, VAT and amount now match it."
            : ($clientPurchaseOrder->status === 'confirmed'
                ? "{$clientPurchaseOrder->cpo_number} saved. The transaction's items, markup, VAT and amount were updated."
                : "{$clientPurchaseOrder->cpo_number} saved as a draft.");

        // Came from the pipeline card? Go back to the board.
        $target = ($v['from'] ?? null) === 'pipeline' ? 'pipelines.index' : 'client-purchase-orders.index';

        return redirect()->route($target)->with('stock', $message);
    }

    public function confirm(ClientPurchaseOrder $clientPurchaseOrder)
    {
        Gate::authorize('confirm', $clientPurchaseOrder);

        try {
            $clientPurchaseOrder->confirm(auth()->id());
        } catch (\RuntimeException $e) {
            return back()->withErrors(['status' => $e->getMessage()]);
        }

        return back()->with('stock', "{$clientPurchaseOrder->cpo_number} confirmed. The transaction's items, markup, VAT and amount now match it.");
    }

    public function cancel(ClientPurchaseOrder $clientPurchaseOrder)
    {
        Gate::authorize('update', $clientPurchaseOrder);

        if ($clientPurchaseOrder->status !== 'draft') {
            return back()->withErrors(['status' => 'Only a draft client purchase order can be cancelled.']);
        }

        $clientPurchaseOrder->update(['status' => 'cancelled']);

        return back();
    }

    public function destroy(ClientPurchaseOrder $clientPurchaseOrder)
    {
        Gate::authorize('delete', $clientPurchaseOrder);

        if (! in_array($clientPurchaseOrder->status, ['draft', 'cancelled'], true)) {
            return back()->with('stock_warning', 'Only draft or cancelled client purchase orders can be deleted.');
        }

        $clientPurchaseOrder->delete();

        return redirect()->route('client-purchase-orders.index');
    }
}