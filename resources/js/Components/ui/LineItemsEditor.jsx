import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import SearchSelect from '@/Components/ui/SearchSelect';
import { AlertTriangle, Lock, Package, Plus, Trash2 } from 'lucide-react';
import { IconButton, Panel, currency, cx, input, inputCls } from '@/Components/ui/kit';

export const emptyLine = (priceField = 'unit_price') => ({
    item_id: '', item_brand_id: '', item_variant_id: '', quantity: 1, [priceField]: '',
});

/** Server items (loaded with variant.brand) -> form rows. */
export const linesFromServer = (items = [], priceField = 'unit_price') =>
    items.length
        ? items.map((i) => ({
              item_id: i.variant?.brand?.item_id ?? '',
              item_brand_id: i.variant?.brand?.id ?? '',
              item_variant_id: i.item_variant_id ?? '',
              quantity: i.quantity ?? 1,
              [priceField]: i[priceField] ?? '',
          }))
        : [emptyLine(priceField)];

export const linesTotal = (items, priceField = 'unit_price') =>
    items.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r[priceField]) || 0), 0);

/** Lines that share a variant with another line, as { lineIndex: [other line numbers] }. */
export const duplicateLines = (items) => {
    const byVariant = {};
    items.forEach((r, i) => {
        if (!r.item_variant_id) return;
        const k = String(r.item_variant_id);
        byVariant[k] = [...(byVariant[k] ?? []), i];
    });
    const out = {};
    Object.values(byVariant).forEach((idxs) => {
        if (idxs.length < 2) return;
        idxs.forEach((i) => { out[i] = idxs.filter((x) => x !== i).map((x) => x + 1); });
    });
    return out;
};

/** How many lines repeat another line's variant. */
export const duplicateLineCount = (items) => Object.keys(duplicateLines(items)).length;

/** True when two lines pick the same variant (the server rejects this too). */
export const hasDuplicateLines = (items) => duplicateLineCount(items) > 0;

const rowGrid = 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.5fr)_84px_116px_108px_32px]';
const mobileLabel = 'mb-1 block text-xs font-medium text-slate-500 lg:hidden';

// Typed numbers only: no spinner arrows, no mouse-wheel changes.
const intOnly = (v) => String(v).replace(/\D/g, '');
const decimalOnly = (v) => {
    const [whole, ...rest] = String(v).replace(/[^\d.]/g, '').split('.');
    return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
};

const variantLabel = (v) => [v.unit_of_measure, v.size].filter(Boolean).join(' · ');

/**
 * locked     read-only: inputs disabled, no Add / Remove / category filter (used once goods are delivered)
 * delivered  array of delivered quantities, one per row (same order as items). Shown only when locked.
 * notice     anything to show above the table (e.g. the "Items are locked" banner)
 */
