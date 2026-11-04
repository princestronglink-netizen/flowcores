<?php

namespace App\Policies;

use App\Models\StockMovement;
use App\Models\User;

/**
 * Stock pages (Stock in, Adjust stock, Stock ledger).
 * The model argument is optional so the same ability works for a class-level check
 * ($user->can('adjust', StockMovement::class)), as used by HandleInertiaRequests.
 *
 * Permissions: stock.ledger / stock.in / stock.adjust
 */
class StockMovementPolicy
{
    /** See the Stock ledger. */
    public function viewAny(User $user): bool
    {
        return $user->can('stock.ledger');
    }

    /** Open Stock in and save a receipt. */
    public function stockIn(User $user, ?StockMovement $movement = null): bool
    {
        return $user->can('stock.in');
    }

    /** Open Adjust stock and save an adjustment. */
    public function adjust(User $user, ?StockMovement $movement = null): bool
    {
        return $user->can('stock.adjust');
    }
}