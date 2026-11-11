<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientPurchaseOrderController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\ItemCategoryController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\PipelineController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\StockAdjustController;
use App\Http\Controllers\StockInController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\TransactionQuotationController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/dashboard');

Route::middleware(['auth'])->group(function () {

    Route::get('/dashboard', fn () => Inertia::render('Dashboard/Index'))->name('dashboard.index');
    Route::get('/profile', fn () => Inertia::render('Profile/Edit'))->name('profile.edit');

    // ---- Transactions ----
    Route::resource('transactions', TransactionController::class)->except(['show']);

    // Done deal: quotation vs client PO vs delivered vs DR files (only for won transactions).
    Route::get('transactions/{transaction}/cross-check', [TransactionController::class, 'crossCheck'])
        ->name('transactions.crossCheck');

    // Per-stage permission is checked inside updateStage() through TransactionPolicy::moveToStage.
    Route::patch('transactions/{transaction}/stage', [TransactionController::class, 'updateStage'])
        ->name('transactions.updateStage');
    Route::patch('transactions/{transaction}/status', [TransactionController::class, 'updateStatus'])
        ->name('transactions.updateStatus');

    // ---- Quotations: a document of the transaction (issued by the pipeline, edited in the transaction) ----
    // Permissions are checked inside TransactionQuotationController with Gate::authorize(...):
    //   index         -> viewQuotations (quotation.view)
    //   print         -> printQuotation (quotation.view + amounts.view)
    //   printVersion  -> printQuotation
    //   restore       -> editQuotation  (quotation.edit)
    Route::get('quotations', [TransactionQuotationController::class, 'index'])->name('quotations.index');
    Route::get('transactions/{transaction}/quotation/print', [TransactionQuotationController::class, 'print'])
        ->name('transactions.quotation.print');
    // Print an older version (rebuilt from its stored snapshot).
    Route::get('transactions/{transaction}/versions/{version}/print', [TransactionQuotationController::class, 'printVersion'])
        ->name('transactions.versions.print');
    // Go back to an older version (copies it into a new version, history is kept).
    Route::post('transactions/{transaction}/versions/{version}/restore', [TransactionQuotationController::class, 'restore'])
        ->name('transactions.versions.restore');

    // ---- Client purchase orders (created by the pipeline, so no create/store) ----
    Route::resource('client-purchase-orders', ClientPurchaseOrderController::class)->only(['index', 'edit', 'update', 'destroy']);
    Route::post('client-purchase-orders/{client_purchase_order}/confirm', [ClientPurchaseOrderController::class, 'confirm'])
        ->name('client-purchase-orders.confirm');
    Route::patch('client-purchase-orders/{client_purchase_order}/cancel', [ClientPurchaseOrderController::class, 'cancel'])
        ->name('client-purchase-orders.cancel');

    // ---- Deliveries (add Gate::denies('recordDelivery', $transaction) inside store() and returnItems()) ----
    Route::post('transactions/{transaction}/deliveries', [DeliveryController::class, 'store'])
        ->name('transactions.deliveries.store');
    Route::post('transactions/{transaction}/deliveries/return', [DeliveryController::class, 'returnItems'])
        ->name('transactions.deliveries.return');
    // DR softcopy (private file, only served to logged-in users)
    Route::get('deliveries/{delivery}/dr-file', [DeliveryController::class, 'drFile'])
        ->name('deliveries.dr-file');

    // ---- Quick-create endpoints used inside forms ----
    Route::post('clients/quick-create', [ClientController::class, 'quickStore'])->name('clients.quickStore');
    Route::post('clients/{client}/contacts/quick-create', [ClientController::class, 'quickStoreContact'])
        ->name('clients.quickStoreContact');
    Route::post('categories/quick-create', [ItemCategoryController::class, 'quickStore'])
        ->name('categories.quickStore');

    // ---- Pipeline: every route goes through PipelinePolicy (admin always passes via Gate::before) ----
    Route::get('pipelines', [PipelineController::class, 'index'])
        ->middleware('can:viewAny,App\Models\Pipeline')
        ->name('pipelines.index');

    Route::post('pipelines', [PipelineController::class, 'store'])
        ->middleware('can:create,App\Models\Pipeline')
        ->name('pipelines.store');

    Route::put('pipelines/{pipeline}', [PipelineController::class, 'update'])
        ->middleware('can:update,pipeline')
        ->name('pipelines.update');

    // ---- Roles & permissions: admin, or any role with "Manage roles" ----
    Route::middleware('can:roles.manage')->group(function () {
        Route::get('roles', [RolePermissionController::class, 'index'])->name('roles.index');
        Route::post('roles', [RolePermissionController::class, 'store'])->name('roles.store');
        Route::put('roles/{role}', [RolePermissionController::class, 'update'])->name('roles.update');
        Route::delete('roles/{role}', [RolePermissionController::class, 'destroy'])->name('roles.destroy');
    });

    // ---- Users: admin, or any role with "Manage users" ----
    Route::middleware('can:users.manage')->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
        Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
        Route::post('users/{user}/send-credentials', [UserController::class, 'sendCredentials'])->name('users.send-credentials');
    });

    // ---- Clients ----
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