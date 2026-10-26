import { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { currency } from './Board';
import {
    AlertTriangle,
    ArrowLeft,
    Ban,
    CheckCircle2,
    History,
    Minus,
    PackageCheck,
    PackageX,
    Plus,
    RefreshCw,
    Truck,
    Undo2,
} from 'lucide-react';
import { RETURN_REASONS, reasonLabel } from './returnReasons';

/* ------------------------------ helpers ------------------------------ */

const deliveredOf = (line) => Number(line.delivered_quantity ?? 0);
const remainingOf = (line) => Math.max(0, line.quantity - deliveredOf(line));
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const formatDate = (value) =>
    value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

// One token per opened modal. The server ignores a second request with the same token.
const newToken = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const CONDITIONS = [
    { value: 'good', title: 'All good', hint: 'Can be resold', Icon: PackageCheck },
    { value: 'partial', title: 'Some damaged', hint: 'Part can be resold', Icon: AlertTriangle },
    { value: 'bad', title: 'All damaged', hint: "Can't be resold", Icon: PackageX },
];

/** How many units of a row will NOT go back on the shelf. */
const notRestockedOf = (row) => {
    const qty = Number(row?.quantity) || 0;
    if (row?.condition === 'bad') return qty;
    if (row?.condition === 'partial') return Math.min(Number(row.written_off) || 0, qty);
    return 0;
};

/** First thing wrong with a return row, or null. */
const rowProblem = (row, line) => {
    const qty = Number(row?.quantity) || 0;
    if (qty <= 0) return null;
    if (row.condition === 'partial' && !(Number(row.written_off) > 0)) {
        return `Enter how many ${line.item_name} units are damaged.`;
    }
    if (notRestockedOf(row) > 0 && !row.reason) {
        return `Pick a reason for the damaged ${line.item_name} units.`;
    }
    return null;
};

const selectClass =
    'block w-full rounded-md border border-[#bccad6] px-3 py-2 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#8d9db6]/40';

const stepBtn =
    'flex size-9 items-center justify-center text-[#667292] transition hover:bg-[#eef1f5] focus:outline-none focus-visible:bg-[#eef1f5] disabled:pointer-events-none disabled:opacity-30';

/* ----------------------------- small parts ----------------------------- */

function QtyStepper({ value, max, onChange, label, disabled = false }) {
    const n = Number(value) || 0;
    const set = (v) => onChange(clamp(v, 0, max));

    return (
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#bccad6] bg-white">
            <button type="button" className={stepBtn} onClick={() => set(n - 1)} disabled={disabled || n <= 0} aria-label={`Decrease ${label}`}>
                <Minus className="size-4" />
            </button>
            <input
                type="number"
                inputMode="numeric"
                min={0}
                max={max}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value === '' ? '' : clamp(parseInt(e.target.value, 10) || 0, 0, max))}
                onFocus={(e) => e.target.select()}
                aria-label={label}
                className="h-9 w-14 border-x border-[#bccad6] text-center text-sm font-semibold tabular-nums text-[#3a4157] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#8d9db6]/40 disabled:bg-muted [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button type="button" className={stepBtn} onClick={() => set(n + 1)} disabled={disabled || n >= max} aria-label={`Increase ${label}`}>
                <Plus className="size-4" />
            </button>
        </div>
    );
}

function Choice({ active, onClick, Icon, title, hint }) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={active}
            onClick={onClick}
            className={`flex flex-1 items-start gap-2.5 rounded-lg border p-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40 ${
                active ? 'border-[#667292] bg-[#eef1f5] ring-1 ring-[#667292]' : 'border-[#bccad6] hover:bg-[#eef1f5]/60'
            }`}
        >
            <Icon className={`mt-0.5 size-4 shrink-0 ${active ? 'text-[#667292]' : 'text-[#8d9db6]'}`} />
            <span className="min-w-0">
                <span className="block text-sm font-medium text-[#3a4157]">{title}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
        </button>
    );
}

