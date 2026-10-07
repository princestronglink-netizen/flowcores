<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\PipelineController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => app()->version(),
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth'])->group(function () {

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard/Index');
    })->name('dashboard.index');

    Route::get('/transactions/create', [TransactionController::class, 'create'])->name('transactions.create');
    Route::get('/transactions/{transaction}/edit', [TransactionController::class, 'edit'])->name('transactions.edit');
    Route::get('/transactions', [TransactionController::class, 'index'])->name('transactions.index');
    Route::post('/transactions', [TransactionController::class, 'store'])->name('transactions.store');
    Route::put('/transactions/{transaction}', [TransactionController::class, 'update'])->name('transactions.update');
    Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy'])->name('transactions.destroy');

    Route::patch('/transactions/{transaction}/stage', [TransactionController::class, 'updateStage'])
        ->name('transactions.updateStage');
    Route::patch('/transactions/{transaction}/status', [TransactionController::class, 'updateStatus'])
        ->name('transactions.updateStatus');

    Route::get('/profile', function () {
        return Inertia::render('Profile/Edit');
    })->name('profile.edit');

    Route::resource('clients', ClientController::class);

    // Quick-create endpoints used inside the Transaction modal
    Route::post('/pipelines/quick-create', [PipelineController::class, 'quickStore'])->name('pipelines.quickStore');
    Route::post('/clients/quick-create', [ClientController::class, 'quickStore'])->name('clients.quickStore');
    Route::post('/clients/{client}/contacts/quick-create', [ClientController::class, 'quickStoreContact'])->name('clients.quickStoreContact');

    Route::resource('pipelines', PipelineController::class);
});