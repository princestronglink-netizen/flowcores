<?php

namespace App\Policies;

use App\Models\ItemCategory;
use App\Models\User;

/**
 * Item categories.
 * The model argument is optional so the same ability works for a record check
 * and a class-level check used by HandleInertiaRequests.
 *
 * Permissions: category.view / category.create / category.edit / category.delete
 */
class ItemCategoryPolicy
{
    /** See the Categories list. */
    public function viewAny(User $user): bool
    {
        return $user->can('category.view');
    }

    /** Add a category (also used by the "New" quick-add inside the item form). */
    public function create(User $user): bool
    {
        return $user->can('category.create');
    }

    /** Rename / edit a category. */
    public function update(User $user, ?ItemCategory $category = null): bool
    {
        return $user->can('category.edit');
    }

    /** Delete a category. */
    public function delete(User $user, ?ItemCategory $category = null): bool
    {
        return $user->can('category.delete');
    }
}