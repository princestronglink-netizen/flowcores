<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\User;

/**
 * Clients.
 * The model argument is optional so the same ability works for a record check
 * ($user->can('update', $client)) and a class-level check used by HandleInertiaRequests
 * ($user->can('update', Client::class)).
 *
 * Permissions: client.view / client.create / client.edit / client.delete
 */
class ClientPolicy
{
    /** See the Clients list. */
    public function viewAny(User $user): bool
    {
        return $user->can('client.view');
    }

    /** Add a client (also used by the "New client" quick-add inside forms). */
    public function create(User $user): bool
    {
        return $user->can('client.create');
    }

    /** Edit a client and its contact people (also used by the "New contact" quick-add). */
    public function update(User $user, ?Client $client = null): bool
    {
        return $user->can('client.edit');
    }

    /** Delete a client. */
    public function delete(User $user, ?Client $client = null): bool
    {
        return $user->can('client.delete');
    }
}