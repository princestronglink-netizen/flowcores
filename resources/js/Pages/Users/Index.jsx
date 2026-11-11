import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import UserTable from '@/Components/User/UserTable';
import ResetPasswordModal from '@/Components/User/ResetPasswordModal';
import SendCredentialsModal from '@/Components/User/SendCredentialsModal';
import Modal from '@/Components/Modal';
import { FilterBar, FilterSelect, SearchBox } from '@/Components/Index';
import { Button } from '@/Components/ui/Button';
import { cx } from '@/Components/ui/kit';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { Plus, ShieldCheck, UserX, Users as UsersIcon } from 'lucide-react';

const ADMIN_ROLE = 'super_admin';

const field =
    'mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#667292]/20';

function Stat({ icon: Icon, label, value, tone = 'text-[#667292] bg-[#eef1f5]' }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className={cx('flex size-8 items-center justify-center rounded-lg', tone)}>
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
    const { errors: pageErrors, flash, auth } = usePage().props;
    const canReset = auth?.can?.reset_user_password;
    const canSend = auth?.can?.send_user_credentials;

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null); // null = creating
    const [resetTarget, setResetTarget] = useState(null);
    const [sendTarget, setSendTarget] = useState(null);
    const [busy, setBusy] = useState(false);
    const [q, setQ] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const { data, setData, post, put, processing, errors, clearErrors } = useForm({
        name: '',
        email: '',
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
        setData({ name: '', email: '', role: '' });
        clearErrors();
        setOpen(true);
    };

    const openEdit = (u) => {
        setEditing(u);
        setData({ name: u.name, email: u.email, role: u.role ?? '' });
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

    // Shared by reset and send credentials: post, show the spinner, close the modal.
    const sendAction = (routeName, target, clear) => {
        router.post(route(routeName, target.id), {}, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => {
                setBusy(false);
                clear(null);
            },
        });
    };

    const confirmReset = () => sendAction('users.reset-password', resetTarget, setResetTarget);
    const confirmSend = () => sendAction('users.send-credentials', sendTarget, setSendTarget);

    // actorIsAdmin = can manage admin accounts (users.manage_admins).
    const canEditUser = (u) => actorIsAdmin || !u.is_admin;
    const hasFilters = q || roleFilter;
    const noData = users.length === 0;

    return (
        <AuthenticatedLayout header={<PageHeading title="Users" subtitle="Create accounts and choose the role each person has." />}>
            <Head title="Users" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        <Button variant="brand" onClick={openNew}>
                            <Plus />
                            New user
                        </Button>
                    </PageToolbar>
                }
            >
                <div className="p-5">
                    {flash?.success && (
                        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
                            {flash.success}
                        </p>
                    )}

                    {pageErrors?.user && (
                        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                            {pageErrors.user}
                        </p>
                    )}

                    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <Stat icon={UsersIcon} label="users" value={stats.total} />
                        <Stat icon={ShieldCheck} label="admins" value={stats.admins} tone="bg-[#3a4157] text-white" />
                        <Stat icon={UserX} label="without a role" value={stats.noRole} tone="bg-amber-50 text-amber-600" />
                    </div>

                    {!noData && (
                        <FilterBar>
                            <SearchBox value={q} onChange={setQ} placeholder="Search name or email" label="Search users" />
                            <FilterSelect label="Filter by role" value={roleFilter} onChange={setRoleFilter}>
                                <option value="">All roles</option>
                                {actorIsAdmin && <option value={ADMIN_ROLE}>{ADMIN_ROLE}</option>}
                                {roles.filter((r) => r !== ADMIN_ROLE).map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                                <option value="__none">No role</option>
                            </FilterSelect>
                            {hasFilters && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setQ('');
                                        setRoleFilter('');
                                    }}
                                >
                                    Clear filters
                                </Button>
                            )}
                        </FilterBar>
                    )}

                    <UserTable
                        rows={rows}
                        currentId={currentId}
                        canEditUser={canEditUser}
                        onEdit={openEdit}
                        onDelete={remove}
                        onResetPassword={canReset ? setResetTarget : null}
                        onSendCredentials={canSend ? setSendTarget : null}
                        emptyTitle={noData ? 'No users yet' : 'No users found'}
                        emptyHint={noData ? 'Create the first user.' : 'Change the filters or create a new user.'}
                    />

                    <p className="mt-3 text-xs text-slate-500">
                        Showing {rows.length} of {users.length} {users.length === 1 ? 'user' : 'users'}
                    </p>
                </div>
            </PageCard>

            {/* Create / edit */}
            <Modal show={open} onClose={close} maxWidth="lg">
                <form onSubmit={submit} noValidate className="p-6">
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[#eef1f5] text-[#667292]">
                            <UsersIcon className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">{editing ? 'Edit user' : 'New user'}</h2>
                            <p className="text-sm text-slate-500">
                                {editing ? 'Update the details or change the role.' : 'A password will be generated and emailed to them.'}
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

                        {!editing && (
                            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                                A password will be generated automatically and emailed to this user.
                            </p>
                        )}

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
                                                <span className={cx('flex size-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-[#667292]' : 'border-slate-300')}>
                                                    {selected && <span className="size-2 rounded-full bg-[#667292]" />}
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

            {/* Reset password confirm */}
            <ResetPasswordModal
                open={!!resetTarget}
                onClose={() => setResetTarget(null)}
                onConfirm={confirmReset}
                loading={busy}
                userName={resetTarget?.name}
                userEmail={resetTarget?.email}
            />

            {/* Send credentials confirm */}
            <SendCredentialsModal
                open={!!sendTarget}
                onClose={() => setSendTarget(null)}
                onConfirm={confirmSend}
                loading={busy}
                userName={sendTarget?.name}
                userEmail={sendTarget?.email}
            />
        </AuthenticatedLayout>
    );
}