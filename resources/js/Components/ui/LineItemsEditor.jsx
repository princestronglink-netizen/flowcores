import { Button } from '@/Components/ui/Button';
import { Package, Plus, Trash2 } from 'lucide-react';
import { IconButton, Panel, currency, cx, input } from '@/Components/ui/kit';

export const emptyLine = (priceField) => ({
    item_id: '', item_brand_id: '', item_variant_id: '', quantity: 1, [priceField]: '',
});

/** Server items (loaded with variant.brand) -> form rows. */
export const linesFromServer = (items = [], priceField) =>
    items.length
        ? items.map((i) => ({
              item_id: i.variant?.brand?.item_id ?? '',
              item_brand_id: i.variant?.brand?.id ?? '',
              item_variant_id: i.item_variant_id,
              quantity: i.quantity,
              [priceField]: i[priceField] ?? '',
          }))
        : [emptyLine(priceField)];

export const linesTotal = (items, priceField) =>
    items.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r[priceField]) || 0), 0);

const rowGrid = 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.5fr)_84px_116px_108px_32px]';
const mobileLabel = 'mb-1 block text-xs font-medium text-slate-500 lg:hidden';

export default function LineItemsEditor({
    items, onChange, catalog = [], errors = {}, clearErrors = () => {},
    priceField = 'unit_price', priceLabel = 'Unit price', autofillPrice = false,
    title = 'Line items', description,
}) {
    const brandsFor = (r) => catalog.find((i) => String(i.id) === String(r.item_id))?.brands ?? [];
    const variantsFor = (r) => brandsFor(r).find((b) => String(b.id) === String(r.item_brand_id))?.variants ?? [];

    const patch = (index, p) => onChange(items.map((r, i) => (i === index ? { ...r, ...p } : r)));
    const changeVariant = (index, id) => {
        const v = variantsFor(items[index]).find((x) => String(x.id) === String(id));
        patch(index, { item_variant_id: id, ...(autofillPrice && v ? { [priceField]: v.price } : {}) });
        clearErrors(`items.${index}.item_variant_id`, `items.${index}.${priceField}`);
    };
    const update = (index, field, value) => {
        patch(index, { [field]: value });
        if (String(value).trim() !== '') clearErrors(`items.${index}.${field}`);
    };

    const variantLabel = (v) =>
        [v.unit_of_measure, v.size].filter(Boolean).join(' · ') +
        (autofillPrice ? ` — ${currency(v.price)}` : ` · ${v.stock} in stock`);

    return (
        <Panel
            title={title}
            description={description}
            icon={Package}
            bodyClass="p-0"
            actions={
                <Button type="button" variant="outline" onClick={() => onChange([...items, emptyLine(priceField)])}>
                    <Plus /> Add item
                </Button>
            }
        >
            {typeof errors.items === 'string' && <p className="px-5 pt-3 text-xs text-red-600">{errors.items}</p>}

            <div className={cx('mt-4 hidden gap-3 border-y border-slate-100 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500 lg:grid', rowGrid)}>
                <span>Item</span><span>Brand</span><span>Variant</span><span>Qty</span>
                <span>{priceLabel}</span><span className="text-right">Subtotal</span><span />
            </div>

            <div className="divide-y divide-slate-100">
                {items.map((row, index) => {
                    const sub = (Number(row.quantity) || 0) * (Number(row[priceField]) || 0);
                    const err = (f) => errors[`items.${index}.${f}`];
                    return (
                        <div key={index} className={cx('grid grid-cols-1 gap-3 px-5 py-3.5 lg:items-start', rowGrid)}>
                            <div>
                                <span className={mobileLabel}>Item</span>
                                <select aria-label="Item" value={row.item_id}
                                    onChange={(e) => patch(index, { item_id: e.target.value, item_brand_id: '', item_variant_id: '', [priceField]: '' })}
                                    className={input(err('item_variant_id') && !row.item_id)}>
                                    <option value="" disabled>Select item</option>
                                    {catalog.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <span className={mobileLabel}>Brand</span>
                                <select aria-label="Brand" value={row.item_brand_id} disabled={!row.item_id}
                                    onChange={(e) => patch(index, { item_brand_id: e.target.value, item_variant_id: '', [priceField]: '' })}
                                    className={input(err('item_variant_id') && row.item_id && !row.item_brand_id)}>
                                    <option value="" disabled>{row.item_id ? 'Select brand' : '—'}</option>
                                    {brandsFor(row).map((b) => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <span className={mobileLabel}>Variant</span>
                                <select aria-label="Variant" value={row.item_variant_id} disabled={!row.item_brand_id}
                                    onChange={(e) => changeVariant(index, e.target.value)} className={input(err('item_variant_id'))}>
                                    <option value="" disabled>{row.item_brand_id ? 'Select variant' : '—'}</option>
                                    {variantsFor(row).map((v) => <option key={v.id} value={v.id}>{variantLabel(v)}</option>)}
                                </select>
                                {err('item_variant_id') && <p className="mt-1 text-xs text-red-600">Select an item, brand and variant.</p>}
                            </div>
                            <div>
                                <span className={mobileLabel}>Qty</span>
                                <input aria-label="Quantity" type="number" min="1" step="1" value={row.quantity}
                                    onChange={(e) => update(index, 'quantity', e.target.value)} className={input(err('quantity'))} />
                                {err('quantity') && <p className="mt-1 text-xs text-red-600">{err('quantity')}</p>}
                            </div>
                            <div>
                                <span className={mobileLabel}>{priceLabel}</span>
                                <input aria-label={priceLabel} type="number" min="0" step="0.01" placeholder="0.00" value={row[priceField]}
                                    onChange={(e) => update(index, priceField, e.target.value)} className={input(err(priceField))} />
                                {err(priceField) && <p className="mt-1 text-xs text-red-600">{err(priceField)}</p>}
                            </div>
                            <div className="flex items-center justify-between lg:h-9 lg:justify-end">
                                <span className={cx(mobileLabel, 'mb-0')}>Subtotal</span>
                                <span className="text-sm font-semibold tabular-nums text-slate-900">{currency(sub)}</span>
                            </div>
                            <div className="flex justify-end lg:h-9 lg:items-center">
                                {items.length > 1 && (
                                    <IconButton icon={Trash2} label="Remove item" danger
                                        onClick={() => onChange(items.filter((_, i) => i !== index))} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm">
                <span className="text-slate-500">Total</span>
                <span className="text-base font-semibold tabular-nums text-slate-900">{currency(linesTotal(items, priceField))}</span>
            </div>
        </Panel>
    );
}