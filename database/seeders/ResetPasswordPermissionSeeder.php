<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class ResetPasswordPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            'users.manage',
            'users.reset_password',
            'users.send_credentials',
            'users.manage_admins',
        ];

        foreach ($names as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        Role::where('name', 'super_admin')->first()?->givePermissionTo($names);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}