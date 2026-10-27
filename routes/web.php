<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientPurchaseOrderController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\ItemCategoryController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\PipelineController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\StockAdjustController;
use App\Http\Controllers\StockInController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/dashboard');

Route::middleware(['auth'])->group(function () {

    Route::get('/dashboard', fn () => Inertia::render('Dashboard/Index'))->name('dashboard.index');
    Route::get('/profile', fn () => Inertia::render('Profile/Edit'))->name('profile.edit');

    // ---- Transactions ----
    Route::resource('transactions', TransactionController::class)->except(['show']);

    Route::patch('transactions/{transaction}/stage', [TransactionController::class, 'updateStage'])
        ->name('transactions.updateStage');
    Route::patch('transactions/{transaction}/status', [TransactionController::class, 'updateStatus'])
        ->name('transactions.updateStatus');

    // ---- Quotations (created by the pipeline, so no create/store) ----
    Route::resource('quotations', QuotationController::class)->except(['show', 'create', 'store']);
    Route::get('quotations/{quotation}/print', [QuotationController::class, 'print'])->name('quotations.print');
    // Print an older version of a quotation (rebuilt from its stored snapshot).
    Route::get('quotations/{quotation}/versions/{version}/print', [QuotationController::class, 'printVersion'])
        ->name('quotations.versions.print');

    // ---- Client purchase orders (created by the pipeline, so no create/store) ----
    Route::resource('client-purchase-orders', ClientPurchaseOrderController::class)->only(['index', 'edit', 'update', 'destroy']);
    Route::post('client-purchase-orders/{client_purchase_order}/confirm', [ClientPurchaseOrderController::class, 'confirm'])
        ->name('client-purchase-orders.confirm');
    Route::patch('client-purchase-orders/{client_purchase_order}/cancel', [ClientPurchaseOrderController::class, 'cancel'])
        ->name('client-purchase-orders.cancel');

    // ---- Deliveries ----
    Route::post('transactions/{transaction}/deliveries', [DeliveryController::class, 'store'])
        ->name('transactions.deliveries.store');
    Route::post('transactions/{transaction}/deliveries/return', [DeliveryController::class, 'returnItems'])
        ->name('transactions.deliveries.return');

    // ---- Quick-create endpoints used inside forms ----
    Route::post('clients/quick-create', [ClientController::class, 'quickStore'])->name('clients.quickStore');
    Route::post('clients/{client}/contacts/quick-create', [ClientController::class, 'quickStoreContact'])
        ->name('clients.quickStoreContact');
    Route::post('categories/quick-create', [ItemCategoryController::class, 'quickStore'])
        ->name('categories.quickStore');

    // ---- Pipelines / Clients ----
    Route::resource('pipelines', PipelineController::class)->only(['index', 'store', 'update']);
    Route::resource('clients', ClientController::class);

    // ---- Items, categories, stock ----
    Route::resource('items', ItemController::class)->except(['show']);

    Route::resource('categories', ItemCategoryController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->parameters(['categories' => 'category']);

    // ---- Stock in (receiving) ----
    Route::get('stock-in', [StockInController::class, 'index'])->name('stock-in.index');
    Route::post('stock-in', [StockInController::class, 'store'])->name('stock-in.store');

    // ---- Stock adjust (bulk +/- corrections: miscount, damage found in a count, etc.) ----
    Route::get('stock-adjust', [StockAdjustController::class, 'index'])->name('stock-adjust.index');
    Route::post('stock-adjust', [StockAdjustController::class, 'store'])->name('stock-adjust.store');

    // ---- Ledger ----
    Route::get('stock-movements', [StockMovementController::class, 'index'])->name('stock-movements.index');
});