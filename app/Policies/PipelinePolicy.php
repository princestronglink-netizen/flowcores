<?php

namespace App\Policies;

use App\Models\User;

class PipelinePolicy
{
    /** See the board. */
    public function viewAny(User $user): bool
    {
        return $user->can('pipeline.view');
    }

    /** Create the pipeline. */
    public function create(User $user): bool
    {
        return $user->can('pipeline.manage');
    }

    /** Edit the pipeline and its stages. */
    public function update(User $user): bool
    {
        return $user->can('pipeline.manage');
    }
}