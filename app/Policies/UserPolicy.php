<?php

namespace App\Policies;

use App\Models\User;

/**
 * Permissions: users.manage / users.reset_password / users.send_credentials / users.manage_admins
 */
class UserPolicy
{
    private const ADMIN_ROLE = 'super_admin';

    private function canTouch(User $actor, User $target): bool
    {
        return ! $target->hasRole(self::ADMIN_ROLE) || $actor->can('users.manage_admins');
    }

    public function viewAny(User $user): bool
    {
        return $user->can('users.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('users.manage');
    }

    public function update(User $actor, User $target): bool
    {
        return $actor->can('users.manage') && $this->canTouch($actor, $target);
    }

    public function delete(User $actor, User $target): bool
    {
        return $actor->can('users.manage')
            && $actor->id !== $target->id
            && $this->canTouch($actor, $target);
    }

    public function resetPassword(User $actor, User $target): bool
    {
        return $actor->can('users.reset_password')
            && $actor->id !== $target->id
            && $this->canTouch($actor, $target);
    }

    public function sendCredentials(User $actor, User $target): bool
    {
        return $actor->can('users.send_credentials')
            && $actor->id !== $target->id
            && $this->canTouch($actor, $target);
    }
}