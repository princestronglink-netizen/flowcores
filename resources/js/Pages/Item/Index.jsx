// resources/js/Pages/Item/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import { Button } from '@/Components/ui/Button';
import { Head, Link } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    PackagePlus,
    Pencil,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cx, inputCls } from '@/Components/ui/kit';

const PILL = {
    out: 'bg-red-50 text-red-700 ring-red-200',
    low: 'bg-amber-50 text-amber-700 ring-amber-200',
    ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const STATUS_LABEL = { out: 'Out of stock', low: 'Low stock', ok: 'In stock' };

const rowGrid =
    'grid items-center gap-3 grid-cols-[28px_minmax(0,1fr)_72px_64px] lg:grid-cols-[28px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.8fr)_80px_70px]';

const variantGrid = 'md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_110px_minmax(0,1.8fr)]';

const specOf = (v) => [v.unit_of_measure, v.size].filter(Boolean).join(' · ') || '—';
const initials = (name) => (name || '?').trim().slice(0, 2).toUpperCase();

function Stat({ label, value, tone = 'text-slate-900', onClick, active }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                'rounded-lg border bg-white px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40',
                active ? 'border-[#667292] ring-1 ring-[#667292]' : 'border-slate-200',
            )}
        >
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={cx('mt-1 text-2xl font-semibold tabular-nums', tone)}>{value}</p>
        </button>
    );
}

