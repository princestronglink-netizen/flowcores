<?php

namespace App\Http\Controllers;

use App\Models\PipelineStage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class StagePermissionController extends Controller
{
    public function index()
    {
        $stages = PipelineStage::orderBy('pipeline_id')
            ->orderBy('sort_order')
            ->get(['id', 'stage_name']);

        // admin bypasses everything via Gate::before, so it is not editable here.
        $roles = Role::where('name', '!=', 'admin')
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn ($role) => [
                'id'          => $role->id,
                'name'        => $role->name,
                'permissions' => $role->permissions->pluck('name')->values(),
            ]);

        return Inertia::render('Settings/StagePermissions', [
            'stages'    => $stages,
            'roles'     => $roles,
            'abilities' => PipelineStage::ABILITIES,
        ]);
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate([
            'permissions'   => 'present|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        // Only touch stage permissions; keep any other permissions the role has.
        $others = $role->permissions
            ->reject(fn ($p) => str_starts_with($p->name, 'stage.'))
            ->pluck('name');

        $stagePerms = collect($data['permissions'])
            ->filter(fn ($name) => str_starts_with($name, 'stage.'));

        $role->syncPermissions($others->merge($stagePerms)->unique()->values()->all());

        return back();
    }

    public function storeRole(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
        ]);

        Role::create(['name' => $data['name'], 'guard_name' => 'web']);

        return back();
    }
}