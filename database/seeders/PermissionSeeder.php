<?php

namespace Database\Seeders;

use App\Models\PipelineStage;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        $names = [
            'pipeline.view',
            'pipeline.manage',
            'amounts.view',
            'roles.manage',
            'users.manage',
            // Who may record deliveries / returns (separate from moving cards into the stage).
            'delivery.record',
            'delivery.return',
        ];

        foreach ($names as $name) {
            Permission::findOrCreate($name, 'web');
        }

        // One permission per pipeline stage that already exists.
        PipelineStage::all()->each(
            fn ($stage) => Permission::findOrCreate($stage->permissionName(), 'web')
        );

        $registrar->forgetCachedPermissions();
    }
}