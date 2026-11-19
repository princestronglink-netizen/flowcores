<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
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
        $stages = PipelineStage::orderBy('sort_order')->get(['id', 'stage_code', 'stage_name']);
        $stages->each(fn ($s) => Permission::findOrCreate(PipelineStage::permissionFor($s->stage_code), 'web'));

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

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);

        ActivityLog::record(
            'role.created',
            "Created role “{$role->name}”",
            $role,
            ['new' => ['name' => $role->name]],
            $role->name,
        );

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

        if (isset($data['name']) && $data['name'] !== $role->name) {
            $oldName = $role->name;
            $role->update(['name' => $data['name']]);

            ActivityLog::record(
                'role.renamed',
                "Renamed role “{$oldName}” to “{$role->name}”",
                $role,
                ['old' => $oldName, 'new' => $role->name],
                $role->name,
            );
        }

        if ($request->has('permissions')) {
            $before = $role->permissions()->pluck('name');

            $permissions = Permission::where('guard_name', 'web')
                ->whereIn('name', $data['permissions'] ?? [])
                ->get();

            $role->syncPermissions($permissions->all());

            $after   = $permissions->pluck('name');
            $added   = $after->diff($before)->values()->all();
            $removed = $before->diff($after)->values()->all();

            if ($added || $removed) {
                ActivityLog::record(
                    'role.permissions_changed',
                    "Changed permissions of role “{$role->name}” (+" . count($added) . ' / -' . count($removed) . ')',
                    $role,
                    ['added' => $added, 'removed' => $removed],
                    $role->name,
                );
            }
        }

        return back();
    }

    public function destroy(Role $role)
    {
        if ($role->users()->exists()) {
            return back()->withErrors(['role' => "Remove \"{$role->name}\" from its users before deleting it."]);
        }

        $name = $role->name;

        $role->delete();

        ActivityLog::record(
            'role.deleted',
            "Deleted role “{$name}”",
            $role,
            ['old' => ['name' => $name]],
            $name,
        );

        return back();
    }
}