// resources/js/Pages/Stock/In.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import StockToast from '@/Components/Pipeline/StockToast';
import { Button } from '@/Components/ui/Button';
import { Head, useForm, usePage } from '@inertiajs/react';
import { ChevronDown, PackagePlus, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);
const emptyLine = (variantId = '') => ({ item_variant_id: variantId, quantity: '' });

const fieldClass =
    'mt-1.5 block w-full rounded-md border border-[#bccad6] px-3 py-2 text-sm text-[#3a4157] focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#8d9db6]/40';
const labelClass = 'block text-sm font-medium text-[#3a4157]';
const errorClass = 'mt-1 text-xs text-red-600';

const STATUS = {
    out: 'bg-red-100 text-red-700',
    low: 'bg-amber-100 text-amber-700',
};

const formatDate = (v) => new Date(v).toLocaleDateString(undefined, { dateStyle: 'medium' });

/**
 * Searchable item picker.
 * Type to filter by item, brand or size (every word you type must match, in any order,
 * e.g. "nail 2" or "holcim 40kg"). Use ↑ ↓ and Enter, or click, to choose.
 * Items already used on another line of the receipt are shown but cannot be picked again.
 */
function ItemCombobox({ variants, value, usedIds, onChange }) {
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);

    const selected = variants.find((v) => String(v.id) === String(value));

    const results = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (words.length === 0) return variants;
        return variants.filter((v) => {
            const text = String(v.label ?? '').toLowerCase();
            return words.every((w) => text.includes(w));
        });
    }, [variants, query]);

    const isTaken = (v) => usedIds.has(String(v.id)) && String(v.id) !== String(value);

    const close = () => {
        setOpen(false);
        setQuery('');
    };

    const choose = (v) => {
        if (isTaken(v)) return;
        onChange(v.id);
        close();
    };

    // close when clicking outside
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // keep the highlighted row inside the visible part of the list
    useEffect(() => {
        if (!open) return;
        listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
    }, [active, open]);

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) setOpen(true);
            else setActive((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            if (open) {
                e.preventDefault(); // don't submit the receipt form
                if (results[active]) choose(results[active]);
            }
        } else if (e.key === 'Escape') {
            if (open) {
                e.preventDefault();
                close();
            }
        } else if (e.key === 'Tab') {
            close();
        }
    };

    return (
        <div ref={rootRef} className="relative">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#667292]" />
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-label="Item"
                    aria-expanded={open}
                    aria-autocomplete="list"
                    autoComplete="off"
                    placeholder="Type to search item, brand or size"
                    value={open ? query : selected?.label ?? ''}
                    onFocus={() => {
                        setOpen(true);
                        setActive(0);
                    }}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        setActive(0);
                    }}
                    onKeyDown={onKeyDown}
                    className={`${fieldClass} mt-0 pl-9 pr-9`}
                />
                {open ? (
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 rotate-180 text-[#667292]" />
                ) : selected ? (
                    <button
                        type="button"
                        aria-label="Clear item"
                        onClick={() => {
                            onChange('');
                            inputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#667292] hover:text-red-600"
                    >
                        <X className="size-4" />
                    </button>
                ) : (
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#667292]" />
                )}
            </div>

            {open && (
                <ul
                    ref={listRef}
                    role="listbox"
                    className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-md border border-[#bccad6] bg-white py-1 shadow-lg"
                >
                    {results.length === 0 ? (
                        <li className="px-3 py-3 text-sm text-[#667292]">
                            No items match “{query}”. Try fewer or different words.
                        </li>
                    ) : (
                        results.map((v, i) => {
                            const taken = isTaken(v);
                            return (
                                <li
                                    key={v.id}
                                    role="option"
                                    aria-selected={String(v.id) === String(value)}
                                    aria-disabled={taken}
                                    // mousedown (not click) so the input keeps focus and nothing flickers
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        choose(v);
                                    }}
                                    onMouseEnter={() => setActive(i)}
                                    className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                                        taken
                                            ? 'cursor-not-allowed text-[#9aa5b5]'
                                            : 'cursor-pointer text-[#3a4157]'
                                    } ${i === active && !taken ? 'bg-[#eef1f5]' : ''} ${
                                        String(v.id) === String(value) ? 'font-semibold' : ''
                                    }`}
                                >
                                    <span className="min-w-0 flex-1 truncate">{v.label}</span>
                                    <span className="shrink-0 text-xs text-[#667292]">
                                        {taken ? 'Already added' : `${v.stock} in stock`}
                                    </span>
                                </li>
                            );
                        })
                    )}
                </ul>
            )}
        </div>
    );
}

export default function In({ variants = [], receipts = [] }) {
    const { flash } = usePage().props;
    const [toast, setToast] = useState(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        supplier: '',
        reference: '',
        received_at: today(),
        note: '',
        items: [emptyLine()],
    });

    useEffect(() => {
        if (flash?.stock) setToast(flash.stock);
    }, [flash?.stock]);

    const byId = useMemo(() => Object.fromEntries(variants.map((v) => [String(v.id), v])), [variants]);
    const needsRestock = variants.filter((v) => v.status === 'out' || v.status === 'low');

    const items = data.items;
    const usedIds = new Set(items.map((i) => String(i.item_variant_id)).filter(Boolean));

    const setLine = (index, patch) =>
        setData('items', items.map((row, i) => (i === index ? { ...row, ...patch } : row)));

    const addLine = () => setData('items', [...items, emptyLine()]);
    const removeLine = (index) => setData('items', items.filter((_, i) => i !== index));

    // "Needs restocking" shortcut: fill the first empty row, or add a new one.
    const addSuggested = (variant) => {
        if (usedIds.has(String(variant.id))) return;
        const emptyIndex = items.findIndex((r) => !r.item_variant_id);
        if (emptyIndex >= 0) setLine(emptyIndex, { item_variant_id: variant.id });
        else setData('items', [...items, emptyLine(variant.id)]);
    };

    const totalUnits = items.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const validLines = items.filter((r) => r.item_variant_id && Number(r.quantity) > 0);

    const submit = (e) => {
        e.preventDefault();
        post(route('stock-in.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                clearErrors();
            },
        });
    };

    return (
        <AuthenticatedLayout header={<PageHeading title="Stock In" subtitle="Receive stock from a supplier and log it." />}>
            <Head title="Stock In" />

            <div className="mx-auto grid w-full max-w-[1600px] gap-6 p-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] 2xl:p-10">
                {/* ---------- Receipt form ---------- */}
                <form onSubmit={submit} noValidate className="rounded-lg border border-[#bccad6] bg-white p-6">
                    <div className="flex items-center gap-3 border-b border-[#bccad6] pb-5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef1f5] text-[#667292]">
                            <PackagePlus className="size-5" />
                        </span>
                        <div>
                            <h2 className="text-base font-semibold text-[#3a4157]">New receipt</h2>
                            <p className="text-sm text-[#667292]">Add everything that arrived in this delivery, then save once.</p>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label htmlFor="supplier" className={labelClass}>Supplier</label>
                            <input id="supplier" type="text" placeholder="Optional" value={data.supplier}
                                onChange={(e) => setData('supplier', e.target.value)} className={fieldClass} />
                            {errors.supplier && <p className={errorClass}>{errors.supplier}</p>}
                        </div>
                        <div>
                            <label htmlFor="reference" className={labelClass}>Invoice / DR no.</label>
                            <input id="reference" type="text" placeholder="Optional" value={data.reference}
                                onChange={(e) => setData('reference', e.target.value)} className={fieldClass} />
                            {errors.reference && <p className={errorClass}>{errors.reference}</p>}
                        </div>
                        <div>
                            <label htmlFor="received_at" className={labelClass}>Date received <span className="text-red-500">*</span></label>
                            <input id="received_at" type="date" max={today()} value={data.received_at}
                                onChange={(e) => setData('received_at', e.target.value)} className={fieldClass} />
                            {errors.received_at && <p className={errorClass}>{errors.received_at}</p>}
                        </div>
                    </div>

                    {/* Lines */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[#3a4157]">Items received</h3>
                            <button type="button" onClick={addLine}
                                className="flex items-center gap-1 text-xs font-semibold text-[#667292] hover:underline">
                                <Plus className="size-3.5" /> Add item
                            </button>
                        </div>

                        {typeof errors.items === 'string' && <p className={errorClass}>{errors.items}</p>}

                        {/* no overflow-hidden here, so the search dropdown can extend past the list */}
                        <ul className="mt-3 divide-y rounded-md border border-[#bccad6]">
                            {items.map((row, index) => {
                                const variant = byId[String(row.item_variant_id)];
                                const qty = Number(row.quantity) || 0;
                                const lineError = errors[`items.${index}.item_variant_id`] || errors[`items.${index}.quantity`];

                                return (
                                    <li key={index} className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_110px_32px] sm:items-start">
                                        <div>
                                            <ItemCombobox
                                                variants={variants}
                                                value={row.item_variant_id}
                                                usedIds={usedIds}
                                                onChange={(id) => setLine(index, { item_variant_id: id })}
                                            />
                                            {variant && (
                                                <p className="mt-1 text-xs text-[#667292]">
                                                    In stock: <b>{variant.stock}</b>
                                                    {qty > 0 && <> → <b className="text-emerald-700">{variant.stock + qty}</b> after receiving</>}
                                                </p>
                                            )}
                                            {lineError && <p className={errorClass}>{lineError}</p>}
                                        </div>

                                        <input
                                            type="number" min={1} step={1} placeholder="Qty"
                                            value={row.quantity}
                                            onChange={(e) => setLine(index, { quantity: e.target.value })}
                                            aria-label="Quantity received"
                                            className={`${fieldClass} mt-0 text-right`}
                                        />

                                        <div className="flex justify-end sm:pt-2">
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeLine(index)}
                                                    aria-label="Remove line" className="text-[#667292] hover:text-red-600">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className="mt-5">
                        <label htmlFor="stock_in_note" className={labelClass}>Note</label>
                        <input id="stock_in_note" type="text" maxLength={255} placeholder="Optional, e.g. received by warehouse A"
                            value={data.note} onChange={(e) => setData('note', e.target.value)} className={fieldClass} />
                        {errors.note && <p className={errorClass}>{errors.note}</p>}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#bccad6] pt-4">
                        <p className="text-sm text-[#667292]">
                            {validLines.length} {validLines.length === 1 ? 'item' : 'items'} · <b className="text-[#3a4157]">{totalUnits}</b> units
                        </p>
                        <Button type="submit" variant="brand" disabled={processing || validLines.length === 0}>
                            {processing ? 'Saving…' : 'Save receipt'}
                        </Button>
                    </div>
                </form>

                {/* ---------- Side column ---------- */}
                <div className="space-y-6">
                    {needsRestock.length > 0 && (
                        <section className="rounded-lg border border-[#bccad6] bg-white p-5">
                            <h3 className="text-sm font-semibold text-[#3a4157]">Needs restocking</h3>
                            <p className="mt-0.5 text-xs text-[#667292]">Out of stock or at its reorder level. Click to add to the receipt.</p>
                            <ul className="mt-3 space-y-2">
                                {needsRestock.slice(0, 8).map((v) => (
                                    <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="min-w-0 flex-1 truncate">{v.label}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[v.status]}`}>{v.stock} left</span>
                                        <button type="button" onClick={() => addSuggested(v)} disabled={usedIds.has(String(v.id))}
                                            className="text-xs font-semibold text-[#667292] hover:underline disabled:opacity-40 disabled:no-underline">
                                            {usedIds.has(String(v.id)) ? 'Added' : 'Add'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section className="rounded-lg border border-[#bccad6] bg-white p-5">
                        <h3 className="text-sm font-semibold text-[#3a4157]">Recent receipts</h3>
                        {receipts.length === 0 ? (
                            <p className="mt-3 text-sm text-[#667292]">Nothing received yet. Your first receipt will show up here.</p>
                        ) : (
                            <ul className="mt-3 space-y-3">
                                {receipts.map((r) => {
                                    const units = r.items.reduce((s, i) => s + i.quantity, 0);
                                    return (
                                        <li key={r.id} className="rounded-md border border-[#bccad6] p-3">
                                            <div className="flex items-center justify-between gap-2 text-sm">
                                                <span className="font-medium">#{r.id}{r.supplier ? ` · ${r.supplier}` : ''}</span>
                                                <span className="text-xs text-[#667292]">{formatDate(r.received_at)}</span>
                                            </div>
                                            <p className="mt-0.5 text-xs text-[#667292]">
                                                {r.reference ? `Ref ${r.reference} · ` : ''}{units} units{r.user?.name ? ` · by ${r.user.name}` : ''}
                                            </p>
                                            <ul className="mt-2 space-y-0.5 text-xs">
                                                {r.items.map((i) => (
                                                    <li key={i.id} className="flex justify-between gap-2">
                                                        <span className="truncate">
                                                            {i.variant?.brand?.item?.item_name} — {i.variant?.brand?.brand_name}
                                                        </span>
                                                        <span className="font-medium text-emerald-700">+{i.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>
            </div>

            <StockToast icon="in" message={toast} title="Stock received" onClose={() => setToast(null)} />
        </AuthenticatedLayout>
    );
}