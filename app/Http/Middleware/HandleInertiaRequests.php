<?php

namespace App\Http\Middleware;

use App\Models\Pipeline;
use App\Models\PipelineStage;
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