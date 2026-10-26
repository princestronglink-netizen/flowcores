// resources/js/Pages/Stock/Adjust.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import StockToast from '@/Components/Pipeline/StockToast';
import ConfirmModal from '@/Components/ConfirmationModal/ConfirmModal';
import { Button } from '@/Components/ui/Button';
import { Banner, Field, IconButton, Panel, SummaryLine, cx, input } from '@/Components/ui/kit';
import { ADJUST_REASONS_IN, ADJUST_REASONS_OUT, reasonLabel } from '@/Components/Stock/stockReasons';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarX,
    ClipboardCheck,
    MoreHorizontal,
    PackageMinus,
    PackagePlus,
    PackageSearch,
    PackageX,
    Plus,
    SlidersHorizontal,
    Trash2,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const REASON_ICONS = {
    count_correction: ClipboardCheck,
    received: PackagePlus,
    damaged: PackageX,
    defective: AlertTriangle,
    expired: CalendarX,
    lost: PackageSearch,
    internal: Users,
    other: MoreHorizontal,
};

const DIRECTIONS = [
    {
        value: 'in',
        label: 'Add stock',
        hint: 'Count was too low, or stock was found',
        icon: PackagePlus,
        active: 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400',
        iconActive: 'text-emerald-600',
    },
    {
        value: 'out',
        label: 'Remove stock',
        hint: 'Count was too high, or stock is unusable',
        icon: PackageMinus,
        active: 'border-red-400 bg-red-50 ring-1 ring-red-400',
        iconActive: 'text-red-600',
    },
];

const reasonsFor = (direction) => (direction === 'in' ? ADJUST_REASONS_IN : ADJUST_REASONS_OUT);
const defaultReason = (direction) => reasonsFor(direction)[0].value;

const emptyLine = (variantId = '') => ({ item_variant_id: variantId, quantity: '' });

