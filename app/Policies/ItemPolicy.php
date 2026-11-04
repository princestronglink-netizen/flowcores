<?php

namespace App\Policies;

use App\Models\Item;
use App\Models\User;

/**
 * Items (the catalog: items, brands, variants).
 * The model argument is optional so the same ability works for a record check
 * ($user->can('update', $item)) and a class-level check used by HandleInertiaRequests
 * ($user->can('update', Item::class)).
 *
 * Permissions: item.view / item.create / item.edit / item.delete
 */
class ItemPolicy
{
    /** See the Items list. */
    public function viewAny(User $user): bool
    {
        return $user->can('item.view');
    }

    /** Open the create form and save a new item. */
    public function create(User $user): bool
    {
        return $user->can('item.create');
    }

    /** Open the edit form and save changes (brands, variants). */
    public function update(User $user, ?Item $item = null): bool
    {
        return $user->can('item.edit');
    }

    /** Delete an item. */
    public function delete(User $user, ?Item $item = null): bool
    {
        return $user->can('item.delete');
    }
}