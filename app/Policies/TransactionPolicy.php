<?php

namespace App\Policies;

use App\Models\PipelineStage;
use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
    /* ----------------------------- Transactions ----------------------------- */
    // $transaction is optional so the same ability works for a record check
    // ($user->can('update', $transaction)) and a class-level check (HandleInertiaRequests).

    /** See the Transactions list. */
    public function viewAny(User $user): bool
    {
        return $user->can('transaction.view');
    }

    /** Open the create form and save a new transaction. */
    public function create(User $user): bool
    {
        return $user->can('transaction.create');
    }

    /** Open the edit form and save changes. */
    public function update(User $user, ?Transaction $transaction = null): bool
    {
        return $user->can('transaction.edit');
    }

    /** Delete a transaction. */
    public function delete(User $user, ?Transaction $transaction = null): bool
    {
        return $user->can('transaction.delete');
    }

    /* ------------------------------ Pipeline ------------------------------ */

    /** Can this user move the card INTO $stage? */
    public function moveToStage(User $user, Transaction $transaction, PipelineStage $stage): bool
    {
        return $user->can($stage->permissionName());
    }

    /** Record a delivery: needs the permission, and the card must be in the delivery stage. */
    public function recordDelivery(User $user, Transaction $transaction): bool
    {
        return $user->can('delivery.record')
            && $transaction->stage?->deducts_stock === true;
    }

    /** Return items: needs the permission, and the card must be at or past the delivery stage. */
    public function recordReturn(User $user, Transaction $transaction): bool
    {
        $delivery = $transaction->deliveryStage();

        return $user->can('delivery.return')
            && $delivery !== null
            && $transaction->stage !== null
            && $transaction->stage->sort_order >= $delivery->sort_order;
    }

    /* ------------------------------ Quotations ------------------------------ */
    // The $transaction argument is optional so the same ability works both for a route
    // with a transaction ("can:printQuotation,transaction") and for a class-level check
    // ($user->can('printQuotation', Transaction::class)) used by HandleInertiaRequests.

    /** See the Quotations list. */
    public function viewQuotations(User $user): bool
    {
        return $user->can('quotation.view');
    }

    /**
     * Open the printable quotation (current or an older version).
     * The printout is made of prices, so it also needs amounts.view.
     */
    public function printQuotation(User $user, ?Transaction $transaction = null): bool
    {
        return $user->can('quotation.view')
            && $user->can('amounts.view');
    }

    /** Edit quotation content / restore an older version. */
    public function editQuotation(User $user, ?Transaction $transaction = null): bool
    {
        return $user->can('quotation.edit');
    }

    /** Delete a quotation. */
    public function deleteQuotation(User $user, ?Transaction $transaction = null): bool
    {
        return $user->can('quotation.delete');
    }
}