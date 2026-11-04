// resources/js/Pages/Roles/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { Button } from '@/Components/ui/Button';
import { cx } from '@/Components/ui/kit';
import {
    Building2,
    Check,
    ClipboardList,
    FileText,
    GitBranch,
    KeyRound,
    Package,
    Pencil,
    Plus,
    Receipt,
    ScrollText,
    Search,
    ShieldCheck,
    Tags,
    Trash2,
    Users,
    X,
} from 'lucide-react';

const sameSet = (a = [], b = []) =>
    a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/**
 * Permission groups. A permission such as "item.edit" belongs to the group
 * whose `prefixes` contains "item". Anything unknown falls into "Other".
 */
const GROUPS = [
    { id: 'pipeline', label: 'Pipeline & deals', desc: 'Board access, amounts, deliveries and closing deals.', icon: GitBranch, prefixes: ['pipeline', 'amounts', 'delivery', 'deal'] },
    { id: 'quotation', label: 'Quotations', desc: 'View, edit and restore quotations.', icon: FileText, prefixes: ['quotation'] },
    { id: 'client_po', label: 'Client POs', desc: 'Client purchase orders.', icon: ClipboardList, prefixes: ['client_po'] },
    { id: 'transaction', label: 'Transactions', desc: 'Create and manage transactions.', icon: Receipt, prefixes: ['transaction'] },
    { id: 'client', label: 'Clients', desc: 'Client records.', icon: Building2, prefixes: ['client'] },
    { id: 'item', label: 'Items', desc: 'Catalog of items, brands and variants.', icon: Package, prefixes: ['item'] },
    { id: 'category', label: 'Categories', desc: 'Item categories.', icon: Tags, prefixes: ['category'] },
    { id: 'stock', label: 'Stock', desc: 'Receive stock, adjust counts and read the ledger.', icon: ScrollText, prefixes: ['stock'] },
    { id: 'admin', label: 'Administration', desc: 'Users, roles and permissions.', icon: ShieldCheck, prefixes: ['users', 'roles'] },
    { id: 'other', label: 'Other', desc: 'Additional permissions.', icon: KeyRound, prefixes: [] },
];

const groupIdFor = (name) => {
    const prefix = String(name).split('.')[0];
    return GROUPS.find((g) => g.prefixes.includes(prefix))?.id ?? 'other';
};

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'on', label: 'Granted' },
    { id: 'off', label: 'Not granted' },
];

function Toggle({ checked }) {
    return (
        <span
            aria-hidden="true"
            className={cx(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                checked ? 'bg-[#667292]' : 'bg-slate-200',
            )}
        >
            <span
                className={cx(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                    checked ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
            />
        </span>
    );
}

function PermissionRow({ title, code, step, checked, onChange }) {
    return (
        <li>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={onChange}
                title={code}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8d9db6]"
            >
                <span className="flex min-w-0 items-center gap-2.5">
                    {step != null && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                            {step}
                        </span>
                    )}
                    <span className={cx('truncate text-sm', checked ? 'font-medium text-slate-900' : 'text-slate-600')}>
                        {title}
                    </span>
                </span>
                <Toggle checked={checked} />
            </button>
        </li>
    );
}

function PermissionCard({ icon: Icon, title, description, granted, total, onAll, onNone, children }) {
    const complete = total > 0 && granted === total;

    return (
        <section className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#667292] ring-1 ring-slate-200">
                        <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                        <p className="text-xs text-slate-500">{description}</p>
                    </div>
                </div>
                <span
                    className={cx(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset',
                        complete
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : granted > 0
                              ? 'bg-[#eef1f5] text-[#3a4157] ring-[#bccad6]'
                              : 'bg-slate-50 text-slate-500 ring-slate-200',
                    )}
                >
                    {granted}/{total}
                </span>
            </header>

            <ul className="divide-y divide-slate-100">{children}</ul>

            <footer className="flex justify-end gap-4 border-t border-slate-100 px-4 py-2 text-xs font-medium">
                <button type="button" onClick={onAll} className="text-[#667292] hover:underline">
                    Select all
                </button>
                <button type="button" onClick={onNone} className="text-slate-500 hover:underline">
                    Clear
                </button>
            </footer>
        </section>
    );
}

