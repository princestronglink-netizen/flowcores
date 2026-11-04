<?php

namespace App\Http\Middleware;

use App\Models\Client;
use App\Models\ClientPurchaseOrder;
use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\StockMovement;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'can'  => fn () => $user ? [
                    'is_admin'        => $user->hasRole('super_admin'),

                    // Every permission this user really has (no Gate::before bypass any more,
                    // so super_admin only gets what its role holds).
                    // Use it in React for any permission without adding a new key here.
                    'permissions'     => $user->getAllPermissions()->pluck('name')->values(),

                    // Policy-based checks.
                    'view_pipeline'   => $user->can('viewAny', Pipeline::class),
                    'manage_pipeline' => $user->can('create', Pipeline::class),

                    // Used by the sidebar.
                    'manage_roles'    => $user->can('roles.manage'),
                    'manage_users'    => $user->can('users.manage'),

                    // Used by the pipeline view to show/hide prices and amounts.
                    'view_amounts'    => $user->can('amounts.view'),

                    // Used by the pipeline cards to show/hide the Deliver and Return buttons.
                    'record_delivery' => $user->can('delivery.record'),
                    'record_return'   => $user->can('delivery.return'),

                    // Used by the pipeline board to enable the Done Deal / Lost Deal drop zones.
                    'mark_done'       => $user->can('deal.won'),
                    'mark_lost'       => $user->can('deal.lost'),

                    // Quotations (TransactionPolicy): sidebar link + list, print, edit / restore.
                    'view_quotations'  => $user->can('viewQuotations', Transaction::class),
                    'print_quotation'  => $user->can('printQuotation', Transaction::class),
                    'edit_quotation'   => $user->can('editQuotation', Transaction::class),
                    'delete_quotation' => $user->can('deleteQuotation', Transaction::class),

                    // Client POs (ClientPurchaseOrderPolicy): sidebar link, edit / cancel, confirm, delete.
                    'view_client_pos'   => $user->can('viewAny', ClientPurchaseOrder::class),
                    'edit_client_po'    => $user->can('update', ClientPurchaseOrder::class),
                    'confirm_client_po' => $user->can('confirm', ClientPurchaseOrder::class),
                    'delete_client_po'  => $user->can('delete', ClientPurchaseOrder::class),

                    // Transactions (TransactionPolicy): sidebar link + list, create, edit, delete.
                    'view_transactions'  => $user->can('viewAny', Transaction::class),
                    'create_transaction' => $user->can('create', Transaction::class),
                    'edit_transaction'   => $user->can('update', Transaction::class),
                    'delete_transaction' => $user->can('delete', Transaction::class),

                    // Clients (ClientPolicy): sidebar link + list, create, edit, delete.
                    'view_clients'  => $user->can('viewAny', Client::class),
                    'create_client' => $user->can('create', Client::class),
                    'edit_client'   => $user->can('update', Client::class),
                    'delete_client' => $user->can('delete', Client::class),

                    // Items (ItemPolicy): sidebar link + list, create, edit, delete.
                    'view_items'  => $user->can('viewAny', Item::class),
                    'create_item' => $user->can('create', Item::class),
                    'edit_item'   => $user->can('update', Item::class),
                    'delete_item' => $user->can('delete', Item::class),

                    // Categories (ItemCategoryPolicy): sidebar link + list, create, edit, delete.
                    'view_categories'  => $user->can('viewAny', ItemCategory::class),
                    'create_category'  => $user->can('create', ItemCategory::class),
                    'edit_category'    => $user->can('update', ItemCategory::class),
                    'delete_category'  => $user->can('delete', ItemCategory::class),

                    // Stock (StockMovementPolicy): sidebar links, Items page buttons, pages.
                    'view_stock_ledger' => $user->can('viewAny', StockMovement::class),
                    'stock_in'          => $user->can('stockIn', StockMovement::class),
                    'adjust_stock'      => $user->can('adjust', StockMovement::class),

                    // IDs of the stages this user may move cards into.
                    'move_stage_ids'  => PipelineStage::all()
                        ->filter(fn ($s) => $user->can($s->permissionName()))
                        ->pluck('id')
                        ->values(),
                ] : null,
            ],

            'flash' => [
                'stock'          => fn () => $request->session()->get('stock'),
                'stock_warning'  => fn () => $request->session()->get('stock_warning'),
                'stock_returned' => fn () => $request->session()->get('stock_returned'),
            ],
        ];
    }
}