const when = (v) => new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function Adjust({ variants = [], recent = [], preselect = null }) {
    const { flash } = usePage().props;
    const [toast, setToast] = useState(null);
    const [confirming, setConfirming] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        direction: 'in',
        reason: defaultReason('in'),
        note: '',
        items: [emptyLine(preselect ?? '')],
    });

    useEffect(() => {
        if (flash?.stock) setToast(flash.stock);
    }, [flash?.stock]);

    const isIn = data.direction === 'in';
    const byId = useMemo(() => Object.fromEntries(variants.map((v) => [String(v.id), v])), [variants]);
    // Opened from one item's Adjust button (?variant=ID) => SINGLE mode. Opened from the toolbar => BULK mode.
    const single = Boolean(preselect) && Boolean(byId[String(preselect)]);
    const items = data.items;
    const usedIds = new Set(items.map((i) => String(i.item_variant_id)).filter(Boolean));

    const pickDirection = (direction) => {
        if (direction === data.direction) return;
        setData((prev) => ({ ...prev, direction, reason: defaultReason(direction) }));
        clearErrors();
    };

    const setLine = (index, patch) => setData('items', items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    const addLine = () => setData('items', [...items, emptyLine()]);
    const removeLine = (index) => setData('items', items.filter((_, i) => i !== index));

    const lines = items.map((row) => {
        const variant = byId[String(row.item_variant_id)];
        const qty = Number(row.quantity) || 0;
        return { row, variant, qty, over: !isIn && Boolean(variant) && qty > variant.stock };
    });
    const validLines = lines.filter((l) => l.variant && l.qty > 0);
    const totalUnits = validLines.reduce((s, l) => s + l.qty, 0);
    const hasOver = lines.some((l) => l.over);
    const needsNote = data.reason === 'other' && data.note.trim() === '';
    const canSubmit = validLines.length > 0 && !hasOver && !needsNote;
    const reason = reasonsFor(data.direction).find((r) => r.value === data.reason);
    const direction = DIRECTIONS.find((d) => d.value === data.direction);

    const hint = hasOver
        ? 'One or more quantities are higher than what is in stock.'
        : needsNote
          ? 'Add a short note to explain "Other".'
          : validLines.length === 0
            ? 'Pick an item and enter a quantity.'
            : '';

    const submit = (e) => {
        e.preventDefault();
        if (canSubmit) setConfirming(true);
    };

    const save = () => {
        transform((d) => ({
            ...d,
            items: d.items.filter((r) => r.item_variant_id && Number(r.quantity) > 0),
        }));
        post(route('stock-adjust.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                clearErrors();
                setConfirming(false);
            },
            onError: () => setConfirming(false),
        });
    };

    const variantName = (m) => {
        const v = m.variant;
        const spec = [v?.unit_of_measure, v?.size].filter(Boolean).join(' · ');
        return `${v?.brand?.item?.item_name ?? 'Item'} — ${v?.brand?.brand_name ?? ''}${spec ? ` (${spec})` : ''}`;
    };

    const signed = (n) => (n > 0 ? `+${n}` : String(n));

    return (
        <AuthenticatedLayout
            header={
                <PageHeading
                    title={single ? 'Adjust Item' : 'Adjust Stock'}
                    subtitle={
                        single
                            ? 'Fix the count for this one item: add or remove stock.'
                            : 'Fix the count for several items at once: add stock for a miscount, or remove damaged and missing stock.'
                    }
                />
            }
        >
            <Head title="Adjust Stock" />

            <form onSubmit={submit} noValidate className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="min-w-0 space-y-5">
                        {/* 1. Add or remove */}
                        <Panel title="1 · What do you want to do?" description="Add stock or remove stock." icon={SlidersHorizontal}>
                            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Action">
                                {DIRECTIONS.map((d) => {
                                    const Icon = d.icon;
                                    const active = data.direction === d.value;
                                    return (
                                        <button
                                            key={d.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            onClick={() => pickDirection(d.value)}
                                            className={cx(
                                                'flex items-start gap-3 rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40',
                                                active ? d.active : 'border-slate-200 hover:bg-slate-50',
                                            )}
                                        >
                                            <Icon className={cx('size-5', active ? d.iconActive : 'text-slate-400')} />
                                            <span>
                                                <span className="block text-sm font-medium text-slate-900">{d.label}</span>
                                                <span className="mt-0.5 block text-xs text-slate-500">{d.hint}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Panel>

                        {/* 2. Reason */}
                        <Panel title="2 · Why?" description="This is saved with every line in the stock ledger.">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Reason">
                                {reasonsFor(data.direction).map((r) => {
                                    const Icon = REASON_ICONS[r.value] ?? MoreHorizontal;
                                    const active = data.reason === r.value;
                                    return (
                                        <button
                                            key={r.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            onClick={() => setData('reason', r.value)}
                                            className={cx(
                                                'flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40',
                                                active ? 'border-[#667292] bg-slate-50 ring-1 ring-[#667292]' : 'border-slate-200 hover:bg-slate-50',
                                            )}
                                        >
                                            <Icon className={cx('size-5', active ? 'text-[#667292]' : 'text-slate-400')} />
                                            <span>
                                                <span className="block text-sm font-medium text-slate-900">{r.label}</span>
                                                <span className="mt-0.5 block text-xs text-slate-500">{r.hint}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.reason && <p className="mt-2 text-xs text-red-600">{errors.reason}</p>}
                        </Panel>

                        {/* 3. Items */}
                        {single ? (
                            <Panel title="3 · Quantity" description="You are adjusting one item." bodyClass="p-0">
                                {typeof errors.items === 'string' && (
                                    <div className="p-4 pb-0">
                                        <Banner tone="error">{errors.items}</Banner>
                                    </div>
                                )}

                                {lines.map(({ row, variant, qty, over }, index) => {
                                    if (!variant) return null;
                                    const lineError = errors[`items.${index}.item_variant_id`] || errors[`items.${index}.quantity`];
                                    return (
                                        <div key={index} className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-start">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{variant.label}</p>
                                                <p className={cx('mt-1 text-xs', over ? 'font-medium text-red-600' : 'text-slate-500')}>
                                                    {over
                                                        ? `Only ${variant.stock} in stock.`
                                                        : qty > 0
                                                          ? `In stock: ${variant.stock} → ${isIn ? variant.stock + qty : variant.stock - qty} after ${isIn ? 'adding' : 'removing'}`
                                                          : `In stock: ${variant.stock}`}
                                                </p>
                                                {lineError && <p className="mt-1 text-xs text-red-600">{lineError}</p>}
                                            </div>
                                            <div>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={!isIn ? variant.stock : undefined}
                                                    step={1}
                                                    placeholder="Qty"
                                                    aria-label={isIn ? 'Quantity to add' : 'Quantity to remove'}
                                                    autoFocus
                                                    value={row.quantity}
                                                    onChange={(e) => setLine(index, { quantity: e.target.value })}
                                                    className={cx(input(over), 'text-right')}
                                                />
                                                {!isIn && variant.stock > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setLine(index, { quantity: variant.stock })}
                                                        className="mt-1 text-xs font-medium text-[#667292] hover:underline"
                                                    >
                                                        All ({variant.stock})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="border-t border-slate-100 px-5 py-3">
                                    <Link href={route('stock-adjust.index')} className="text-xs font-medium text-[#667292] hover:underline">
                                        Adjust several items instead
                                    </Link>
                                </div>
                            </Panel>
                        ) : (
                            <Panel
                                title="3 · Which items?"
                                description="You can adjust several items in one go."
                                bodyClass="p-0"
                                actions={
                                    <Button type="button" variant="outline" onClick={addLine}>
                                        <Plus />
                                        Add item
                                    </Button>
                                }
                            >
                                {typeof errors.items === 'string' && (
                                    <div className="p-4 pb-0">
                                        <Banner tone="error">{errors.items}</Banner>
                                    </div>
                                )}
    
                                <div className="mt-4 hidden grid-cols-[minmax(0,1fr)_140px_32px] gap-3 border-y border-slate-100 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500 sm:grid">
                                    <span>Item, brand and size</span>
                                    <span>{isIn ? 'Quantity to add' : 'Quantity to remove'}</span>
                                    <span />
                                </div>
    
                                <ul className="divide-y divide-slate-100">
                                    {lines.map(({ row, variant, qty, over }, index) => {
                                        const lineError = errors[`items.${index}.item_variant_id`] || errors[`items.${index}.quantity`];
                                        return (
                                            <li key={index} className="grid grid-cols-1 gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_140px_32px] sm:items-start">
                                                <div>
                                                    <select
                                                        aria-label="Item"
                                                        value={row.item_variant_id}
                                                        onChange={(e) => setLine(index, { item_variant_id: e.target.value, quantity: '' })}
                                                        className={input(lineError && !row.item_variant_id)}
                                                    >
                                                        <option value="" disabled>Select an item</option>
                                                        {variants.map((v) => (
                                                            <option
                                                                key={v.id}
                                                                value={v.id}
                                                                disabled={
                                                                    (!isIn && v.stock <= 0) ||
                                                                    (usedIds.has(String(v.id)) && String(v.id) !== String(row.item_variant_id))
                                                                }
                                                            >
                                                                {v.label} · {v.stock} in stock
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {variant && (
                                                        <p className={cx('mt-1 text-xs', over ? 'font-medium text-red-600' : 'text-slate-500')}>
                                                            {over
                                                                ? `Only ${variant.stock} in stock.`
                                                                : qty > 0
                                                                  ? `In stock: ${variant.stock} → ${isIn ? variant.stock + qty : variant.stock - qty} after ${isIn ? 'adding' : 'removing'}`
                                                                  : `In stock: ${variant.stock}`}
                                                        </p>
                                                    )}
                                                    {lineError && <p className="mt-1 text-xs text-red-600">{lineError}</p>}
                                                </div>
    
                                                <div>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={!isIn ? variant?.stock : undefined}
                                                        step={1}
                                                        placeholder="Qty"
                                                        aria-label={isIn ? 'Quantity to add' : 'Quantity to remove'}
                                                        disabled={!variant}
                                                        value={row.quantity}
                                                        onChange={(e) => setLine(index, { quantity: e.target.value })}
                                                        className={cx(input(over), 'text-right')}
                                                    />
                                                    {variant && !isIn && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setLine(index, { quantity: variant.stock })}
                                                            className="mt-1 text-xs font-medium text-[#667292] hover:underline"
                                                        >
                                                            All ({variant.stock})
                                                        </button>
                                                    )}
                                                </div>
    
                                                <div className="flex justify-end sm:h-9 sm:items-center">
                                                    {items.length > 1 && <IconButton icon={Trash2} label="Remove line" danger onClick={() => removeLine(index)} />}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Panel>
                        )}

                        {/* 4. Note */}
                        <Panel title="4 · Note" description={data.reason === 'other' ? 'Required when the reason is "Other".' : 'Optional, but helpful for audits.'}>
                            <Field label="Note" required={data.reason === 'other'} htmlFor="stock_adjust_note" error={errors.note}>
                                <input
                                    id="stock_adjust_note"
                                    type="text"
                                    maxLength={255}
                                    placeholder="e.g. Cycle count, aisle 3 · or warehouse audit"
                                    value={data.note}
                                    onChange={(e) => setData('note', e.target.value)}
                                    className={input(errors.note)}
                                />
                            </Field>
                        </Panel>

                        {/* Recent adjustments */}
                        <Panel title="Recent adjustments" description="The last 10 adjustments. Full history is in the Stock ledger.">
                            {recent.length === 0 ? (
                                <p className="text-sm text-slate-500">No adjustments yet. Entries will show up here.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {recent.map((m) => {
                                        const change = Number(m.stock_after) - Number(m.stock_before);
                                        return (
                                            <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium text-slate-900">{variantName(m)}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {reasonLabel(m.reason)}
                                                        {m.note ? ` · ${m.note}` : ''}
                                                        {m.user?.name ? ` · by ${m.user.name}` : ''} · {when(m.created_at)}
                                                    </p>
                                                </div>
                                                <span
                                                    className={cx(
                                                        'rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset',
                                                        change >= 0
                                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                            : 'bg-red-50 text-red-700 ring-red-200',
                                                    )}
                                                >
                                                    {signed(change)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Panel>
                    </div>

                    {/* Sticky summary */}
                    <aside className="xl:sticky xl:top-20">
                        <Panel title="Summary" description="Check this, then confirm.">
                            <dl className="space-y-3">
                                <SummaryLine label="Action">{direction?.label}</SummaryLine>
                                <SummaryLine label="Reason">{reason?.label}</SummaryLine>
                                <SummaryLine label="Items">{validLines.length}</SummaryLine>
                                <SummaryLine label={isIn ? 'Units added' : 'Units leaving stock'}>{totalUnits}</SummaryLine>
                            </dl>

                            {hint && <Banner tone="warning" className="mt-4">{hint}</Banner>}

                            <div className="mt-5">
                                <Button type="submit" variant="brand" className="w-full" disabled={processing || !canSubmit}>
                                    {totalUnits > 0
                                        ? `${isIn ? 'Add' : 'Remove'} ${totalUnits} ${totalUnits === 1 ? 'unit' : 'units'}`
                                        : isIn
                                          ? 'Add stock'
                                          : 'Remove stock'}
                                </Button>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                                Entries can't be edited later. If you make a mistake, make another adjustment to correct it.
                            </p>
                        </Panel>
                    </aside>
                </div>
            </form>

            <ConfirmModal
                show={confirming}
                onClose={() => !processing && setConfirming(false)}
                onConfirm={save}
                processing={processing}
                variant={isIn ? undefined : 'danger'}
                title={isIn ? 'Add this stock?' : 'Remove this stock?'}
                description={`${totalUnits} ${totalUnits === 1 ? 'unit' : 'units'} across ${validLines.length} ${validLines.length === 1 ? 'item' : 'items'} will be ${isIn ? 'added to' : 'taken out of'} stock. Reason: ${reason?.label}. This is recorded in the stock ledger.`}
                confirmLabel={processing ? 'Saving…' : isIn ? 'Add stock' : 'Remove stock'}
            />

            <StockToast message={toast} title="Stock adjusted" onClose={() => setToast(null)} />
        </AuthenticatedLayout>
    );
}