<?php

namespace App\Policies;

use App\Models\PipelineStage;
use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
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
}