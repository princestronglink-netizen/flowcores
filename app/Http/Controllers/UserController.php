<?php

namespace App\Http\Controllers;

use App\Mail\TemporaryPasswordMail;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    private const ADMIN_ROLE = 'super_admin';

    private function actorCanManageAdmins(): bool
    {
        return auth()->user()->can('users.manage_admins');
    }

    private function assignableRoles(): array
    {
        return Role::where('guard_name', 'web')
            ->when(! $this->actorCanManageAdmins(), fn ($q) => $q->where('name', '!=', self::ADMIN_ROLE))
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }

    private function isLastAdmin(User $user): bool
    {
        return $user->hasRole(self::ADMIN_ROLE) && User::role(self::ADMIN_ROLE)->count() <= 1;
    }

    /** Sets a new random password and emails it. Returns false if the email failed. */
    private function issueTemporaryPassword(User $user, bool $isReset = false): bool
    {
        $password = Str::password(12, symbols: false);

        $user->forceFill([
            'password'       => $password,
            'remember_token' => null,
        ])->save();

        try {
            Mail::to($user->email)->send(new TemporaryPasswordMail($user, $password, $isReset));
            return true;
        } catch (\Throwable $e) {
            report($e);
            return false;
        }
    }

    public function index()
    {
        Gate::authorize('viewAny', User::class);

        return Inertia::render('Users/Index', [
            'users' => User::with('roles:id,name')
                ->orderBy('id')
                ->get()
                ->map(fn ($u) => [
                    'id'         => $u->id,
                    'name'       => $u->name,
                    'email'      => $u->email,
                    'role'       => $u->roles->first()?->name,
                    'is_admin'   => $u->roles->contains('name', self::ADMIN_ROLE),
                    'created_at' => $u->created_at?->toDateString(),
                ]),
            'roles'        => $this->assignableRoles(),
            'currentId'    => auth()->id(),
            'actorIsAdmin' => $this->actorCanManageAdmins(),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('create', User::class);

        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'role'  => ['required', 'string', Rule::in($this->assignableRoles())],
        ]);

        // The LogsActivity trait on User logs "user.created" (password is never stored in the log).
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Str::random(40),
        ]);

        $user->forceFill(['email_verified_at' => now()])->save();
        $user->syncRoles([$data['role']]);

        ActivityLog::record(
            'user.role_changed',
            "Assigned role “{$data['role']}” to {$user->name}",
            $user,
            ['old' => null, 'new' => $data['role']],
            $user->name,
        );

        if (! $this->issueTemporaryPassword($user)) {
            return back()->withErrors(['user' => 'User created, but the email could not be sent. Use the reset button to try again.']);
        }

        return back()->with('success', "User created. A password was sent to {$user->email}.");
    }

    public function update(Request $request, User $user)
    {
        Gate::authorize('update', $user);

        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role'  => ['required', 'string', Rule::in($this->assignableRoles())],
        ]);

        if ($this->isLastAdmin($user) && $data['role'] !== self::ADMIN_ROLE) {
            return back()->withErrors(['role' => 'This is the only admin. Make another user an admin before changing this role.']);
        }

        $oldRole = $user->roles->first()?->name;

        // Trait logs "user.updated" if name / email really changed.
        $user->update(['name' => $data['name'], 'email' => $data['email']]);
        $user->syncRoles([$data['role']]);

        if ($oldRole !== $data['role']) {
            ActivityLog::record(
                'user.role_changed',
                "Changed role of {$user->name} from " . ($oldRole ?? 'none') . " to {$data['role']}",
                $user,
                ['old' => $oldRole, 'new' => $data['role']],
                $user->name,
            );
        }

        return back();
    }

    public function resetPassword(User $user)
    {
        Gate::authorize('resetPassword', $user);

        $sent = $this->issueTemporaryPassword($user, isReset: true);

        ActivityLog::record(
            'user.password_reset',
            "Reset password of {$user->name}" . ($sent ? '' : ' (email failed)'),
            $user,
            ['email_sent' => $sent],
            $user->name,
        );

        if (! $sent) {
            return back()->withErrors(['user' => 'The password was reset, but the email could not be sent. Check your mail settings and try again.']);
        }

        return back()->with('success', "A new password was sent to {$user->email}.");
    }

    public function sendCredentials(User $user)
    {
        Gate::authorize('sendCredentials', $user);

        $sent = $this->issueTemporaryPassword($user);

        ActivityLog::record(
            'user.credentials_sent',
            "Sent credentials to {$user->name}" . ($sent ? '' : ' (email failed)'),
            $user,
            ['email_sent' => $sent],
            $user->name,
        );

        if (! $sent) {
            return back()->withErrors(['user' => 'The password was changed, but the email could not be sent. Check your mail settings and try again.']);
        }

        return back()->with('success', "Credentials sent to {$user->email}.");
    }

    public function destroy(User $user)
    {
        Gate::authorize('delete', $user);

        if ($this->isLastAdmin($user)) {
            return back()->withErrors(['user' => "You can't delete the only admin."]);
        }

        // Trait logs "user.deleted".
        $user->delete();

        return back();
    }
}