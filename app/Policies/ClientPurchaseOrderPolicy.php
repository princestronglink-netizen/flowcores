<?php

namespace App\Policies;

use App\Models\ClientPurchaseOrder;
use App\Models\User;

/**
 * Client purchase orders.
 * The model argument is optional so the same ability works for a route/controller check on a
 * record ($user->can('update', $cpo)) and for a class-level check used by HandleInertiaRequests
 * ($user->can('update', ClientPurchaseOrder::class)).
 *
 * Permissions: client_po.view / client_po.edit / client_po.confirm / client_po.delete
 */
class ClientPurchaseOrderPolicy
{
    /** See the Client POs list. */
    public function viewAny(User $user): bool
    {
        return $user->can('client_po.view');
    }

    /** Open the edit form, save changes, and cancel a draft. */
    public function update(User $user, ?ClientPurchaseOrder $clientPurchaseOrder = null): bool
    {
        return $user->can('client_po.edit');
    }

    /** Confirm a draft (it sets the transaction's final items and amount). */
    public function confirm(User $user, ?ClientPurchaseOrder $clientPurchaseOrder = null): bool
    {
        return $user->can('client_po.confirm');
    }

    /** Delete a draft or cancelled client PO. */
    public function delete(User $user, ?ClientPurchaseOrder $clientPurchaseOrder = null): bool
    {
        return $user->can('client_po.delete');
    }
}