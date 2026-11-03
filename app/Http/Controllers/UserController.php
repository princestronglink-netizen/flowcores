<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    private function actorIsAdmin(): bool
    {
        return auth()->user()->hasRole('admin');
    }

    /** Roles the current user may hand out. Only admins can give the admin role. */
    private function assignableRoles(): array
    {
        return Role::where('guard_name', 'web')
            ->when(! $this->actorIsAdmin(), fn ($q) => $q->where('name', '!=', 'admin'))
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }

    public function index()
    {
        return Inertia::render('Users/Index', [
            'users' => User::with('roles:id,name')
                ->orderBy('id')
                ->get()
                ->map(fn ($u) => [
                    'id'         => $u->id,
                    'name'       => $u->name,
                    'email'      => $u->email,
                    'role'       => $u->roles->first()?->name, // one role per user
                    'is_admin'   => $u->roles->contains('name', 'admin'),
                    'created_at' => $u->created_at?->toDateString(),
                ]),
            'roles'        => $this->assignableRoles(),
            'currentId'    => auth()->id(),
            'actorIsAdmin' => $this->actorIsAdmin(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|max:255',
            'role'     => ['required', 'string', Rule::in($this->assignableRoles())],
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => $data['password'], // hashed by the User model cast
        ]);

        // Accounts created by an administrator don't need an email verification step.
        $user->forceFill(['email_verified_at' => now()])->save();

        $user->syncRoles([$data['role']]);

        return back();
    }

    public function update(Request $request, User $user)
    {
        abort_if(! $this->actorIsAdmin() && $user->hasRole('admin'), 403, 'Only an admin can edit an admin account.');

        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:8|max:255',
            'role'     => ['required', 'string', Rule::in($this->assignableRoles())],
        ]);

        // Never leave the system without an admin.
        if ($user->hasRole('admin') && $data['role'] !== 'admin' && User::role('admin')->count() <= 1) {
            return back()->withErrors(['role' => 'This is the only admin. Make another user an admin before changing this role.']);
        }

        $user->name  = $data['name'];
        $user->email = $data['email'];

        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        $user->save();
        $user->syncRoles([$data['role']]); // replaces any previous role

        return back();
    }

    public function destroy(User $user)
    {
        abort_if(! $this->actorIsAdmin() && $user->hasRole('admin'), 403, 'Only an admin can delete an admin account.');

        if ($user->id === auth()->id()) {
            return back()->withErrors(['user' => "You can't delete your own account."]);
        }

        if ($user->hasRole('admin') && User::role('admin')->count() <= 1) {
            return back()->withErrors(['user' => "You can't delete the only admin."]);
        }

        $user->delete();

        return back();
    }
}