function Progress({ value, max, tone = 'bg-[#667292]' }) {
    const pct = max > 0 ? clamp(Math.round((value / max) * 100), 0, 100) : 0;
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-[#eef1f5]" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
            <div className={`h-full rounded-full transition-all duration-300 ${tone}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

function Tile({ tone, Icon, value, label }) {
    const tones = {
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        amber: 'border-amber-300 bg-amber-50 text-amber-700',
        sky: 'border-sky-200 bg-sky-50 text-sky-700',
        mute: 'border-[#bccad6] bg-[#eef1f5] text-[#667292]',
    };
    return (
        <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${tones[tone]}`}>
            <Icon className="size-5 shrink-0" />
            <div className="min-w-0">
                <p className="text-lg font-semibold leading-none tabular-nums">{value}</p>
                <p className="mt-1 truncate text-xs">{label}</p>
            </div>
        </div>
    );
}

function Banner({ tone = 'error', children }) {
    const tones = {
        error: 'border-red-300 bg-red-50 text-red-800',
        warning: 'border-amber-300 bg-amber-50 text-amber-800',
        info: 'border-[#bccad6] bg-[#eef1f5] text-[#3a4157]',
    };
    return (
        <div role={tone === 'error' ? 'alert' : undefined} className={`rounded-lg border px-3 py-2.5 text-sm ${tones[tone]}`}>
            {children}
        </div>
    );
}

/* ------------------------------- modal -------------------------------- */

/**
 * mode         'deliver' | 'return' | 'history'
 * movesBackTo  stage name shown when a return will send the card back (or null)
 * onClose      after a successful save
 * onCancel     when the user just closes the modal (nothing happens to the transaction)
 *
 * Return rows, per line:
 *   condition  good | partial | bad   → how many go back on the shelf vs. are written off
 *   replace    true | false           → units stay owed (replacement) or the order shrinks
 */
