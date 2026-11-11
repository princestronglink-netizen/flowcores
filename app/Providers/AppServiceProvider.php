<?php

namespace App\Providers;

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
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Gate::policy(Client::class, ClientPolicy::class);
        Gate::policy(ClientPurchaseOrder::class, ClientPurchaseOrderPolicy::class);
        Gate::policy(Item::class, ItemPolicy::class);
        Gate::policy(ItemCategory::class, ItemCategoryPolicy::class);
        Gate::policy(Pipeline::class, PipelinePolicy::class);
        Gate::policy(PipelineStage::class, PipelineStagePolicy::class);
        Gate::policy(StockMovement::class, StockMovementPolicy::class);
        Gate::policy(Transaction::class, TransactionPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
    }
}