import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/Button';
import { cx } from '@/Components/ui/kit';
import { Check, GitBranch, KeyRound, Pencil, Plus, Trash2, Users, X } from 'lucide-react';

const sameSet = (a = [], b = []) =>
    a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

function Switch({ checked, onChange, label, disabled = false }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onChange}
            className={cx(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8d9db6] focus-visible:ring-offset-2',
                checked ? 'bg-[#667292]' : 'bg-slate-200',
                disabled && 'cursor-not-allowed opacity-60',
            )}
        >
            <span
                className={cx(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                    checked ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
            />
        </button>
    );
}

function Section({ icon: Icon, title, description, actions, children }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef1f5] text-[#667292]">
                        <Icon className="h-4 w-4" />
                    </span>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                        <p className="text-xs text-slate-500">{description}</p>
                    </div>
                </div>
                {actions}
            </header>
            <ul className="divide-y divide-slate-100">{children}</ul>
        </section>
    );
}

function Row({ title, step, checked, onChange, disabled }) {
    return (
        <li className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
                {step != null && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {step}
                    </span>
                )}
                <p className="truncate text-sm font-medium text-slate-900">{title}</p>
            </div>
            <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
        </li>
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

    const role = roles.find((r) => r.id === selectedId) ?? roles[0];
    const totalPermissions = general.length + stages.length;

    const current = (r) => draft[r.id] ?? r.permissions;
    const isDirty = (r) => draft[r.id] !== undefined && !sameSet(draft[r.id], r.permissions);

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

    const stageKeys = stages.map((s) => s.permission);
    const perms = role ? current(role) : [];
    const grantedCount = perms.length;

    return (
        <AuthenticatedLayout
            header={<PageHeading title="Roles & Permissions" subtitle="Decide what each role can see and which pipeline stages it can move cards into." />}
        >
            <Head title="Roles & Permissions" />

            <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4 sm:p-6">
                {(errors?.role || errors?.name) && (
                    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                        {errors.role ?? errors.name}
                    </p>
                )}

                <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
                    {/* ---------------- Roles list ---------------- */}
                    <aside className="rounded-xl border border-slate-200 bg-white lg:sticky lg:top-20">
                        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <h2 className="text-sm font-semibold text-slate-900">Roles</h2>
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
                            <form onSubmit={addRole} className="flex gap-2 border-b border-slate-100 p-3">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    placeholder="e.g. sales"
                                    aria-label="New role name"
                                    className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                                <Button type="submit" variant="brand">Add</Button>
                            </form>
                        )}

                        <ul className="space-y-1 p-2">
                            {roles.map((r) => {
                                const active = r.id === role?.id;
                                const count = current(r).length;

                                return (
                                    <li key={r.id}>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedId(r.id); setRenaming(false); }}
                                            aria-current={active ? 'true' : undefined}
                                            className={cx(
                                                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                                                active ? 'bg-[#eef1f5] ring-1 ring-inset ring-[#bccad6]' : 'hover:bg-slate-50',
                                            )}
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                                <KeyRound className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="truncate text-sm font-medium text-slate-900">{r.name}</span>
                                                    {isDirty(r) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />}
                                                </span>
                                                <span className="block text-xs text-slate-500">
                                                    {r.users_count} {r.users_count === 1 ? 'user' : 'users'} · {count} of {totalPermissions}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>

                    {/* ---------------- Selected role ---------------- */}
                    {role ? (
                        <div className="min-w-0 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef1f5] text-[#667292]">
                                        <KeyRound className="h-5 w-5" />
                                    </span>
                                    <div>
                                        {renaming ? (
                                            <form onSubmit={(e) => saveRename(e, role)} className="flex items-center gap-2">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    aria-label="Role name"
                                                    className="h-9 w-48 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                                                />
                                                <Button type="submit" variant="brand"><Check className="h-4 w-4" /> Save</Button>
                                                <Button type="button" variant="outline" onClick={() => setRenaming(false)}>Cancel</Button>
                                            </form>
                                        ) : (
                                            <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight text-slate-900">
                                                {role.name}
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
                                        <p className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{role.users_count} {role.users_count === 1 ? 'user' : 'users'}</span>
                                            <span>{grantedCount} of {totalPermissions} permissions</span>
                                        </p>
                                    </div>
                                </div>
                                <Button variant="outline" onClick={() => remove(role)}>
                                    <Trash2 className="h-4 w-4" /> Delete role
                                </Button>
                            </div>

                            <Section icon={KeyRound} title="General access" description="What this role can open and manage.">
                                {general.length === 0 && (
                                    <li className="px-5 py-6 text-center text-sm text-slate-500">No permissions found.</li>
                                )}
                                {general.map((g) => (
                                    <Row
                                        key={g.name}
                                        title={g.label}
                                        checked={perms.includes(g.name)}
                                        onChange={() => toggle(role, g.name)}
                                    />
                                ))}
                            </Section>

                            <Section
                                icon={GitBranch}
                                title="Pipeline stages"
                                description="The stages this role can move cards into, in pipeline order."
                                actions={
                                    stages.length > 0 && (
                                        <div className="flex gap-3 text-xs font-medium">
                                            <button type="button" onClick={() => setMany(role, stageKeys, true)} className="text-[#667292] hover:underline">Select all</button>
                                            <button type="button" onClick={() => setMany(role, stageKeys, false)} className="text-slate-500 hover:underline">Clear</button>
                                        </div>
                                    )
                                }
                            >
                                {stages.length === 0 && (
                                    <li className="px-5 py-6 text-center text-sm text-slate-500">No stages yet. Add stages in the pipeline setup.</li>
                                )}
                                {stages.map((s, i) => (
                                    <Row
                                        key={s.id}
                                        step={i + 1}
                                        title={s.name}
                                        checked={perms.includes(s.permission)}
                                        onChange={() => toggle(role, s.permission)}
                                    />
                                ))}
                            </Section>

                            {isDirty(role) && (
                                <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-lg">
                                    <p className="flex items-center gap-2 text-sm text-slate-700">
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        You have unsaved changes to <b className="font-semibold">{role.name}</b>.
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