export default function DeliveryModal({ transaction, mode = 'deliver', movesBackTo = null, onClose, onCancel }) {
    const isHistory = mode === 'history';
    const isReturn = mode === 'return';
    const lines = transaction?.items ?? [];

    const [step, setStep] = useState('edit'); // returns only: 'edit' → 'review'
    const reviewing = isReturn && step === 'review';

    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        note: '',
        request_token: '',
        items: [],
    });

    const maxFor = (line) => (isReturn ? deliveredOf(line) : remainingOf(line));

    const buildRows = (fill, condition = 'good') =>
        lines.map((line) => ({
            transaction_item_id: line.id,
            quantity: fill ? maxFor(line) : 0,
            condition,
            written_off: 0,
            reason: '',
            replace: true,
        }));

    useEffect(() => {
        if (!transaction) return;
        setData({ note: '', request_token: newToken(), items: buildRows(!isReturn && !isHistory) }); // deliver is prefilled with what remains
        setStep('edit');
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transaction?.id, mode]);

    /* ---- row editing ---- */
    const patchRow = (index, patch) =>
        setData('items', data.items.map((row, i) => (i === index ? { ...row, ...patch } : row)));

    const setQty = (index, qty) => {
        const row = data.items[index];
        const patch = { quantity: qty };
        if (row.condition === 'partial') patch.written_off = Math.min(Number(row.written_off) || 0, Number(qty) || 0);
        patchRow(index, patch);
    };

    const setCondition = (index, condition) => {
        const row = data.items[index];
        const qty = Number(row.quantity) || 0;
        patchRow(index, {
            condition,
            written_off: condition === 'partial' ? clamp(Number(row.written_off) || 1, 1, Math.max(qty, 1)) : 0,
            reason: condition === 'good' ? '' : row.reason,
        });
    };

    const setAll = (fill, condition) => setData('items', buildRows(fill, condition));

    /* ---- live summary ---- */
    const ordered = lines.reduce((s, l) => s + l.quantity, 0);
    const delivered = lines.reduce((s, l) => s + deliveredOf(l), 0);
    const now = data.items.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const writtenOff = data.items.reduce((s, r) => s + notRestockedOf(r), 0);
    const restocked = now - writtenOff;

    // Units returned with "No replacement" shrink the order.
    const cancelled = isReturn
        ? data.items.reduce((s, r) => s + (r.replace === false ? Number(r.quantity) || 0 : 0), 0)
        : 0;
    const reduction = isReturn
        ? lines.reduce((s, l, i) => {
              const r = data.items[i];
              return r && r.replace === false ? s + (Number(r.quantity) || 0) * Number(l.unit_price || 0) : s;
          }, 0)
        : 0;

    const orderedAfter = ordered - cancelled;
    const after = isReturn ? delivered - now : delivered + now;
    const willReopen = isReturn && after < orderedAfter; // something is still owed

    // Two lines can share a variant, so add them up before comparing with stock.
    const needByVariant = {};
    const stockOf = {};
    lines.forEach((l, i) => {
        const qty = Number(data.items[i]?.quantity) || 0;
        if (l.variant?.stock != null) stockOf[l.item_variant_id] = Number(l.variant.stock);
        if (qty > 0) needByVariant[l.item_variant_id] = (needByVariant[l.item_variant_id] || 0) + qty;
    });
    const isShort = (l) =>
        !isReturn && !isHistory && stockOf[l.item_variant_id] != null && (needByVariant[l.item_variant_id] || 0) > stockOf[l.item_variant_id];
    const shortLines = lines.filter(isShort);

    const nothingToDo = lines.every((l) => maxFor(l) === 0);

    const problems = [];
    if (isReturn) {
        lines.forEach((l, i) => {
            const p = rowProblem(data.items[i], l);
            if (p) problems.push(p);
        });
    }
    if (shortLines.length > 0) problems.push('Not enough stock for one or more items.');

    const disabled = processing || nothingToDo || now === 0 || problems.length > 0;

    const hint = reviewing
        ? ''
        : problems[0] ??
          (!nothingToDo && now === 0 ? (isReturn ? 'Choose how many units are coming back.' : 'Enter a quantity to deliver.') : '');

    const itemName = (id) => lines.find((l) => l.id === id)?.item_name ?? 'Item';

    /* ---- actions ---- */
    const submit = (e) => {
        e.preventDefault();
        if (disabled || processing) return;

        if (isReturn && step === 'edit') {
            setStep('review');
            return;
        }

        transform((d) => ({
            note: d.note,
            request_token: d.request_token,
            items: d.items.map((r) => {
                const row = { transaction_item_id: r.transaction_item_id, quantity: Number(r.quantity) || 0 };
                if (isReturn) {
                    row.written_off = notRestockedOf(r);
                    row.reason = row.written_off > 0 ? r.reason : null;
                    row.replace = r.replace !== false;
                }
                return row;
            }),
        }));

        post(route(isReturn ? 'transactions.deliveries.return' : 'transactions.deliveries.store', transaction.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
            // Keep everything the user typed and show the server's message.
            onError: () => setStep('edit'),
        });
    };

    const dirty = !isHistory && (data.note !== '' || (isReturn && now > 0));

    const close = () => {
        if (processing) return;
        if (dirty && !window.confirm('Discard this entry? Nothing has been saved yet.')) return;
        reset();
        clearErrors();
        onCancel();
    };

    const title = isHistory ? 'Delivery history' : isReturn ? (reviewing ? 'Review return' : 'Return items') : 'Record delivery';
    const HeaderIcon = isHistory ? History : isReturn ? Undo2 : Truck;

    const primaryLabel = processing
        ? 'Saving…'
        : isReturn
          ? reviewing
              ? 'Confirm return'
              : 'Review return'
          : now > 0
            ? `Record delivery · ${now}`
            : 'Record delivery';

    return (
        <Modal show={Boolean(transaction)} onClose={close} maxWidth="2xl">
            {transaction && (
                <form onSubmit={submit} className="flex max-h-[88vh] flex-col">
                    {/* ------------------------------ Header ------------------------------ */}
                    <div className="border-b px-6 py-4">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef1f5] text-[#667292]">
                                <HeaderIcon className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base font-semibold">{title}</h2>
                                <p className="truncate text-sm text-muted-foreground">{transaction.name}</p>
                            </div>
                            {!isHistory && (
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-semibold tabular-nums text-[#3a4157]">
                                        {delivered}/{ordered}
                                    </p>
                                    <p className="text-xs text-muted-foreground">delivered</p>
                                </div>
                            )}
                        </div>
                        {!isHistory && (
                            <div className="mt-3">
                                <Progress value={delivered} max={ordered} tone="bg-emerald-500" />
                            </div>
                        )}
                    </div>

                    {/* ------------------------------- Body ------------------------------- */}
                    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        {errors.items && <Banner tone="error">{errors.items}</Banner>}

                        {/* ============================ HISTORY ============================ */}
                        {isHistory &&
                            ((transaction.deliveries ?? []).length === 0 ? (
                                <Banner tone="info">No deliveries or returns yet.</Banner>
                            ) : (
                                <ul className="space-y-3">
                                    {transaction.deliveries.map((d) => (
                                        <li key={d.id} className="rounded-xl border border-[#bccad6] p-3.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                        d.is_return ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                    }`}
                                                >
                                                    {d.is_return ? <Undo2 className="size-3" /> : <Truck className="size-3" />}
                                                    {d.is_return ? 'Return' : 'Delivery'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{formatDate(d.delivered_at)}</span>
                                            </div>

                                            <ul className="mt-3 space-y-2 text-sm">
                                                {(d.items ?? []).map((it) => {
                                                    const out = Number(it.written_off_quantity ?? 0);
                                                    const back = Math.abs(it.quantity) - out;
                                                    return (
                                                        <li key={it.id}>
                                                            <div className="flex justify-between gap-3">
                                                                <span className="min-w-0 truncate">{itemName(it.transaction_item_id)}</span>
                                                                <span className="font-semibold tabular-nums">
                                                                    {it.quantity > 0 ? `+${it.quantity}` : it.quantity}
                                                                </span>
                                                            </div>
                                                            {d.is_return && (
                                                                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
                                                                    {back > 0 && <span className="text-emerald-700">{back} back in stock</span>}
                                                                    {out > 0 && (
                                                                        <span className="text-amber-700">
                                                                            {out} not restocked{it.reason ? ` (${reasonLabel(it.reason)})` : ''}
                                                                        </span>
                                                                    )}
                                                                    {it.needs_replacement != null && (
                                                                        <span className={it.needs_replacement ? 'text-sky-700' : 'text-slate-500'}>
                                                                            {it.needs_replacement ? 'to be replaced' : 'no replacement, order reduced'}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>

                                            {(d.deliverer?.name || d.note) && (
                                                <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                                                    {d.deliverer?.name && <>By {d.deliverer.name}</>}
                                                    {d.deliverer?.name && d.note && ' · '}
                                                    {d.note}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ))}

                        {/* ========================== NOTHING TO DO ========================== */}
                        {!isHistory && nothingToDo && (
                            <div className="flex flex-col items-center gap-2 py-8 text-center">
                                <CheckCircle2 className="size-8 text-emerald-500" />
                                <p className="text-sm font-medium text-[#3a4157]">
                                    {isReturn ? 'Nothing to return' : 'Everything is delivered'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {isReturn
                                        ? 'Nothing has been delivered yet, so there is nothing to return.'
                                        : 'All items on this order have been delivered.'}
                                </p>
                            </div>
                        )}

                        {/* ====================== DELIVER: one card per line ====================== */}
                        {!isHistory && !nothingToDo && !isReturn && (
                            <>
                                <div className="flex flex-wrap gap-2 text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setAll(true)}
                                        className="rounded-full border border-[#bccad6] px-3 py-1 text-[#667292] transition hover:bg-[#eef1f5]"
                                    >
                                        Deliver all remaining
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAll(false)}
                                        className="rounded-full border border-[#bccad6] px-3 py-1 text-[#667292] transition hover:bg-[#eef1f5]"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <ul className="space-y-3">
                                    {lines.map((line, index) => {
                                        const row = data.items[index];
                                        const remaining = remainingOf(line);
                                        const short = isShort(line);
                                        const stock = stockOf[line.item_variant_id];

                                        return (
                                            <li
                                                key={line.id}
                                                className={`rounded-xl border p-3.5 ${short ? 'border-red-300 bg-red-50/40' : 'border-[#bccad6]'}`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold">{line.item_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {line.brand_name} · ordered {line.quantity}
                                                            {stock != null && ` · in stock ${stock}`}
                                                        </p>
                                                    </div>

                                                    {remaining === 0 ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                            <CheckCircle2 className="size-3.5" /> Delivered
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setQty(index, remaining)}
                                                                className="text-xs font-medium text-[#667292] hover:underline"
                                                            >
                                                                All ({remaining})
                                                            </button>
                                                            <QtyStepper
                                                                value={row?.quantity ?? ''}
                                                                max={remaining}
                                                                onChange={(v) => setQty(index, v)}
                                                                label={`Quantity to deliver for ${line.item_name}`}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-3">
                                                    <Progress value={deliveredOf(line)} max={line.quantity} tone="bg-emerald-500" />
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {deliveredOf(line)} delivered · {remaining} remaining
                                                    </p>
                                                </div>

                                                {short && (
                                                    <p className="mt-2 text-xs font-medium text-red-700">
                                                        Only {stock} in stock. Lower the quantity, or receive more stock first.
                                                    </p>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}

                        {/* ================== RETURN, EDIT: one card per line ================== */}
                        {!isHistory && !nothingToDo && isReturn && !reviewing && (
                            <>
                                <div className="flex flex-wrap gap-2 text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setAll(true, 'good')}
                                        className="rounded-full border border-[#bccad6] px-3 py-1 text-[#667292] transition hover:bg-[#eef1f5]"
                                    >
                                        Return all (good)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAll(true, 'bad')}
                                        className="rounded-full border border-[#bccad6] px-3 py-1 text-[#667292] transition hover:bg-[#eef1f5]"
                                    >
                                        Return all (damaged)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAll(false)}
                                        className="rounded-full border border-[#bccad6] px-3 py-1 text-[#667292] transition hover:bg-[#eef1f5]"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <ul className="space-y-3">
                                    {lines.map((line, index) => {
                                        const row = data.items[index];
                                        if (!row || deliveredOf(line) === 0) return null;

                                        const qty = Number(row.quantity) || 0;
                                        const out = notRestockedOf(row);
                                        const back = qty - out;
                                        const issue = rowProblem(row, line);

                                        return (
                                            <li
                                                key={line.id}
                                                className={`rounded-xl border p-3.5 transition ${
                                                    qty > 0 ? 'border-[#667292]/60 bg-white shadow-sm' : 'border-[#bccad6]'
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold">{line.item_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {line.brand_name} · {deliveredOf(line)} delivered
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Returning</span>
                                                        <QtyStepper
                                                            value={row.quantity}
                                                            max={deliveredOf(line)}
                                                            onChange={(v) => setQty(index, v)}
                                                            label={`Quantity to return for ${line.item_name}`}
                                                        />
                                                    </div>
                                                </div>

                                                {qty > 0 && (
                                                    <div className="mt-4 space-y-4 border-t pt-4">
                                                        {/* 1. Condition */}
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-medium text-[#667292]">1 · What condition are they in?</p>
                                                            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Condition of returned units">
                                                                {CONDITIONS.map(({ value, title: t, hint: h, Icon }) => (
                                                                    <Choice
                                                                        key={value}
                                                                        active={row.condition === value}
                                                                        onClick={() => setCondition(index, value)}
                                                                        Icon={Icon}
                                                                        title={t}
                                                                        hint={h}
                                                                    />
                                                                ))}
                                                            </div>

                                                            {row.condition === 'partial' && (
                                                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                                                    <span className="text-xs text-muted-foreground">How many are damaged?</span>
                                                                    <QtyStepper
                                                                        value={row.written_off}
                                                                        max={qty}
                                                                        onChange={(v) => patchRow(index, { written_off: v })}
                                                                        label={`Damaged units of ${line.item_name}`}
                                                                    />
                                                                </div>
                                                            )}

                                                            {out > 0 && (
                                                                <select
                                                                    value={row.reason}
                                                                    onChange={(e) => patchRow(index, { reason: e.target.value })}
                                                                    aria-label={`Why ${line.item_name} can't be restocked`}
                                                                    className={`${selectClass} ${!row.reason ? 'border-amber-400' : ''}`}
                                                                >
                                                                    <option value="" disabled>Why can't these be resold?</option>
                                                                    {RETURN_REASONS.map((r) => (
                                                                        <option key={r.value} value={r.value}>{r.label}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>

                                                        {/* 2. Replacement */}
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-medium text-[#667292]">2 · What does the customer get?</p>
                                                            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Replacement">
                                                                <Choice
                                                                    active={row.replace !== false}
                                                                    onClick={() => patchRow(index, { replace: true })}
                                                                    Icon={RefreshCw}
                                                                    title="A replacement"
                                                                    hint={`Keeps ${qty} on the order to deliver again`}
                                                                />
                                                                <Choice
                                                                    active={row.replace === false}
                                                                    onClick={() => patchRow(index, { replace: false })}
                                                                    Icon={Ban}
                                                                    title="No replacement"
                                                                    hint={`Removes ${qty} from the order`}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Result */}
                                                        <p className="flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-[#eef1f5] px-3 py-2 text-xs font-medium">
                                                            <span className="text-emerald-700">{back} back in stock</span>
                                                            {out > 0 && <span className="text-amber-700">{out} written off</span>}
                                                            <span className={row.replace === false ? 'text-slate-600' : 'text-sky-700'}>
                                                                {row.replace === false ? `order −${qty}` : `${qty} to replace`}
                                                            </span>
                                                        </p>

                                                        {issue && <p className="text-xs font-medium text-amber-700">{issue}</p>}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}

                        {/* ====================== RETURN, REVIEW STEP ====================== */}
                        {reviewing && (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Check this before saving. Stock changes are written to the ledger and can't be edited afterwards.
                                </p>

                                <ul className="divide-y rounded-xl border border-[#bccad6]">
                                    {lines.map((line, index) => {
                                        const row = data.items[index];
                                        const qty = Number(row?.quantity) || 0;
                                        if (qty <= 0) return null;
                                        const out = notRestockedOf(row);
                                        const back = qty - out;

                                        return (
                                            <li key={line.id} className="p-3.5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold">{line.item_name}</p>
                                                        <p className="text-xs text-muted-foreground">{line.brand_name}</p>
                                                    </div>
                                                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-700">
                                                        {qty} returned
                                                    </span>
                                                </div>
                                                <ul className="mt-2 space-y-1 text-xs">
                                                    {back > 0 && <li className="text-emerald-700">• {back} go back on the shelf</li>}
                                                    {out > 0 && (
                                                        <li className="text-amber-700">
                                                            • {out} written off ({reasonLabel(row.reason)}), stock not increased
                                                        </li>
                                                    )}
                                                    <li className={row.replace === false ? 'text-slate-600' : 'text-sky-700'}>
                                                        •{' '}
                                                        {row.replace === false
                                                            ? `No replacement: order reduced by ${qty}`
                                                            : `${qty} stay on the order to be replaced`}
                                                    </li>
                                                </ul>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}

                        {/* ====================== Totals, summary, note ====================== */}
                        {!isHistory && !nothingToDo && isReturn && now > 0 && (
                            <div className="grid grid-cols-3 gap-2.5">
                                <Tile tone="green" Icon={PackageCheck} value={restocked} label="back in stock" />
                                <Tile tone={writtenOff > 0 ? 'amber' : 'mute'} Icon={PackageX} value={writtenOff} label="written off" />
                                <Tile
                                    tone={cancelled > 0 ? 'sky' : 'mute'}
                                    Icon={cancelled > 0 ? Ban : RefreshCw}
                                    value={cancelled > 0 ? `−${cancelled}` : '0'}
                                    label={cancelled > 0 ? 'removed from order' : 'order unchanged'}
                                />
                            </div>
                        )}

                        {isReturn && cancelled > 0 && reduction > 0 && (
                            <p className="text-xs text-muted-foreground">
                                The order value goes down by <b className="text-[#3a4157]">{currency(reduction)}</b>.
                            </p>
                        )}

                        {isReturn && now > 0 && orderedAfter <= 0 && (
                            <Banner tone="warning">
                                This empties the whole order. If the customer is cancelling everything, mark the deal as{' '}
                                <b>Lost</b> instead. It keeps the records clearer.
                            </Banner>
                        )}

                        {!isHistory && !nothingToDo && (
                            <div className="rounded-lg bg-[#eef1f5] px-3.5 py-3 text-sm text-[#3a4157]">
                                <p>
                                    After saving: <b>{after} of {orderedAfter}</b> delivered
                                </p>
                                <p className="mt-0.5 text-xs text-[#667292]">
                                    {!isReturn &&
                                        (after >= ordered
                                            ? 'Everything is delivered. You can move the card forward.'
                                            : 'The rest stays open for the next delivery.')}
                                    {isReturn && cancelled > 0 && `Order reduced by ${cancelled}. `}
                                    {isReturn && willReopen && 'Units to replace become deliverable again.'}
                                    {isReturn && !willReopen && 'Nothing left to deliver.'}
                                    {isReturn && willReopen && movesBackTo && (
                                        <> The card goes back to <b>{movesBackTo}</b>.</>
                                    )}
                                </p>
                            </div>
                        )}

                        {!isHistory && !nothingToDo && !reviewing && (
                            <div>
                                <label htmlFor="delivery_note" className="block text-sm font-medium">Note</label>
                                <input
                                    id="delivery_note"
                                    type="text"
                                    maxLength={255}
                                    placeholder={isReturn ? 'Optional, e.g. return slip number' : 'Optional, e.g. waybill number'}
                                    value={data.note}
                                    onChange={(e) => setData('note', e.target.value)}
                                    className={`mt-1.5 ${selectClass}`}
                                />
                            </div>
                        )}
                    </div>

                    {/* ------------------------------ Footer ------------------------------ */}
                    <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-6 py-3">
                        <p className="min-w-0 text-xs text-amber-700" aria-live="polite">{hint}</p>
                        <div className="flex shrink-0 gap-2">
                            {reviewing ? (
                                <Button type="button" variant="outline" onClick={() => setStep('edit')} disabled={processing}>
                                    <ArrowLeft />
                                    Back
                                </Button>
                            ) : (
                                <Button type="button" variant="outline" onClick={close} disabled={processing}>
                                    {isHistory || nothingToDo ? 'Close' : 'Cancel'}
                                </Button>
                            )}
                            {!isHistory && !nothingToDo && (
                                <Button type="submit" variant="brand" disabled={disabled}>
                                    {primaryLabel}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            )}
        </Modal>
    );
}