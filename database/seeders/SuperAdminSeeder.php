<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        // super_admin gets EVERY permission each time this seeder runs.
        $superAdmin = Role::findOrCreate('super_admin', 'web');
        $superAdmin->syncPermissions(Permission::where('guard_name', 'web')->get());

        // The first account ever registered (lowest id) must be super_admin. Nothing is created.
        $user = User::orderBy('id')->first();

        if (! $user) {
            $this->command?->warn('No users found. Register an account first, then run this seeder again.');

            return;
        }

        // One role per user: this replaces any other role the account had.
        $user->syncRoles(['super_admin']);

        $registrar->forgetCachedPermissions();

        $this->command?->info("super_admin has all permissions and was given to the first account: {$user->email} (id {$user->id})");
    }
}