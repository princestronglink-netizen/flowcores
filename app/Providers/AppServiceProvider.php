<?php

namespace App\Providers;

use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\ClientPurchaseOrder;
use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\User;
use App\Policies\ClientPolicy;
use App\Policies\ClientPurchaseOrderPolicy;
use App\Policies\ItemCategoryPolicy;
use App\Policies\ItemPolicy;
use App\Policies\PipelinePolicy;
use App\Policies\PipelineStagePolicy;
use App\Policies\StockMovementPolicy;
use App\Policies\TransactionPolicy;
use App\Policies\UserPolicy;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        /* ----------------------------- Policies ----------------------------- */
        Gate::policy(Client::class, ClientPolicy::class);
        Gate::policy(ClientPurchaseOrder::class, ClientPurchaseOrderPolicy::class);
        Gate::policy(Item::class, ItemPolicy::class);
        Gate::policy(ItemCategory::class, ItemCategoryPolicy::class);
        Gate::policy(Pipeline::class, PipelinePolicy::class);
        Gate::policy(PipelineStage::class, PipelineStagePolicy::class);
        Gate::policy(StockMovement::class, StockMovementPolicy::class);
        Gate::policy(Transaction::class, TransactionPolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        /* --------------------------- Activity log --------------------------- */
        Event::listen(Login::class, fn ($e) => ActivityLog::record(
            'auth.login', "{$e->user->name} logged in", $e->user, [], $e->user->name, $e->user
        ));

        Event::listen(Logout::class, function ($e) {
            if ($e->user) {
                ActivityLog::record(
                    'auth.logout', "{$e->user->name} logged out", $e->user, [], $e->user->name, $e->user
                );
            }
        });

        Event::listen(Failed::class, fn ($e) => ActivityLog::record(
            'auth.failed', 'Failed login attempt', null, ['email' => $e->credentials['email'] ?? null]
        ));
    }
}