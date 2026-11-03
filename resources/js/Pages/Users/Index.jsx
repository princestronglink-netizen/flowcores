import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { cx } from '@/Components/ui/kit';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Search, ShieldCheck, Trash2, UserX, Users as UsersIcon } from 'lucide-react';

const field =
    'mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#667292]/20';

// Same role always gets the same color.
const BADGES = [
    'bg-sky-50 text-sky-700 ring-sky-200',
    'bg-violet-50 text-violet-700 ring-violet-200',
    'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'bg-rose-50 text-rose-700 ring-rose-200',
    'bg-teal-50 text-teal-700 ring-teal-200',
    'bg-orange-50 text-orange-700 ring-orange-200',
];
const AVATARS = ['bg-[#667292]', 'bg-sky-600', 'bg-violet-600', 'bg-emerald-600', 'bg-rose-500', 'bg-teal-600', 'bg-orange-500'];

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const badgeFor = (role) => (role === 'admin' ? 'bg-[#3a4157] text-white ring-[#3a4157]' : BADGES[hash(role) % BADGES.length]);
const avatarFor = (name) => AVATARS[hash(name) % AVATARS.length];

function RoleBadge({ role }) {
    if (!role) {
        return <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-200">No role</span>;
    }
    return (
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', badgeFor(role))}>
            {role === 'admin' && <ShieldCheck className="h-3 w-3" />}
            {role}
        </span>
    );
}

function Stat({ icon: Icon, label, value, tone = 'text-[#667292] bg-[#eef1f5]' }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg', tone)}>
                <Icon className="h-4 w-4" />
            </span>
            <p className="text-sm text-slate-500">
                <span className="mr-1 text-base font-semibold tabular-nums text-slate-900">{value}</span>
                {label}
            </p>
        </div>
    );
}