export default function LineItemsEditor({
    items, onChange, catalog = [], errors = {}, clearErrors = () => {},
    priceField = 'unit_price', priceLabel = 'Unit price',
    title = 'Line items', description,
    locked = false, delivered = null, notice = null,
}) {
    const [categoryFilter, setCategoryFilter] = useState('');

    const categories = useMemo(() => {
        const map = new Map();
        catalog.forEach((i) => i.category && map.set(i.category.id, i.category));
        return [...map.values()].sort((a, b) => a.category_name.localeCompare(b.category_name));
    }, [catalog]);

    const itemsFor = () =>
        catalog.filter((i) => !categoryFilter || String(i.item_category_id) === String(categoryFilter));
    const brandsFor = (r) => catalog.find((i) => String(i.id) === String(r.item_id))?.brands ?? [];
    const variantsFor = (r) => brandsFor(r).find((b) => String(b.id) === String(r.item_brand_id))?.variants ?? [];
    const variantFor = (r) => variantsFor(r).find((v) => String(v.id) === String(r.item_variant_id));

    const duplicateOf = useMemo(() => (locked ? {} : duplicateLines(items)), [items, locked]);

    const patch = (index, p) => {
        if (locked) return;
        onChange(items.map((r, i) => (i === index ? { ...r, ...p } : r)));
    };
    const changeVariant = (index, id) => {
        patch(index, { item_variant_id: id });
        clearErrors(`items.${index}.item_variant_id`);
    };
    const update = (index, field, value) => {
        patch(index, { [field]: value });
        if (String(value).trim() !== '') clearErrors(`items.${index}.${field}`);
    };

    return (
        <Panel
            title={title}
            description={description}
            icon={Package}
            bodyClass="p-0"
            actions={
                !locked && (
                    <select
                        aria-label="Filter items by category"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className={cx(inputCls, 'h-8 w-44 text-[13px]')}
                    >
                        <option value="">All categories</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.category_name}</option>
                        ))}
                    </select>
                )
            }
        >
            {notice && <div className="p-4 pb-0">{notice}</div>}

            {catalog.length === 0 && !locked && (
                <p className="px-5 py-4 text-sm text-slate-500">
                    No items in the catalog yet.{' '}
                    <Link href={route('items.create')} className="font-medium text-[#667292] underline">
                        Create one first
                    </Link>
                </p>
            )}

            {typeof errors.items === 'string' && <p className="px-5 pt-3 text-xs text-red-600">{errors.items}</p>}

            {/* Column headers (desktop) */}
            <div className={cx('mt-4 hidden gap-3 border-y border-slate-100 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500 lg:grid', rowGrid)}>
                <span>Item</span>
                <span>Brand</span>
                <span>Variant</span>
                <span>Qty</span>
                <span>{priceLabel}</span>
                <span className="text-right">Subtotal</span>
                <span />
            </div>

            <div className="divide-y divide-slate-100">
                {items.map((row, index) => {
                    const sub = (Number(row.quantity) || 0) * (Number(row[priceField]) || 0);
                    const err = (f) => errors[`items.${index}.${f}`];
                    const variantError = err('item_variant_id');
                    const selected = variantFor(row);
                    const over = !locked && selected && Number(row.quantity) > Number(selected.stock);
                    const isDuplicate = Boolean(duplicateOf[index]);
                    const lineDelivered = Number(delivered?.[index] ?? 0);

                    return (
                        <div
                            key={index}
                            className={cx(
                                'grid grid-cols-1 gap-3 px-5 py-3.5 lg:items-start',
                                rowGrid,
                                isDuplicate && 'bg-amber-50/70',
                            )}
                        >
                            <div>
                                <span className={mobileLabel}>Item</span>
                                <SearchSelect
                                    ariaLabel="Item"
                                    placeholder="Select item"
                                    searchPlaceholder="Type an item name"
                                    emptyText="No items found"
                                    options={itemsFor().map((i) => ({ value: i.id, label: i.item_name }))}
                                    value={row.item_id}
                                    onChange={(v) => patch(index, { item_id: v, item_brand_id: '', item_variant_id: '' })}
                                    disabled={locked}
                                    inputClassName={input(variantError && !row.item_id)}
                                />
                            </div>

                            <div>
                                <span className={mobileLabel}>Brand</span>
                                <SearchSelect
                                    ariaLabel="Brand"
                                    placeholder={row.item_id ? 'Select brand' : '—'}
                                    searchPlaceholder="Type a brand"
                                    emptyText="No brands found"
                                    options={brandsFor(row).map((b) => ({ value: b.id, label: b.brand_name }))}
                                    value={row.item_brand_id}
                                    onChange={(v) => patch(index, { item_brand_id: v, item_variant_id: '' })}
                                    disabled={locked || !row.item_id}
                                    inputClassName={input(variantError && row.item_id && !row.item_brand_id)}
                                />
                            </div>

                            <div>
                                <span className={mobileLabel}>Variant</span>
                                <SearchSelect
                                    ariaLabel="Variant"
                                    placeholder={row.item_brand_id ? 'Select variant' : '—'}
                                    searchPlaceholder="Type a size or unit"
                                    emptyText="No variants found"
                                    options={variantsFor(row).map((v) => ({
                                        value: v.id,
                                        label: variantLabel(v),
                                        hint: `${v.stock} in stock`,
                                    }))}
                                    value={row.item_variant_id}
                                    onChange={(v) => changeVariant(index, v)}
                                    disabled={locked || !row.item_brand_id}
                                    inputClassName={cx(
                                        input(variantError),
                                        isDuplicate && '!border-amber-500 !bg-amber-50 focus:!border-amber-600',
                                    )}
                                />
                                {variantError && <p className="mt-1 text-xs text-red-600">Select an item, brand and variant.</p>}

                                {locked ? (
                                    delivered && (
                                        <p className={cx('mt-1 text-xs', lineDelivered >= Number(row.quantity) ? 'text-emerald-600' : 'text-slate-500')}>
                                            Delivered {lineDelivered} of {row.quantity}
                                        </p>
                                    )
                                ) : (
                                    selected && (
                                        <p className={cx('mt-1 text-xs', over ? 'font-medium text-orange-600' : 'text-slate-500')}>
                                            {over ? `Only ${selected.stock} in stock` : `${selected.stock} in stock`}
                                        </p>
                                    )
                                )}

                                {isDuplicate && (
                                    <p className="mt-1 flex items-start gap-1 text-xs font-medium text-amber-700">
                                        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            Same item and variant as line {duplicateOf[index].join(', ')}. Choose a different
                                            variant, or remove one of the lines, before saving.
                                        </span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <span className={mobileLabel}>Qty</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    aria-label="Quantity"
                                    value={row.quantity}
                                    onChange={(e) => update(index, 'quantity', intOnly(e.target.value))}
                                    disabled={locked}
                                    className={input(err('quantity'))}
                                />
                                {err('quantity') && <p className="mt-1 text-xs text-red-600">{err('quantity')}</p>}
                            </div>

                            <div>
                                <span className={mobileLabel}>{priceLabel}</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    aria-label={priceLabel}
                                    placeholder="0.00"
                                    value={row[priceField]}
                                    onChange={(e) => update(index, priceField, decimalOnly(e.target.value))}
                                    disabled={locked}
                                    className={input(err(priceField))}
                                />
                                {err(priceField) && <p className="mt-1 text-xs text-red-600">{err(priceField)}</p>}
                            </div>

                            <div className="flex items-center justify-between lg:h-9 lg:justify-end">
                                <span className={cx(mobileLabel, 'mb-0')}>Subtotal</span>
                                <span className="text-sm font-semibold tabular-nums text-slate-900">{currency(sub)}</span>
                            </div>

                            <div className="flex justify-end lg:h-9 lg:items-center">
                                {locked ? (
                                    <Lock className="h-4 w-4 text-slate-300" aria-label="Locked" />
                                ) : (
                                    items.length > 1 && (
                                        <IconButton
                                            icon={Trash2}
                                            label="Remove item"
                                            danger
                                            onClick={() => onChange(items.filter((_, i) => i !== index))}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom row: Add item on the left, subtotal on the right */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm">
                {locked ? (
                    <span />
                ) : (
                    <Button type="button" variant="outline" onClick={() => onChange([...items, emptyLine(priceField)])}>
                        <Plus />
                        Add item
                    </Button>
                )}
                <div className="flex items-center gap-3">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-base font-semibold tabular-nums text-slate-900">
                        {currency(linesTotal(items, priceField))}
                    </span>
                </div>
            </div>
        </Panel>
    );
}