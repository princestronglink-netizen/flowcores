import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PriorityPill, currency, cx, inputCls } from '@/Components/ui/kit';

const STATUS_TABS = [
    ['open', 'Open'],
    ['won', 'Won'],
    ['lost', 'Lost'],
    ['all', 'All'],
];

const statusStyle = {
    open: 'bg-sky-50 text-sky-700 ring-sky-200',
    won: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    lost: 'bg-red-50 text-red-700 ring-red-200',
};

export default function Index({ transactions }) {
    const [deleting, setDeleting] = useState(null);
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('open');
    const [priority, setPriority] = useState('');
    const [stage, setStage] = useState('');

    const counts = useMemo(() => {
        const c = { open: 0, won: 0, lost: 0, all: transactions.length };
        transactions.forEach((t) => {
            c[t.status] = (c[t.status] ?? 0) + 1;
        });
        return c;
    }, [transactions]);

    // Distinct stages found in the data, in pipeline order, for the stage filter.
    const stageOptions = useMemo(() => {
        const map = new Map();
        transactions.forEach((t) => {
            if (t.stage) map.set(t.stage.id, t.stage);
        });
        return [...map.values()].sort((a, b) => a.sort_order - b.sort_order);
    }, [transactions]);

    const rows = useMemo(() => {
        const term = q.trim().toLowerCase();
        return transactions.filter((t) => {
            if (status !== 'all' && t.status !== status) return false;
            if (priority && t.priority !== priority) return false;
            if (stage && String(t.stage?.id) !== stage) return false;
            if (!term) return true;
            const haystack = [
                t.name,
                t.client?.client_name,
                t.contact_person?.contact_person,
                t.stage?.stage_name,
                ...(t.items ?? []).map((i) => `${i.item_name} ${i.brand_name}`),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [transactions, q, status, priority, stage]);

    return (
        <AuthenticatedLayout header={<PageHeading title="Transactions" subtitle="Every deal, its client and its value." />}>
            <Head title="Transactions" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        <Link href={route('transactions.create')}>
                            <Button variant="brand">
                                <Plus />
                                New transaction
                            </Button>
                        </Link>
                    </PageToolbar>
                }
            >
                <div className="p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Status">
                            {STATUS_TABS.map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="tab"
                                    aria-selected={status === value}
                                    onClick={() => setStatus(value)}
                                    className={cx(
                                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
                                        status === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                                    )}
                                >
                                    {label}
                                    <span className="text-xs tabular-nums text-slate-400">{counts[value] ?? 0}</span>
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full sm:w-72">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                aria-label="Search transactions"
                                placeholder="Search name, client, stage or item"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className={cx(inputCls, 'pl-9')}
                            />
                        </div>

                        <select
                            aria-label="Filter by stage"
                            value={stage}
                            onChange={(e) => setStage(e.target.value)}
                            className={cx(inputCls, 'w-44')}
                        >
                            <option value="">All stages</option>
                            {stageOptions.map((s) => (
                                <option key={s.id} value={s.id}>{s.stage_name}</option>
                            ))}
                        </select>

                        <select
                            aria-label="Filter by priority"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className={cx(inputCls, 'w-40')}
                        >
                            <option value="">All priorities</option>
                            {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>

                        {(q || priority || stage) && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setQ('');
                                    setPriority('');
                                    setStage('');
                                }}
                            >
                                Clear filters
                            </Button>
                        )}
                    </div>

                    {rows.length === 0 ? (
                        <div className="py-14 text-center">
                            <p className="text-sm font-semibold text-slate-900">No transactions found</p>
                            <p className="mt-1 text-sm text-slate-500">Change the filters, or create a new transaction.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Transaction</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Pipeline stage</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Items</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>
                                            <p className="font-medium text-slate-900">{t.name || '—'}</p>
                                            <p
                                                className="max-w-xs truncate text-xs text-slate-500"
                                                title={(t.items ?? []).map((i) => `${i.item_name} — ${i.brand_name}`).join(', ')}
                                            >
                                                {(t.items ?? []).map((i) => i.item_name).join(', ') || 'No items'}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{t.client?.client_name ?? '—'}</p>
                                            <p className="text-xs text-slate-500">{t.contact_person?.contact_person ?? ''}</p>
                                        </TableCell>
                                        <TableCell>
                                            {t.stage ? (
                                                <span className="inline-flex rounded-full bg-[#eef1f5] px-2.5 py-0.5 text-xs font-medium text-[#3a4157] ring-1 ring-inset ring-[#bccad6]">
                                                    {t.stage.stage_name}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                            <p className="mt-0.5 text-xs text-slate-500">{t.pipeline?.pipeline_name ?? ''}</p>
                                        </TableCell>
                                        <TableCell>
                                            <PriorityPill value={t.priority} />
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={cx(
                                                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
                                                    statusStyle[t.status] ?? statusStyle.open,
                                                )}
                                            >
                                                {t.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{t.items?.length ?? 0}</TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">
                                            {t.amount != null ? currency(t.amount) : '—'}
                                        </TableCell>
                                        <TableCell className="flex justify-end gap-2 text-right">
                                            <Link href={route('transactions.edit', t.id)}>
                                                <Button variant="outline" size="icon" aria-label="Edit transaction">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="outline" size="icon" aria-label="Delete transaction" onClick={() => setDeleting(t)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </PageCard>

            <ConfirmDelete
                show={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                deleteUrl={deleting ? route('transactions.destroy', deleting.id) : null}
                itemLabel={deleting ? `"${deleting.name || 'this transaction'}"` : 'this transaction'}
                title="Delete transaction?"
            />
        </AuthenticatedLayout>
    );
}