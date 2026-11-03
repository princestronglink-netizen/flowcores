<?php

namespace Database\Seeders;

use App\Models\PipelineStage;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        // Use YOUR real stage_code values (lowercase, same as in the pipeline setup).
        $roles = [
            'sales'     => ['quotation'],
            'warehouse' => ['delivery'],
        ];

        // Extra, non-stage permissions per role.
        $extra = [
            'warehouse' => ['delivery.record', 'delivery.return'],
        ];

        foreach ($roles as $roleName => $stageCodes) {
            $names = ['pipeline.view'];

            foreach ($stageCodes as $code) {
                $names[] = PipelineStage::permissionFor($code);
            }

            $names = array_merge($names, $extra[$roleName] ?? []);

            $permissions = Permission::where('guard_name', 'web')->whereIn('name', $names)->get();

            foreach (array_diff($names, $permissions->pluck('name')->all()) as $missing) {
                $this->command?->warn("Skipped {$roleName}: no permission '{$missing}'.");
            }

            $role = Role::findOrCreate($roleName, 'web');

            // Only on first creation, so edits made on the Roles page are never overwritten.
            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($permissions->all());
            }
        }

        $registrar->forgetCachedPermissions();
    }
}