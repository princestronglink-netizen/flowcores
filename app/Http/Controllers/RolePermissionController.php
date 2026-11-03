<?php

namespace App\Http\Controllers;

use App\Models\PipelineStage;
use App\Support\PermissionLabel;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionController extends Controller
{
    public function index()
    {
        // Every stage always has its own permission.
        $stages = PipelineStage::orderBy('sort_order')->get(['id', 'stage_code', 'stage_name']);
        $stages->each(fn ($s) => Permission::findOrCreate(PipelineStage::permissionFor($s->stage_code), 'web'));

        // General access = every permission in the database except the per-stage ones.
        $general = Permission::where('guard_name', 'web')
            ->where('name', 'not like', 'stage.%')
            ->orderBy('name')
            ->pluck('name')
            ->map(fn ($name) => ['name' => $name, 'label' => PermissionLabel::make($name)])
            ->values();

        return Inertia::render('Roles/Index', [
            'roles' => Role::with('permissions:id,name')
                ->withCount('users')
                ->orderBy('name')
                ->get()
                ->map(fn ($r) => [
                    'id'          => $r->id,
                    'name'        => $r->name,
                    'users_count' => $r->users_count,
                    'permissions' => $r->permissions->pluck('name')->values(),
                ]),
            'general' => $general,
            'stages'  => $stages->map(fn ($s) => [
                'id'         => $s->id,
                'name'       => $s->stage_name,
                'permission' => PipelineStage::permissionFor($s->stage_code),
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:50',
                Rule::unique('roles', 'name')->where('guard_name', 'web'),
            ],
        ]);

        Role::create(['name' => $data['name'], 'guard_name' => 'web']);

        return back();
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate([
            'name' => [
                'sometimes', 'required', 'string', 'max:50',
                Rule::unique('roles', 'name')->where('guard_name', 'web')->ignore($role->id),
            ],
            'permissions'   => 'sometimes|array',
            'permissions.*' => 'string',
        ]);

        // Rename (only when a name was sent).
        if (isset($data['name'])) {
            $role->update(['name' => $data['name']]);
        }

        // Change permissions (only when a list was sent, so a rename never wipes them).
        if ($request->has('permissions')) {
            // Real models from the database, so only existing permissions can be granted.
            $permissions = Permission::where('guard_name', 'web')
                ->whereIn('name', $data['permissions'] ?? [])
                ->get();

            $role->syncPermissions($permissions->all());
        }

        return back();
    }

    public function destroy(Role $role)
    {
        if ($role->users()->exists()) {
            return back()->withErrors(['role' => "Remove \"{$role->name}\" from its users before deleting it."]);
        }

        $role->delete();

        return back();
    }
}