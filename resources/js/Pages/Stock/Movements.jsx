import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import { Head, router } from '@inertiajs/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { useState } from 'react';
import { reasonLabel } from '@/Components/Pipeline/returnReasons';

const TYPE_STYLES = {
    opening: 'bg-slate-100 text-slate-700',
    stock_in: 'bg-teal-100 text-teal-700',
    delivery: 'bg-red-100 text-red-700',
    return: 'bg-emerald-100 text-emerald-700',
    write_off: 'bg-amber-100 text-amber-700',
    adjustment: 'bg-sky-100 text-sky-700',
};

const ADJUST_LABELS = {
    received: 'Stock received',
    count_correction: 'Count correction',
};

const when = (v) => new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const variantLabel = (m) => {
    const v = m.variant;
    if (!v) return '—';
    const spec = [v.unit_of_measure, v.size].filter(Boolean).join(' · ');
    return `${v.brand?.item?.item_name ?? 'Item'} — ${v.brand?.brand_name ?? ''}${spec ? ` (${spec})` : ''}`;
};

export default function Movements({ movements, filters, types }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [type, setType] = useState(filters.type ?? '');

    const apply = (next = {}) =>
        router.get(route('stock-movements.index'), { search, type, ...next }, { preserveState: true, replace: true });

    const controlClass =
        'rounded-md border border-[#bccad6] px-3 py-2 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#8d9db6]/40';

    return (
        <AuthenticatedLayout header={<PageHeading title="Stock Ledger" subtitle="Every change to stock, who made it and why." />}>
            <Head title="Stock Ledger" />

            <PageCard
                toolbar={
                    <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                        <input
                            type="search"
                            placeholder="Search item or brand"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && apply()}
                            className={`w-64 ${controlClass}`}
                        />
                        <select
                            value={type}
                            onChange={(e) => {
                                setType(e.target.value);
                                apply({ type: e.target.value });
                            }}
                            className={controlClass}
                        >
                            <option value="">All movements</option>
                            {Object.entries(types).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <button type="button" onClick={() => apply()} className="rounded-md bg-[#667292] px-3 py-2 text-sm font-medium text-white hover:bg-[#3a4157]">
                            Search
                        </button>
                    </div>
                }
            >
                <div className="p-5">
                    {movements.data.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No stock movements match your filters.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>When</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Movement</TableHead>
                                    <TableHead className="text-right">Change</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.data.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="whitespace-nowrap text-xs">{when(m.created_at)}</TableCell>
                                        <TableCell className="font-medium">{variantLabel(m)}</TableCell>
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[m.type] ?? 'bg-slate-100 text-slate-700'}`}>
                                                {types[m.type] ?? m.type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                            {m.written_off > 0 && (
                                                <span className="block text-xs font-normal text-amber-700">{m.written_off} not restocked</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                                            {m.stock_before} → {m.stock_after}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {[m.transaction?.name ?? m.reference, m.reason && (ADJUST_LABELS[m.reason] ?? reasonLabel(m.reason)), m.note]
                                                .filter(Boolean)
                                                .join(' · ') || '—'}
                                        </TableCell>
                                        <TableCell className="text-xs">{m.user?.name ?? '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {movements.last_page > 1 && (
                        <div className="mt-4 flex flex-wrap justify-end gap-1">
                            {movements.links.map((l, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={!l.url}
                                    onClick={() => router.get(l.url, {}, { preserveState: true })}
                                    className={`rounded-md border px-3 py-1.5 text-xs ${
                                        l.active ? 'border-[#667292] bg-[#667292] text-white' : 'border-[#bccad6] text-[#667292] hover:bg-[#eef1f5]'
                                    } disabled:opacity-40`}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </PageCard>
        </AuthenticatedLayout>
    );
}