export default function Index({ users, roles, currentId, actorIsAdmin }) {
    const { errors: pageErrors } = usePage().props;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null); // null = creating
    const [showPassword, setShowPassword] = useState(false);
    const [q, setQ] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const { data, setData, post, put, processing, errors, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        role: '',
    });

    const stats = useMemo(
        () => ({
            total: users.length,
            admins: users.filter((u) => u.is_admin).length,
            noRole: users.filter((u) => !u.role).length,
        }),
        [users],
    );

    const rows = useMemo(() => {
        const term = q.trim().toLowerCase();
        return users.filter((u) => {
            if (roleFilter === '__none' && u.role) return false;
            if (roleFilter && roleFilter !== '__none' && u.role !== roleFilter) return false;
            return !term || `${u.name} ${u.email}`.toLowerCase().includes(term);
        });
    }, [users, q, roleFilter]);

    const openNew = () => {
        setEditing(null);
        setData({ name: '', email: '', password: '', role: '' });
        setShowPassword(false);
        clearErrors();
        setOpen(true);
    };

    const openEdit = (u) => {
        setEditing(u);
        setData({ name: u.name, email: u.email, password: '', role: u.role ?? '' });
        setShowPassword(false);
        clearErrors();
        setOpen(true);
    };

    const close = () => {
        setOpen(false);
        clearErrors();
    };

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: close };
        if (editing) put(route('users.update', editing.id), options);
        else post(route('users.store'), options);
    };

    const remove = (u) => {
        if (window.confirm(`Delete the account of ${u.name} (${u.email})?`)) {
            router.delete(route('users.destroy', u.id), { preserveScroll: true });
        }
    };

    // A non-admin manager can't touch admin accounts.
    const canEdit = (u) => actorIsAdmin || !u.is_admin;
    const filtered = q || roleFilter;

    return (
        <AuthenticatedLayout
            header={<PageHeading title="Users" subtitle="Create accounts and choose the role each person has." />}
        >
            <Head title="Users" />

            <div className="w-full p-3 sm:p-4">
                {pageErrors?.user && (
                    <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                        {pageErrors.user}
                    </p>
                )}

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Stats + toolbar in one compact area */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-100 px-5 py-3">
                        <Stat icon={UsersIcon} label="users" value={stats.total} />
                        <Stat icon={ShieldCheck} label="admins" value={stats.admins} tone="bg-[#3a4157] text-white" />
                        <Stat icon={UserX} label="without a role" value={stats.noRole} tone="bg-amber-50 text-amber-600" />

                        <div className="ml-auto flex flex-wrap items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search name or email"
                                    aria-label="Search users"
                                    className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#667292]/20"
                                />
                            </div>

                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                aria-label="Filter by role"
                                className="h-9 rounded-lg border border-slate-300 px-3 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#667292]/20"
                            >
                                <option value="">All roles</option>
                                {actorIsAdmin && <option value="admin">admin</option>}
                                {roles.filter((r) => r !== 'admin').map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                                <option value="__none">No role</option>
                            </select>

                            {filtered && (
                                <button type="button" onClick={() => { setQ(''); setRoleFilter(''); }} className="text-sm font-medium text-[#667292] hover:underline">
                                    Clear
                                </button>
                            )}

                            <Button variant="brand" onClick={openNew}>
                                <Plus /> New user
                            </Button>
                        </div>
                    </div>

                    {rows.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-sm font-semibold text-slate-900">No users found</p>
                            <p className="mt-1 text-sm text-slate-500">Change the filters or create a new user.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                                        <th className="px-5 py-2.5">Name</th>
                                        <th className="px-5 py-2.5">Email</th>
                                        <th className="px-5 py-2.5">Role</th>
                                        <th className="px-5 py-2.5">Joined</th>
                                        <th className="px-5 py-2.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rows.map((u) => (
                                        <tr key={u.id} className="transition-colors hover:bg-slate-50/60">
                                            <td className="px-5 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white', avatarFor(u.name))}>
                                                        {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                                                    </span>
                                                    <p className="truncate font-medium text-slate-900">
                                                        {u.name}
                                                        {u.id === currentId && (
                                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">You</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-2.5 text-slate-600">{u.email}</td>
                                            <td className="px-5 py-2.5"><RoleBadge role={u.role} /></td>
                                            <td className="px-5 py-2.5 text-slate-500">{u.created_at}</td>
                                            <td className="px-5 py-2.5">
                                                <div className="flex justify-end gap-2">
                                                    {canEdit(u) ? (
                                                        <>
                                                            <Button variant="outline" size="icon" aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            {u.id !== currentId && (
                                                                <Button variant="outline" size="icon" aria-label={`Delete ${u.name}`} onClick={() => remove(u)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Admin only</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">
                        Showing {rows.length} of {users.length} {users.length === 1 ? 'user' : 'users'}
                    </div>
                </div>
            </div>

            {/* Create / edit */}
            <Modal show={open} onClose={close} maxWidth="lg">
                <form onSubmit={submit} noValidate className="p-6">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef1f5] text-[#667292]">
                            <UsersIcon className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">{editing ? 'Edit user' : 'New user'}</h2>
                            <p className="text-sm text-slate-500">
                                {editing ? 'Update the details or change the role.' : 'They can log in right away with this password.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="user_name" className="text-xs font-medium text-slate-600">Full name</label>
                                <input id="user_name" type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={field} />
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="user_email" className="text-xs font-medium text-slate-600">Email</label>
                                <input id="user_email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className={field} />
                                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="user_password" className="text-xs font-medium text-slate-600">
                                Password {editing && <span className="font-normal text-slate-400">· leave blank to keep the current one</span>}
                            </label>
                            <div className="relative">
                                <input
                                    id="user_password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={cx(field, 'pr-10')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                        </div>

                        <div>
                            <p className="text-xs font-medium text-slate-600">Role <span className="font-normal text-slate-400">· one per user</span></p>
                            {roles.length === 0 ? (
                                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                                    No roles yet. Create some on the Roles & Permissions page.
                                </p>
                            ) : (
                                <div role="radiogroup" aria-label="Role" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {roles.map((r) => {
                                        const selected = data.role === r;
                                        return (
                                            <button
                                                key={r}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                onClick={() => setData('role', r)}
                                                className={cx(
                                                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium capitalize transition-colors',
                                                    selected
                                                        ? 'border-[#667292] bg-[#eef1f5] text-[#3a4157] ring-1 ring-[#667292]'
                                                        : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                                                )}
                                            >
                                                <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-[#667292]' : 'border-slate-300')}>
                                                    {selected && <span className="h-2 w-2 rounded-full bg-[#667292]" />}
                                                </span>
                                                <span className="truncate">{r}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.role && <p className="mt-1.5 text-xs text-red-600">{errors.role}</p>}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                        <Button type="submit" variant="brand" disabled={processing}>
                            {processing ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}