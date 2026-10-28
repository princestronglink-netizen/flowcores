import { useEffect, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { currency } from './Board';
import {
    AlertTriangle,
    ArrowLeft,
    Ban,
    CheckCircle2,
    FileText,
    History,
    Minus,
    PackageCheck,
    PackageX,
    Paperclip,
    Plus,
    RefreshCw,
    Truck,
    Undo2,
    X,
} from 'lucide-react';
import { RETURN_REASONS, reasonLabel } from './returnReasons';

/* ------------------------------ helpers ------------------------------ */

const deliveredOf = (line) => Number(line.delivered_quantity ?? 0);
const remainingOf = (line) => Math.max(0, line.quantity - deliveredOf(line));
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const MAX_DR_BYTES = 10 * 1024 * 1024; // keep in sync with max:10240 on the server

const formatDate = (value) =>
    value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

// One token per opened modal. The server ignores a second request with the same token.
const newToken = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const CONDITIONS = [
    { value: 'good', title: 'Good', hint: 'All can be resold', Icon: PackageCheck },
    { value: 'partial', title: 'Some damaged', hint: 'Part can be resold', Icon: AlertTriangle },
    { value: 'bad', title: 'All damaged', hint: "Can't be resold", Icon: PackageX },
];

const REPLACEMENT = [
    { value: true, title: 'Replace', hint: 'Keep the units on the order to deliver again', Icon: RefreshCw },
    { value: false, title: 'No replacement', hint: 'Remove the units from the order', Icon: Ban },
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

const field =
    'block w-full rounded-lg border border-[#c9d6e5] bg-white px-4 py-3 text-base text-[#12306b] placeholder:text-[#8aa0bf] focus:border-[#1b4a7d] focus:outline-none focus:ring-2 focus:ring-[#1b4a7d]/20';

// Smaller version used inside the return rows.
const fieldSm =
    'block w-full rounded-md border border-[#c9d6e5] bg-white px-2.5 py-1.5 text-sm focus:border-[#1b4a7d] focus:outline-none focus:ring-2 focus:ring-[#1b4a7d]/20';

const chip =
    'rounded-lg border border-[#c9d6e5] bg-white px-4 py-2 text-sm font-semibold text-[#12306b] transition hover:bg-[#eef3fa]';

const stepBtn =
    'flex size-7 items-center justify-center text-[#1b4a7d] transition hover:bg-[#eef3fa] focus:outline-none focus-visible:bg-[#eef3fa] disabled:pointer-events-none disabled:opacity-30';

const stepBtnLg =
    'flex h-11 w-11 items-center justify-center text-[#1b4a7d] transition hover:bg-[#eef3fa] focus:outline-none focus-visible:bg-[#eef3fa] disabled:pointer-events-none disabled:opacity-30';

// Item | Ordered | Delivered | Stock | action  (numbers hide on mobile and move under the name)
const DELIVER_GRID = 'sm:grid-cols-[minmax(0,1fr)_6rem_6rem_6rem_12rem]';
const RETURN_GRID = 'sm:grid-cols-[minmax(0,1fr)_4rem_9.5rem]';

/* ----------------------------- small parts ----------------------------- */

function QtyStepper({ value, max, onChange, label, disabled = false, large = false }) {
    const n = Number(value) || 0;
    const set = (v) => onChange(clamp(v, 0, max));
    const btn = large ? stepBtnLg : stepBtn;

    return (
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#c9d6e5] bg-white">
            <button type="button" className={btn} onClick={() => set(n - 1)} disabled={disabled || n <= 0} aria-label={`Decrease ${label}`}>
                <Minus className="size-3.5" />
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
                className={`${
                    large ? 'h-11 w-16 text-lg' : 'h-7 w-11 text-sm'
                } border-x border-[#c9d6e5] text-center font-semibold tabular-nums text-[#12306b] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1b4a7d]/20 disabled:bg-muted [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            />
            <button type="button" className={btn} onClick={() => set(n + 1)} disabled={disabled || n >= max} aria-label={`Increase ${label}`}>
                <Plus className="size-3.5" />
            </button>
        </div>
    );
}

/** Compact either/or toggle. */
function Segmented({ value, onChange, options, label }) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className="inline-grid gap-0.5 rounded-md bg-[#e4e9f0] p-0.5"
            style={{ gridTemplateColumns: `repeat(${options.length}, auto)` }}
        >
            {options.map((o) => {
                const active = o.value === value;
                const Icon = o.Icon;
                return (
                    <button
                        key={String(o.value)}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={o.hint}
                        onClick={() => onChange(o.value)}
                        className={`flex items-center justify-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6b84a8]/40 ${
                            active ? 'bg-white text-[#12306b] shadow-sm' : 'text-[#6b84a8] hover:text-[#12306b]'
                        }`}
                    >
                        <Icon className="size-3 shrink-0" />
                        {o.title}
                    </button>
                );
            })}
        </div>
    );
}

function Progress({ value, max, tone = 'bg-[#6b84a8]', className = '' }) {
    const pct = max > 0 ? clamp(Math.round((value / max) * 100), 0, 100) : 0;
    return (
        <div className={`h-2 overflow-hidden rounded-full bg-[#e3eaf3] ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
            <div className={`h-full rounded-full transition-all duration-300 ${tone}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

function Pill({ tone = 'mute', Icon, children }) {
    const tones = {
        green: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        sky: 'bg-sky-50 text-sky-700',
        mute: 'bg-white text-[#6b84a8]',
    };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
            {Icon && <Icon className="size-3" />}
            {children}
        </span>
    );
}

function Banner({ tone = 'error', children }) {
    const tones = {
        error: 'border-red-300 bg-red-50 text-red-800',
        warning: 'border-amber-300 bg-amber-50 text-amber-800',
        info: 'border-[#dbe4ef] bg-[#eef3fa] text-[#12306b]',
    };
    return (
        <div role={tone === 'error' ? 'alert' : undefined} className={`rounded-lg border px-3 py-1.5 text-sm ${tones[tone]}`}>
            {children}
        </div>
    );
}

function TableHead({ className, children, roomy = false }) {
    return (
        <div
            className={`hidden gap-3 border-b border-[#dbe4ef] bg-[#f4f7fb] text-xs font-semibold uppercase tracking-wider text-[#4a5d7a] sm:grid ${
                roomy ? 'px-6 py-3' : 'px-3 py-1.5'
            } ${className}`}
        >
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
 * Layout: one full-width items table, a details strip below it (DR + note), a slim summary bar.
 *
 * Return rows, per line:
 *   condition  good | partial | bad   → how many go back on the shelf vs. are written off
 *   replace    true | false           → units stay owed (replacement) or the order shrinks
 *
 * Deliveries can also carry a DR number and a DR softcopy (PDF / image). Returns do not.
 */
export default function DeliveryModal({ transaction, mode = 'deliver', movesBackTo = null, onClose, onCancel }) {
    const isHistory = mode === 'history';
    const isReturn = mode === 'return';
    const lines = transaction?.items ?? [];

    const [step, setStep] = useState('edit'); // returns only: 'edit' → 'review'
    const reviewing = isReturn && step === 'review';

    const fileRef = useRef(null);
    const [fileNotice, setFileNotice] = useState(null);

    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        note: '',
        dr_number: '',
        dr_file: null,
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

    const clearFileInput = () => {
        if (fileRef.current) fileRef.current.value = '';
    };

    useEffect(() => {
        if (!transaction) return;
        setData({
            note: '',
            dr_number: '',
            dr_file: null,
            request_token: newToken(),
            items: buildRows(!isReturn && !isHistory), // deliver is prefilled with what remains
        });
        clearFileInput();
        setFileNotice(null);
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

    /* ---- DR file ---- */
    const pickFile = (e) => {
        const f = e.target.files?.[0] ?? null;
        setFileNotice(null);

        if (f && f.size > MAX_DR_BYTES) {
            e.target.value = '';
            setData('dr_file', null);
            setFileNotice('That file is larger than 10 MB. Choose a smaller PDF or image.');
            return;
        }

        setData('dr_file', f);
        clearErrors('dr_file');
    };

    const removeFile = () => {
        setData('dr_file', null);
        setFileNotice(null);
        clearFileInput();
    };

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

        transform((d) => {
            const payload = {
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
            };

            // DR fields belong to deliveries only. Inertia switches to FormData when a file is present.
            if (!isReturn) {
                payload.dr_number = d.dr_number;
                if (d.dr_file) payload.dr_file = d.dr_file;
            }

            return payload;
        });

        post(route(isReturn ? 'transactions.deliveries.return' : 'transactions.deliveries.store', transaction.id), {
            preserveScroll: true,
            forceFormData: !isReturn,
            onSuccess: () => {
                reset();
                clearFileInput();
                onClose();
            },
            // Keep everything the user typed and show the server's message.
            onError: () => setStep('edit'),
        });
    };

    const dirty =
        !isHistory &&
        (data.note !== '' || data.dr_number !== '' || data.dr_file !== null || (isReturn && now > 0));

    const close = () => {
        if (processing) return;
        if (dirty && !window.confirm('Discard this entry? Nothing has been saved yet.')) return;
        reset();
        clearErrors();
        clearFileInput();
        setFileNotice(null);
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

    const showForm = !isHistory && !nothingToDo;

    return (
        <Modal show={Boolean(transaction)} onClose={close} maxWidth="4xl">
            {transaction && (
                <form onSubmit={submit} className="flex max-h-[94vh] flex-col">
                    {/* ------------------------------ Header ------------------------------ */}
                    <div className="border-b border-[#dbe4ef] px-8 py-5">
                        <div className="flex items-center gap-5">
                            <HeaderIcon className="size-12 shrink-0 text-[#1b4a7d]" strokeWidth={1.5} />
                            <div className="min-w-0 flex-1">
                                <h2 className="text-3xl font-bold leading-tight text-[#12306b]">{title}</h2>
                                <p className="truncate text-lg text-[#6b84a8]">{transaction.name}</p>
                            </div>
                            {!isHistory && (
                                <div className="flex w-64 shrink-0 flex-col items-end gap-2">
                                    <p className="text-base text-[#4a5d7a]">
                                        <b className="tabular-nums text-[#12306b]">{delivered}</b>/{ordered} delivered
                                    </p>
                                    <Progress value={delivered} max={ordered} tone="bg-emerald-500" className="w-full" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ------------------------------- Body ------------------------------- */}
                    <div className="flex-1 space-y-6 overflow-y-auto px-8 py-6">
                        {errors.items && <Banner tone="error">{errors.items}</Banner>}

                        {/* ============================ HISTORY ============================ */}
                        {isHistory &&
                            ((transaction.deliveries ?? []).length === 0 ? (
                                <Banner tone="info">No deliveries or returns yet.</Banner>
                            ) : (
                                <ul className="space-y-2">
                                    {transaction.deliveries.map((d) => (
                                        <li key={d.id} className="overflow-hidden rounded-lg border border-[#dbe4ef]">
                                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-[#f4f7fb] px-3 py-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                                            d.is_return ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                        }`}
                                                    >
                                                        {d.is_return ? <Undo2 className="size-3" /> : <Truck className="size-3" />}
                                                        {d.is_return ? 'Return' : 'Delivery'}
                                                    </span>

                                                    {d.dr_number && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-[#12306b]">
                                                            <FileText className="size-3 text-[#6b84a8]" />
                                                            DR <b>{d.dr_number}</b>
                                                        </span>
                                                    )}

                                                    {d.dr_file_url && (
                                                        <a
                                                            href={d.dr_file_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex max-w-[14rem] items-center gap-1 text-xs font-medium text-[#6b84a8] hover:underline"
                                                        >
                                                            <Paperclip className="size-3 shrink-0" />
                                                            <span className="truncate">{d.dr_file_name ?? 'View DR'}</span>
                                                        </a>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(d.delivered_at)}
                                                    {d.deliverer?.name && ` · ${d.deliverer.name}`}
                                                </span>
                                            </div>

                                            <ul className="divide-y divide-slate-100 px-3 text-sm">
                                                {(d.items ?? []).map((it) => {
                                                    const out = Number(it.written_off_quantity ?? 0);
                                                    const back = Math.abs(it.quantity) - out;
                                                    return (
                                                        <li key={it.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1">
                                                            <span className="min-w-0 truncate">{itemName(it.transaction_item_id)}</span>
                                                            <span className="flex items-baseline gap-2">
                                                                {d.is_return && (
                                                                    <span className="flex flex-wrap gap-x-2 text-[11px]">
                                                                        {back > 0 && <span className="text-emerald-700">{back} restocked</span>}
                                                                        {out > 0 && (
                                                                            <span className="text-amber-700">
                                                                                {out} written off{it.reason ? ` (${reasonLabel(it.reason)})` : ''}
                                                                            </span>
                                                                        )}
                                                                        {it.needs_replacement != null && (
                                                                            <span className={it.needs_replacement ? 'text-sky-700' : 'text-slate-500'}>
                                                                                {it.needs_replacement ? 'to replace' : 'order reduced'}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                )}
                                                                <b className="tabular-nums">{it.quantity > 0 ? `+${it.quantity}` : it.quantity}</b>
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>

                                            {d.note && (
                                                <p className="border-t border-slate-100 px-3 py-1 text-xs text-muted-foreground">{d.note}</p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ))}

                        {/* ========================== NOTHING TO DO ========================== */}
                        {!isHistory && nothingToDo && (
                            <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                                <CheckCircle2 className="size-8 text-emerald-500" />
                                <p className="text-sm font-medium text-[#12306b]">
                                    {isReturn ? 'Nothing to return' : 'Everything is delivered'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {isReturn
                                        ? 'Nothing has been delivered yet, so there is nothing to return.'
                                        : 'All items on this order have been delivered.'}
                                </p>
                            </div>
                        )}

                        {/* ============================ EDIT / REVIEW ============================ */}
                        {showForm && (
                            <>
                                {/* Quick actions */}
                                {!reviewing && (
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#12306b]">
                                            {isReturn ? 'Items to return' : 'Items to deliver'}
                                        </h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {isReturn ? (
                                                <>
                                                    <button type="button" onClick={() => setAll(true, 'good')} className={chip}>
                                                        All back (good)
                                                    </button>
                                                    <button type="button" onClick={() => setAll(true, 'bad')} className={chip}>
                                                        All back (damaged)
                                                    </button>
                                                </>
                                            ) : (
                                                <button type="button" onClick={() => setAll(true)} className={chip}>
                                                    Deliver all remaining
                                                </button>
                                            )}
                                            <button type="button" onClick={() => setAll(false)} className={chip}>
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ---------- DELIVER table ---------- */}
                                {!isReturn && (
                                    <div className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
                                        <TableHead roomy className={DELIVER_GRID}>
                                            <span>Item</span>
                                            <span className="text-center">Ordered</span>
                                            <span className="text-center">Done</span>
                                            <span className="text-center">Stock</span>
                                            <span className="text-center">Deliver now</span>
                                        </TableHead>

                                        <ul className="divide-y divide-[#e6edf5]">
                                            {lines.map((line, index) => {
                                                const row = data.items[index];
                                                const remaining = remainingOf(line);
                                                const short = isShort(line);
                                                const stock = stockOf[line.item_variant_id];

                                                return (
                                                    <li key={line.id} className={`px-6 py-4 ${short ? 'bg-red-50/60' : ''}`}>
                                                        <div className={`grid grid-cols-1 items-center gap-x-3 gap-y-1 ${DELIVER_GRID}`}>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-base font-bold text-[#12306b]">{line.item_name}</p>
                                                                <p className="truncate text-sm text-[#4a5d7a]">
                                                                    {line.brand_name}
                                                                    <span className="sm:hidden">
                                                                        {' '}· ordered {line.quantity} · done {deliveredOf(line)}
                                                                        {stock != null && ` · stock ${stock}`}
                                                                    </span>
                                                                </p>
                                                            </div>

                                                            <span className="hidden text-center text-base tabular-nums text-[#12306b] sm:block">{line.quantity}</span>
                                                            <span className="hidden text-center text-base font-medium tabular-nums text-[#0b7ab0] sm:block">
                                                                {deliveredOf(line)}
                                                            </span>
                                                            <span
                                                                className={`hidden text-center text-base tabular-nums sm:block ${
                                                                    short ? 'font-semibold text-red-700' : 'text-[#12306b]'
                                                                }`}
                                                            >
                                                                {stock ?? '—'}
                                                            </span>

                                                            <div className="flex items-center justify-center">
                                                                {remaining === 0 ? (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                                        <CheckCircle2 className="size-3.5" /> Delivered
                                                                    </span>
                                                                ) : (
                                                                    <QtyStepper
                                                                        large
                                                                        value={row?.quantity ?? ''}
                                                                        max={remaining}
                                                                        onChange={(v) => setQty(index, v)}
                                                                        label={`Quantity to deliver for ${line.item_name}`}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {short && (
                                                            <p className="mt-1 text-xs font-medium text-red-700">
                                                                Only {stock} in stock. Lower the quantity, or receive more stock first.
                                                            </p>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}

                                {/* ---------- RETURN table (edit) ---------- */}
                                {isReturn && !reviewing && (
                                    <div className="overflow-hidden rounded-lg border border-[#dbe4ef]">
                                        <TableHead className={RETURN_GRID}>
                                            <span>Item</span>
                                            <span className="text-center">Out</span>
                                            <span className="text-right">Return now</span>
                                        </TableHead>

                                        <ul className="divide-y divide-slate-100">
                                            {lines.map((line, index) => {
                                                const row = data.items[index];
                                                if (!row || deliveredOf(line) === 0) return null;

                                                const qty = Number(row.quantity) || 0;
                                                const out = notRestockedOf(row);
                                                const back = qty - out;
                                                const issue = rowProblem(row, line);

                                                return (
                                                    <li key={line.id}>
                                                        <div className={`grid grid-cols-1 items-center gap-x-3 gap-y-1 px-3 py-1.5 ${RETURN_GRID}`}>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold">{line.item_name}</p>
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    {line.brand_name}
                                                                    <span className="sm:hidden"> · {deliveredOf(line)} delivered</span>
                                                                </p>
                                                            </div>
                                                            <span className="hidden text-center text-sm tabular-nums sm:block">{deliveredOf(line)}</span>
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQty(index, deliveredOf(line))}
                                                                    className="text-xs font-medium text-[#6b84a8] hover:underline"
                                                                >
                                                                    All
                                                                </button>
                                                                <QtyStepper
                                                                    value={row.quantity}
                                                                    max={deliveredOf(line)}
                                                                    onChange={(v) => setQty(index, v)}
                                                                    label={`Quantity to return for ${line.item_name}`}
                                                                />
                                                            </div>
                                                        </div>

                                                        {qty > 0 && (
                                                            <div className="space-y-1.5 border-t border-[#dbe4ef]/50 bg-[#f7f9fb] px-3 py-2">
                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-[#6b84a8]">Condition</span>
                                                                        <Segmented
                                                                            label="Condition of returned units"
                                                                            value={row.condition}
                                                                            onChange={(v) => setCondition(index, v)}
                                                                            options={CONDITIONS}
                                                                        />
                                                                    </div>

                                                                    {row.condition === 'partial' && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs text-[#6b84a8]">Damaged</span>
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
                                                                            className={`${fieldSm} w-44 ${!row.reason ? 'border-amber-400' : ''}`}
                                                                        >
                                                                            <option value="" disabled>Why not resold?</option>
                                                                            {RETURN_REASONS.map((r) => (
                                                                                <option key={r.value} value={r.value}>{r.label}</option>
                                                                            ))}
                                                                        </select>
                                                                    )}

                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-[#6b84a8]">Customer gets</span>
                                                                        <Segmented
                                                                            label="Replacement"
                                                                            value={row.replace !== false}
                                                                            onChange={(v) => patchRow(index, { replace: v })}
                                                                            options={REPLACEMENT}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <p className="flex flex-wrap gap-x-3 text-xs font-medium">
                                                                    <span className="text-emerald-700">{back} back in stock</span>
                                                                    {out > 0 && <span className="text-amber-700">{out} written off</span>}
                                                                    <span className={row.replace === false ? 'text-slate-600' : 'text-sky-700'}>
                                                                        {row.replace === false ? `order −${qty}` : `${qty} to replace`}
                                                                    </span>
                                                                    {issue && <span className="text-amber-700">· {issue}</span>}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}

                                {/* ---------- RETURN review ---------- */}
                                {reviewing && (
                                    <>
                                        <p className="text-sm text-muted-foreground">
                                            Check this before saving. Stock changes are written to the ledger and can't be edited afterwards.
                                        </p>
                                        <ul className="divide-y divide-slate-100 rounded-lg border border-[#dbe4ef]">
                                            {lines.map((line, index) => {
                                                const row = data.items[index];
                                                const qty = Number(row?.quantity) || 0;
                                                if (qty <= 0) return null;
                                                const out = notRestockedOf(row);
                                                const back = qty - out;

                                                return (
                                                    <li key={line.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold">{line.item_name}</p>
                                                            <p className="text-xs text-muted-foreground">{line.brand_name}</p>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <Pill tone="amber">{qty} returned</Pill>
                                                            {back > 0 && <Pill tone="green">{back} to shelf</Pill>}
                                                            {out > 0 && <Pill tone="amber">{out} written off ({reasonLabel(row.reason)})</Pill>}
                                                            <Pill tone={row.replace === false ? 'mute' : 'sky'}>
                                                                {row.replace === false ? `order −${qty}` : `${qty} to replace`}
                                                            </Pill>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </>
                                )}

                                {/* ---------- Details: DR number, DR softcopy, note ---------- */}
                                {!reviewing && (
                                    <div className={`grid gap-4 ${isReturn ? '' : 'md:grid-cols-[1fr_1.3fr_1.3fr]'}`}>
                                        {!isReturn && (
                                            <>
                                                <div className="rounded-xl border border-[#dbe4ef] bg-white p-4">
                                                    <label htmlFor="dr_number" className="block text-sm text-[#12306b]">
                                                        DR number
                                                    </label>
                                                    <input
                                                        id="dr_number"
                                                        type="text"
                                                        maxLength={60}
                                                        placeholder="e.g. DR-000123"
                                                        value={data.dr_number}
                                                        onChange={(e) => setData('dr_number', e.target.value)}
                                                        className={`mt-2 ${field}`}
                                                    />
                                                    {errors.dr_number && <p className="mt-1 text-xs text-red-600">{errors.dr_number}</p>}
                                                </div>

                                                <div className="min-w-0 rounded-xl border border-[#dbe4ef] bg-white p-4">
                                                    <label htmlFor="dr_file" className="block text-sm text-[#12306b]">
                                                        DR softcopy <span className="text-[#6b84a8]">(PDF/image, max 10 MB)</span>
                                                    </label>
                                                    <input
                                                        ref={fileRef}
                                                        id="dr_file"
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                                                        onChange={pickFile}
                                                        className="mt-2 block w-full text-sm text-[#12306b] file:mr-3 file:rounded-lg file:border file:border-[#c9d6e5] file:bg-[#eef3fa] file:px-4 file:py-3 file:text-sm file:font-semibold file:text-[#12306b] hover:file:bg-[#e3ecf7]"
                                                    />
                                                    {data.dr_file && (
                                                        <button
                                                            type="button"
                                                            onClick={removeFile}
                                                            className="mt-2 inline-flex max-w-full items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                                                        >
                                                            <X className="size-3 shrink-0" />
                                                            <span className="truncate">Remove {data.dr_file.name}</span>
                                                        </button>
                                                    )}
                                                    {fileNotice && <p className="mt-1 text-xs text-red-600">{fileNotice}</p>}
                                                    {errors.dr_file && <p className="mt-1 text-xs text-red-600">{errors.dr_file}</p>}
                                                </div>
                                            </>
                                        )}

                                        <div className="min-w-0 rounded-xl border border-[#dbe4ef] bg-white p-4">
                                            <label htmlFor="delivery_note" className="block text-sm text-[#12306b]">
                                                Note
                                            </label>
                                            <input
                                                id="delivery_note"
                                                type="text"
                                                maxLength={255}
                                                placeholder={isReturn ? 'Optional, e.g. return slip number' : 'Optional, e.g. waybill'}
                                                value={data.note}
                                                onChange={(e) => setData('note', e.target.value)}
                                                className={`mt-2 ${field}`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {isReturn && now > 0 && orderedAfter <= 0 && (
                                    <Banner tone="warning">
                                        This empties the whole order. If the customer is cancelling everything, mark the deal as <b>Lost</b> instead.
                                    </Banner>
                                )}
                            </>
                        )}
                    </div>

                    {/* ------------------------------ Footer ------------------------------ */}
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[#dbe4ef] bg-[#fbfcfe] px-8 py-4">
                        <div className="min-w-0 space-y-1 text-sm text-[#12306b]">
                            {showForm && (
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <span>
                                        After saving: <b>{after} of {orderedAfter}</b> delivered
                                    </span>

                                    {isReturn && now > 0 ? (
                                        <span className="flex flex-wrap items-center gap-1.5">
                                            <Pill tone="green" Icon={PackageCheck}>{restocked} back in stock</Pill>
                                            {writtenOff > 0 && <Pill tone="amber" Icon={PackageX}>{writtenOff} written off</Pill>}
                                            {cancelled > 0 && (
                                                <Pill tone="sky" Icon={Ban}>
                                                    −{cancelled} from order{reduction > 0 ? ` (${currency(reduction)})` : ''}
                                                </Pill>
                                            )}
                                        </span>
                                    ) : null}

                                    <span className={`text-[#6b84a8] ${!isReturn ? 'border-l border-[#c9d6e5] pl-4' : ''}`}>
                                        {!isReturn &&
                                            (after >= ordered
                                                ? 'Everything is delivered. You can move the card forward.'
                                                : 'The rest stays open for the next delivery.')}
                                        {isReturn && willReopen && 'Units to replace become deliverable again.'}
                                        {isReturn && !willReopen && now > 0 && 'Nothing left to deliver.'}
                                        {isReturn && willReopen && movesBackTo && (
                                            <> The card goes back to <b>{movesBackTo}</b>.</>
                                        )}
                                    </span>
                                </div>
                            )}
                            <p className="text-xs text-amber-700" aria-live="polite">{hint}</p>
                        </div>

                        <div className="flex shrink-0 gap-3">
                            {reviewing ? (
                                <Button type="button" variant="outline" className="h-11 px-6 text-base" onClick={() => setStep('edit')} disabled={processing}>
                                    <ArrowLeft />
                                    Back
                                </Button>
                            ) : (
                                <Button type="button" variant="outline" className="h-11 px-6 text-base" onClick={close} disabled={processing}>
                                    {isHistory || nothingToDo ? 'Close' : 'Cancel'}
                                </Button>
                            )}
                            {showForm && (
                                <Button type="submit" variant="brand" className="h-11 bg-[#1b4a7d] px-6 text-base hover:bg-[#163e68]" disabled={disabled}>
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