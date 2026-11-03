<?php

namespace App\Policies;

use App\Models\PipelineStage;
use App\Models\User;

class PipelineStagePolicy
{
    /** Move cards into this stage and record work done in it. */
    public function move(User $user, PipelineStage $stage): bool
    {
        return $user->can($stage->permissionName());
    }
}