<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesPerPage;
use App\Models\ClientPurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

/**
 * PERMISSIONS (ClientPurchaseOrderPolicy):
 *   index            -> viewAny  (client_po.view)
 *   cancel           -> update   (client_po.edit)
 *   confirm          -> confirm  (client_po.confirm)
 *   destroy          -> delete   (client_po.delete)
 * A client PO has no edit screen: while it is a draft it follows the quotation/transaction,
 * and once confirmed it is frozen. Prices are only sent to users with amounts.view.
 */
class ClientPurchaseOrderController extends Controller
{
    use ResolvesPerPage;

    public function index(Request $request)
    {
        Gate::authorize('viewAny', ClientPurchaseOrder::class);

        $status  = $request->string('status')->toString();
        $search  = trim($request->string('search')->toString());
        $perPage = $this->perPage($request);

        // Tab counts come from the DB, not from the current page.
        $counts = ClientPurchaseOrder::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $orders = ClientPurchaseOrder::with([
                'client', 'contactPerson', 'items', 'transaction:id,name,status',
            ])
            ->when(
                array_key_exists($status, ClientPurchaseOrder::STATUSES),
                fn ($q) => $q->where('status', $status),
            )
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . addcslashes($search, '%_\\') . '%';

                $q->where(function ($q) use ($like) {
                    $q->where('cpo_number', 'like', $like)
                        ->orWhere('client_po_number', 'like', $like)
                        ->orWhereHas('client', fn ($c) => $c->where('client_name', 'like', $like))
                        ->orWhereHas('contactPerson', fn ($c) => $c->where('contact_person', 'like', $like))
                        ->orWhereHas('transaction', fn ($t) => $t->where('name', 'like', $like));
                });
            })
            ->latest()
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        // No amounts.view = the prices never leave the server.
        if (! $request->user()->can('amounts.view')) {
            $orders->getCollection()->each(function ($order) {
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
            'counts'               => ['all' => $counts->sum()] + $counts->all(),
            'filters'              => [
                'status'   => $status ?: 'all',
                'search'   => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    /** Confirm: the client's PO number and PO date are required and entered here. */
    public function confirm(Request $request, ClientPurchaseOrder $clientPurchaseOrder)
    {
        Gate::authorize('confirm', $clientPurchaseOrder);

        $v = $request->validate([
            'client_po_number' => 'required|string|max:120',
            'client_po_date'   => 'required|date',
        ]);

        try {
            $clientPurchaseOrder->confirm(auth()->id(), $v['client_po_number'], $v['client_po_date']);
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