export default function Index({ roles, general, stages }) {
    const { errors } = usePage().props;

    const [selectedId, setSelectedId] = useState(roles[0]?.id);
    const [draft, setDraft] = useState({}); // roleId -> permission names being edited
    const [newRole, setNewRole] = useState('');
    const [adding, setAdding] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const role = roles.find((r) => r.id === selectedId) ?? roles[0];
    const totalPermissions = general.length + stages.length;

    const current = (r) => draft[r.id] ?? r.permissions;
    const isDirty = (r) => draft[r.id] !== undefined && !sameSet(draft[r.id], r.permissions);
    const changedCount = (r) => {
        const now = current(r);
        const before = r.permissions;
        return now.filter((k) => !before.includes(k)).length + before.filter((k) => !now.includes(k)).length;
    };

    const toggle = (r, key) => {
        const list = current(r);
        setDraft((d) => ({ ...d, [r.id]: list.includes(key) ? list.filter((k) => k !== key) : [...list, key] }));
    };

    const setMany = (r, keys, on) => {
        const list = current(r).filter((k) => !keys.includes(k));
        setDraft((d) => ({ ...d, [r.id]: on ? [...list, ...keys] : list }));
    };

    const discard = (r) =>
        setDraft((d) => {
            const { [r.id]: _x, ...rest } = d;
            return rest;
        });

    const save = (r) =>
        router.put(route('roles.update', r.id), { permissions: current(r) }, { preserveScroll: true, onSuccess: () => discard(r) });

    const remove = (r) => {
        if (window.confirm(`Delete the role "${r.name}"? This cannot be undone.`)) {
            router.delete(route('roles.destroy', r.id), { preserveScroll: true });
        }
    };

    const startRename = (r) => {
        setRenameValue(r.name);
        setRenaming(true);
    };

    const saveRename = (e, r) => {
        e.preventDefault();
        const name = renameValue.trim();
        if (!name || name === r.name) {
            setRenaming(false);
            return;
        }
        router.put(route('roles.update', r.id), { name }, {
            preserveScroll: true,
            onSuccess: () => setRenaming(false),
        });
    };

    const addRole = (e) => {
        e.preventDefault();
        if (!newRole.trim()) return;
        router.post(route('roles.store'), { name: newRole.trim() }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewRole('');
                setAdding(false);
            },
        });
    };

    const perms = role ? current(role) : [];
    const grantedCount = perms.length;
    const percent = totalPermissions > 0 ? Math.round((grantedCount / totalPermissions) * 100) : 0;

    // ---- search + filter ----
    const term = search.trim().toLowerCase();
    const passes = (label, key) => {
        if (term && !`${label} ${key}`.toLowerCase().includes(term)) return false;
        if (filter === 'on' && !perms.includes(key)) return false;
        if (filter === 'off' && perms.includes(key)) return false;
        return true;
    };

    const visibleGroups = useMemo(() => {
        const buckets = Object.fromEntries(GROUPS.map((g) => [g.id, []]));
        general.forEach((g) => buckets[groupIdFor(g.name)].push(g));
        return GROUPS.map((group) => ({ group, all: buckets[group.id] })).filter(({ all }) => all.length > 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [general]);

    const cards = visibleGroups
        .map(({ group, all }) => ({
            group,
            all,
            shown: all.filter((g) => passes(g.label, g.name)),
        }))
        .filter((c) => c.shown.length > 0);

    const shownStages = stages.filter((s) => passes(s.name, s.permission));
    const nothingToShow = cards.length === 0 && shownStages.length === 0;

    return (
        <AuthenticatedLayout
            header={<PageHeading title="Roles & Permissions" subtitle="Control what each role can access and which pipeline stages it can move cards into." />}
        >
            <Head title="Roles & Permissions" />

            <div className="mx-auto w-full max-w-[1680px] space-y-4 p-4 sm:p-6">
                {(errors?.role || errors?.name) && (
                    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                        {errors.role ?? errors.name}
                    </p>
                )}

                <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                    {/* ---------------- Roles list ---------------- */}
                    <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-20">
                        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roles</h2>
                            <button
                                type="button"
                                onClick={() => setAdding((v) => !v)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#667292] hover:bg-slate-50"
                            >
                                {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                {adding ? 'Cancel' : 'New role'}
                            </button>
                        </header>

                        {adding && (
                            <form onSubmit={addRole} className="flex gap-2 border-b border-slate-100 bg-slate-50/60 p-3">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    placeholder="e.g. warehouse"
                                    aria-label="New role name"
                                    className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#8d9db6]/40"
                                />
                                <Button type="submit" variant="brand">Add</Button>
                            </form>
                        )}

                        <ul className="space-y-0.5 p-2">
                            {roles.map((r) => {
                                const active = r.id === role?.id;
                                const count = current(r).length;
                                const pct = totalPermissions > 0 ? (count / totalPermissions) * 100 : 0;

                                return (
                                    <li key={r.id}>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedId(r.id); setRenaming(false); }}
                                            aria-current={active ? 'true' : undefined}
                                            className={cx(
                                                'relative w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                                                active ? 'bg-[#eef1f5] ring-1 ring-inset ring-[#bccad6]' : 'hover:bg-slate-50',
                                            )}
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="flex min-w-0 items-center gap-1.5">
                                                    <span className="truncate text-sm font-medium text-slate-900">{r.name}</span>
                                                    {isDirty(r) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />}
                                                </span>
                                                <span className="shrink-0 text-xs tabular-nums text-slate-500">{count}/{totalPermissions}</span>
                                            </span>
                                            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-200">
                                                <span className="block h-full rounded-full bg-[#667292]" style={{ width: `${pct}%` }} />
                                            </span>
                                            <span className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                                                <Users className="h-3 w-3" />
                                                {r.users_count} {r.users_count === 1 ? 'user' : 'users'}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>

                    {/* ---------------- Selected role ---------------- */}
                    {role ? (
                        <div className="min-w-0">
                            {/* Role header */}
                            <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#667292] text-white">
                                            <KeyRound className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0">
                                            {renaming ? (
                                                <form onSubmit={(e) => saveRename(e, role)} className="flex flex-wrap items-center gap-2">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={renameValue}
                                                        onChange={(e) => setRenameValue(e.target.value)}
                                                        aria-label="Role name"
                                                        className="h-9 w-48 rounded-md border border-slate-300 px-3 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#8d9db6]/40"
                                                    />
                                                    <Button type="submit" variant="brand"><Check className="h-4 w-4" /> Save</Button>
                                                    <Button type="button" variant="outline" onClick={() => setRenaming(false)}>Cancel</Button>
                                                </form>
                                            ) : (
                                                <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight text-slate-900">
                                                    <span className="truncate">{role.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => startRename(role)}
                                                        aria-label="Rename role"
                                                        title="Rename role"
                                                        className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-[#667292]"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                </h2>
                                            )}
                                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                                <Users className="h-3.5 w-3.5" />
                                                {role.users_count} {role.users_count === 1 ? 'user has' : 'users have'} this role
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="min-w-[180px]">
                                            <div className="flex items-baseline justify-between text-xs text-slate-500">
                                                <span>Permissions granted</span>
                                                <span className="font-semibold tabular-nums text-slate-900">{grantedCount} / {totalPermissions}</span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                                <div className="h-full rounded-full bg-[#667292] transition-all" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                        <Button variant="outline" onClick={() => remove(role)}>
                                            <Trash2 className="h-4 w-4" /> Delete role
                                        </Button>
                                    </div>
                                </div>

                                {/* Toolbar */}
                                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                                    <div className="relative w-full sm:w-72">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="search"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search permissions"
                                            aria-label="Search permissions"
                                            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#8d9db6]/40"
                                        />
                                    </div>

                                    <div role="tablist" aria-label="Filter" className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                                        {FILTERS.map((f) => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={filter === f.id}
                                                onClick={() => setFilter(f.id)}
                                                className={cx(
                                                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                                    filter === f.id ? 'bg-[#667292] text-white' : 'text-slate-600 hover:bg-slate-50',
                                                )}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="ml-auto flex gap-4 text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => setMany(role, [...general.map((g) => g.name), ...stages.map((s) => s.permission)], true)}
                                            className="text-[#667292] hover:underline"
                                        >
                                            Grant all
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMany(role, [...general.map((g) => g.name), ...stages.map((s) => s.permission)], false)}
                                            className="text-slate-500 hover:underline"
                                        >
                                            Revoke all
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Permission cards: flow in columns to use all the width */}
                            {nothingToShow ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center">
                                    <p className="text-sm font-semibold text-slate-900">No permissions match</p>
                                    <p className="mt-1 text-sm text-slate-500">Try a different search or filter.</p>
                                </div>
                            ) : (
                                <div className="columns-1 gap-4 md:columns-2 2xl:columns-3">
                                    {cards.map(({ group, all, shown }) => {
                                        const keys = shown.map((g) => g.name);
                                        const granted = all.filter((g) => perms.includes(g.name)).length;
                                        return (
                                            <PermissionCard
                                                key={group.id}
                                                icon={group.icon}
                                                title={group.label}
                                                description={group.desc}
                                                granted={granted}
                                                total={all.length}
                                                onAll={() => setMany(role, keys, true)}
                                                onNone={() => setMany(role, keys, false)}
                                            >
                                                {shown.map((g) => (
                                                    <PermissionRow
                                                        key={g.name}
                                                        title={g.label}
                                                        code={g.name}
                                                        checked={perms.includes(g.name)}
                                                        onChange={() => toggle(role, g.name)}
                                                    />
                                                ))}
                                            </PermissionCard>
                                        );
                                    })}

                                    {shownStages.length > 0 && (
                                        <PermissionCard
                                            icon={GitBranch}
                                            title="Pipeline stages"
                                            description="Stages this role can move cards into, in pipeline order."
                                            granted={stages.filter((s) => perms.includes(s.permission)).length}
                                            total={stages.length}
                                            onAll={() => setMany(role, shownStages.map((s) => s.permission), true)}
                                            onNone={() => setMany(role, shownStages.map((s) => s.permission), false)}
                                        >
                                            {shownStages.map((s) => (
                                                <PermissionRow
                                                    key={s.id}
                                                    step={stages.indexOf(s) + 1}
                                                    title={s.name}
                                                    code={s.permission}
                                                    checked={perms.includes(s.permission)}
                                                    onChange={() => toggle(role, s.permission)}
                                                />
                                            ))}
                                        </PermissionCard>
                                    )}
                                </div>
                            )}

                            {stages.length === 0 && !term && filter === 'all' && (
                                <p className="text-xs text-slate-500">No pipeline stages yet. Add stages in the pipeline setup to control who can move cards.</p>
                            )}

                            {/* Unsaved changes bar */}
                            {isDirty(role) && (
                                <div className="sticky bottom-4 z-10 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-lg">
                                    <p className="flex items-center gap-2 text-sm text-slate-700">
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        <span>
                                            <b className="font-semibold">{changedCount(role)}</b> unsaved {changedCount(role) === 1 ? 'change' : 'changes'} to{' '}
                                            <b className="font-semibold">{role.name}</b>
                                        </span>
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => discard(role)}>Discard</Button>
                                        <Button variant="brand" onClick={() => save(role)}>Save changes</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
                            <p className="text-sm font-semibold text-slate-900">No roles yet</p>
                            <p className="mt-1 text-sm text-slate-500">Click "New role" to create the first one.</p>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}