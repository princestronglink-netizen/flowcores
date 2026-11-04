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
            // Who may close a deal as Done (won) or Lost.
            'deal.won',
            'deal.lost',
            // Quotations: see the list (+ print, which also needs amounts.view) / edit and restore versions.
            'quotation.view',
            'quotation.edit',
            'quotation.delete',
            // Client POs: see the list / edit and cancel / confirm / delete.
            'client_po.view',
            'client_po.edit',
            'client_po.confirm',
            'client_po.delete',

            // Transactions: see the list / create / edit / delete.
            'transaction.view',
            'transaction.create',
            'transaction.edit',
            'transaction.delete',

            // Clients: see the list / create / edit / delete.
            'client.view',
            'client.create',
            'client.edit',
            'client.delete',

            // Items: see the list / create / edit / delete.
            'item.view',
            'item.create',
            'item.edit',
            'item.delete',
            // Categories: see the list / create / edit / delete.
            'category.view',
            'category.create',
            'category.edit',
            'category.delete',
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