export default function Index({ items, categories = [] }) {
    const [q, setQ] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [tab, setTab] = useState('all'); // all | restock | out
    const [openIds, setOpenIds] = useState(() => new Set());
    const [deletingItem, setDeletingItem] = useState(null);
    const stockOf = (v) => Number(v.stock);
    // Status is computed on the server from the 30-day demand (MOQ).
    const statusOf = (v) => v.stock_status ?? 'ok';

    const enriched = useMemo(
        () =>
            items.map((item) => {
                const variants = item.brands.flatMap((b) => b.variants);
                const total = variants.reduce((s, v) => s + stockOf(v), 0);
                const outCount = variants.filter((v) => statusOf(v) === 'out').length;
                const lowCount = variants.filter((v) => statusOf(v) === 'low').length;
                return {
                    item,
                    variants,
                    total,
                    outCount,
                    lowCount,
                    needs: outCount + lowCount,
                };
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [items],
    );

    const restockCount = enriched.filter((e) => e.needs > 0).length;
    const outItemCount = enriched.filter((e) => e.outCount > 0).length;

    const rows = enriched.filter(({ item, needs, outCount }) => {
        if (tab === 'restock' && needs === 0) return false;
        if (tab === 'out' && outCount === 0) return false;
        if (categoryFilter) {
            if (categoryFilter === 'none' ? item.item_category_id : String(item.item_category_id) !== categoryFilter) return false;
        }
        const term = q.trim().toLowerCase();
        if (!term) return true;
        const hay = [item.item_name, item.category?.category_name, ...item.brands.map((b) => b.brand_name)]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return hay.includes(term);
    });

    const allOpen = rows.length > 0 && rows.every((r) => openIds.has(r.item.id));
    const toggle = (id) =>
        setOpenIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const toggleAll = () => setOpenIds(allOpen ? new Set() : new Set(rows.map((r) => r.item.id)));

    return (
        <AuthenticatedLayout header={<PageHeading title="Items" subtitle="Your catalog, with live stock levels." />}>
            <Head title="Items" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        <Link href={route('stock-in.index')}>
                            <Button variant="outline">
                                <PackagePlus />
                                Stock in
                            </Button>
                        </Link>
                        <Link href={route('stock-adjust.index')}>
                            <Button variant="outline">
                                <SlidersHorizontal />
                                Adjust stock
                            </Button>
                        </Link>
                        <Link href={route('items.create')}>
                            <Button variant="brand">
                                <Plus />
                                New item
                            </Button>
                        </Link>
                    </PageToolbar>
                }
            >
                {/* Overview */}
                <div className="grid grid-cols-1 gap-3 border-b border-slate-200 px-5 py-4 sm:grid-cols-3">
                    <Stat label="All items" value={items.length} active={tab === 'all'} onClick={() => setTab('all')} />
                    <Stat
                        label="Needs restocking"
                        value={restockCount}
                        tone={restockCount > 0 ? 'text-amber-700' : 'text-slate-900'}
                        active={tab === 'restock'}
                        onClick={() => setTab('restock')}
                    />
                    <Stat
                        label="Out of stock"
                        value={outItemCount}
                        tone={outItemCount > 0 ? 'text-red-700' : 'text-slate-900'}
                        active={tab === 'out'}
                        onClick={() => setTab('out')}
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search item, brand or category"
                            aria-label="Search items"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className={cx(inputCls, 'pl-9')}
                        />
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        aria-label="Filter by category"
                        className={cx(inputCls, 'w-48')}
                    >
                        <option value="">All categories</option>
                        <option value="none">Uncategorized</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.category_name}</option>
                        ))}
                    </select>

                    <p className="text-xs text-slate-500">
                        Showing {rows.length} of {items.length}
                    </p>

                    <button type="button" onClick={toggleAll} className="ml-auto text-xs font-medium text-slate-700 hover:underline">
                        {allOpen ? 'Collapse all' : 'Expand all'}
                    </button>
                </div>

                {/* Column headers */}
                <div className={cx(rowGrid, 'border-y border-slate-200 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500')}>
                    <span />
                    <span>Item</span>
                    <span className="hidden lg:block">Category</span>
                    <span className="hidden lg:block">Sizes &amp; stock</span>
                    <span className="text-right">Total</span>
                    <span />
                </div>

                {rows.length === 0 ? (
                    <div className="py-14 text-center">
                        <p className="text-sm font-semibold text-slate-900">
                            {tab === 'restock' ? 'Nothing needs restocking' : tab === 'out' ? 'Nothing is out of stock' : 'No items found'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">Try a different filter or search.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {rows.map(({ item, variants, total, needs }) => {
                            const open = openIds.has(item.id);
                            const multiBrand = item.brands.length > 1;
                            const chips = item.brands.flatMap((b) =>
                                b.variants.map((v) => ({
                                    id: v.id,
                                    label: multiBrand ? `${b.brand_name} ${specOf(v)}` : specOf(v),
                                    stock: stockOf(v),
                                    status: statusOf(v),
                                })),
                            );
                            const shown = chips.slice(0, 3);
                            const totalStatus = total <= 0 ? 'out' : needs > 0 ? 'low' : 'ok';

                            return (
                                <li key={item.id}>
                                    <div className={cx(rowGrid, 'px-5 py-3', open && 'bg-slate-50')}>
                                        <button
                                            type="button"
                                            onClick={() => toggle(item.id)}
                                            aria-expanded={open}
                                            aria-label={open ? `Hide ${item.item_name}` : `Show ${item.item_name}`}
                                            className="flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40"
                                        >
                                            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                        </button>

                                        <button type="button" onClick={() => toggle(item.id)} className="flex min-w-0 items-center gap-3 text-left">
                                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                                                {initials(item.item_name)}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-medium text-slate-900">{item.item_name}</span>
                                                <span className="block truncate text-xs text-slate-500 lg:hidden">
                                                    {item.category?.category_name ?? 'Uncategorized'}
                                                </span>
                                            </span>
                                        </button>

                                        <span className="hidden lg:block">
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                                                {item.category?.category_name ?? 'Uncategorized'}
                                            </span>
                                        </span>

                                        <div className="hidden flex-wrap gap-1.5 lg:flex">
                                            {chips.length === 0 && <span className="text-xs text-slate-400">—</span>}
                                            {shown.map((c) => (
                                                <span
                                                    key={c.id}
                                                    className={cx(
                                                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset',
                                                        c.status === 'ok' ? 'bg-slate-100 text-slate-600 ring-slate-200' : PILL[c.status],
                                                    )}
                                                >
                                                    <b className="font-semibold">{c.label}</b>
                                                    <span className="tabular-nums">{c.stock}</span>
                                                </span>
                                            ))}
                                            {chips.length > shown.length && (
                                                <span className="px-1 text-xs text-slate-500">+{chips.length - shown.length} more</span>
                                            )}
                                        </div>

                                        <span className="text-right">
                                            <span
                                                title={STATUS_LABEL[totalStatus]}
                                                className={cx('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset', PILL[totalStatus])}
                                            >
                                                {total}
                                            </span>
                                        </span>

                                        <span className="flex justify-end">
                                            <Link href={route('items.edit', item.id)}>
                                                <Button variant="outline">Edit</Button>
                                            </Link>
                                        </span>
                                    </div>

                                    {/* Expanded panel */}
                                    {open && (
                                        <div className="bg-slate-50 px-5 pb-4">
                                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{item.item_name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {variants.length} {variants.length === 1 ? 'size' : 'sizes'} · {total} in stock
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingItem(item)}
                                                            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                            Delete item
                                                        </button>
                                                        <Link href={route('items.edit', item.id)}>
                                                            <Button variant="outline">
                                                                <Pencil className="size-3.5" />
                                                                Edit details
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>

                                                <div className={cx('hidden gap-3 border-y border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500 md:grid', variantGrid)}>
                                                    <span>Size</span>
                                                    <span>Stock</span>
                                                    <span title="Total ordered in the last 30 days">MOQ (30 days)</span>
                                                    <span className="text-right">Actions</span>
                                                </div>

                                                {item.brands.length === 0 && (
                                                    <p className="px-4 py-4 text-xs text-slate-500">No brands or sizes yet. Use “Edit details” to add them.</p>
                                                )}

                                                {item.brands.map((b) => (
                                                    <div key={b.id}>
                                                        {multiBrand && (
                                                            <p className="border-b border-slate-100 bg-slate-50/60 px-4 py-1.5 text-xs font-semibold text-slate-600">
                                                                {b.brand_name}
                                                            </p>
                                                        )}
                                                        <ul className="divide-y divide-slate-100">
                                                            {b.variants.map((v) => {
                                                                const st = statusOf(v);
                                                                return (
                                                                    <li key={v.id} className={cx('grid grid-cols-1 gap-2 px-4 py-3 md:items-center md:gap-3', variantGrid)}>
                                                                        <span>
                                                                            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                                                                {specOf(v)}
                                                                            </span>
                                                                        </span>
                                                                        <span className="flex items-center gap-2">
                                                                            <span className={cx('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset', PILL[st])}>
                                                                                {stockOf(v)}
                                                                            </span>
                                                                            {st !== 'ok' && <span className="text-xs text-slate-500">{STATUS_LABEL[st]}</span>}
                                                                        </span>
                                                                        <span
                                                                            className="text-sm font-semibold tabular-nums text-slate-700"
                                                                            title="Total ordered in the last 30 days"
                                                                        >
                                                                            {Number(v.moq) > 0 ? v.moq : '—'}
                                                                        </span>
                                                                        <span className="flex flex-wrap justify-start gap-2 md:justify-end">
                                                                            <Link href={route('stock-adjust.index', { variant: v.id })}>
                                                                                <Button type="button" variant="outline">
                                                                                    <SlidersHorizontal className="size-3.5" />
                                                                                    Adjust
                                                                                </Button>
                                                                            </Link>
                                                                        </span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </PageCard>

            <ConfirmDelete
                show={Boolean(deletingItem)}
                onClose={() => setDeletingItem(null)}
                deleteUrl={deletingItem ? route('items.destroy', deletingItem.id) : null}
                itemLabel={deletingItem ? `"${deletingItem.item_name}" and all of its brands and variants` : 'this item'}
                title="Delete item?"
            />
        </AuthenticatedLayout>
    );
}