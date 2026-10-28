import { useMemo } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import SearchSelect from '@/Components/ui/SearchSelect';
import { ArrowLeft, FileText, Plus, Trash2 } from 'lucide-react';
import {
    Banner,
    Field,
    IconButton,
    Panel,
    SummaryLine,
    cx,
    currency,
    input,
    inputCls,
} from '@/Components/ui/kit';

/* ------------------------------------------------------------------ *
 * Catalog: the server sends the sellable variants. This accepts the common
 * shapes (flat variants, items with variants, or items > brands > variants)
 * and turns them into one flat list.
 * ------------------------------------------------------------------ */
const normalizeVariant = (v, itemName, brandName) => ({
    id: v.item_variant_id ?? v.id,
    item_name: v.item_name ?? itemName ?? '',
    brand_name: v.brand_name ?? v.brand?.brand_name ?? brandName ?? '',
    spec: [v.unit_of_measure, v.size].filter(Boolean).join(' · '),
    price: v.unit_price ?? v.price ?? null,
});

const flattenCatalog = (catalog) => {
    const list = Array.isArray(catalog) ? catalog : Object.values(catalog ?? {});
    const out = [];

    list.forEach((entry) => {
        if (!entry) return;
        if (Array.isArray(entry.brands)) {
            entry.brands.forEach((b) =>
                (b.variants ?? []).forEach((v) => out.push(normalizeVariant(v, entry.item_name, b.brand_name))),
            );
        } else if (Array.isArray(entry.variants)) {
            entry.variants.forEach((v) => out.push(normalizeVariant(v, entry.item_name, entry.brand_name)));
        } else {
            out.push(normalizeVariant(entry));
        }
    });

    return out.filter((v) => v.id != null);
};

const variantLabel = (v) =>
    [v.item_name, v.brand_name && `— ${v.brand_name}`, v.spec && `(${v.spec})`].filter(Boolean).join(' ');

const baseNumber = (n) => String(n ?? '').match(/^(QT-\d{4}-\d+)(?:-\d+)?$/)?.[1] ?? n;

let keyCounter = 0;
const newKey = () => `row-${++keyCounter}`;
const emptyLine = () => ({ _key: newKey(), item_variant_id: '', quantity: 1, unit_price: 0 });

const contactsOf = (client) => client?.contact_people ?? client?.contactPeople ?? [];

export default function QuotationForm({ clients = [], catalog = [], quotation = null }) {
    const isEditing = Boolean(quotation);
    // Opened from a pipeline card (?from=pipeline): after saving, go back to the board.
    const fromPipeline =
        typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'pipeline';

    const { data, setData, put, processing, errors, clearErrors } = useForm({
        subject: quotation?.subject ?? '',
        client_id: quotation?.client_id ?? '',
        client_contact_person_id: quotation?.client_contact_person_id ?? '',
        valid_until: quotation?.valid_until ?? '',
        note: quotation?.note ?? '',
        terms: quotation?.terms ?? '',
        items:
            quotation?.items?.length > 0
                ? quotation.items.map((i) => ({
                      _key: newKey(),
                      item_variant_id: i.item_variant_id,
                      quantity: i.quantity,
                      unit_price: i.unit_price,
                  }))
                : [emptyLine()],
    });

    /* ---------------------------- options ---------------------------- */
    const variants = useMemo(() => {
        const list = flattenCatalog(catalog);
        const known = new Set(list.map((v) => v.id));

        // Lines already on the quotation stay selectable even if the catalog no longer lists them.
        (quotation?.items ?? []).forEach((i) => {
            if (!known.has(i.item_variant_id)) {
                list.push(normalizeVariant({ id: i.item_variant_id, item_name: i.item_name, brand_name: i.brand_name }));
                known.add(i.item_variant_id);
            }
        });

        return list;
    }, [catalog, quotation]);

    const variantById = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants]);
    const variantOptions = useMemo(() => variants.map((v) => ({ value: v.id, label: variantLabel(v) })), [variants]);

    const clientOptions = useMemo(
        () => clients.map((c) => ({ value: c.id, label: c.client_name })),
        [clients],
    );

    const selectedClient = clients.find((c) => String(c.id) === String(data.client_id));
    const contactOptions = useMemo(
        () => contactsOf(selectedClient).map((p) => ({ value: p.id, label: p.contact_person })),
        [selectedClient],
    );

    /* ----------------------------- helpers ----------------------------- */
    const updateField = (field, value) => {
        setData(field, value);
        if (String(value ?? '').trim() !== '') clearErrors(field);
    };

    const changeClient = (clientId) => {
        // A contact person belongs to one client, so reset it when the client changes.
        setData((prev) => ({ ...prev, client_id: clientId, client_contact_person_id: '' }));
        clearErrors('client_id', 'client_contact_person_id');
    };

    const updateLine = (index, patch) =>
        setData(
            'items',
            data.items.map((line, i) => (i === index ? { ...line, ...patch } : line)),
        );

    const pickVariant = (index, variantId) => {
        const v = variantById.get(variantId);
        const patch = { item_variant_id: variantId };
        // Suggest the catalog price when the line has no price yet.
        if (v?.price != null && !Number(data.items[index].unit_price)) patch.unit_price = v.price;
        updateLine(index, patch);
        clearErrors(`items.${index}.item_variant_id`);
    };

    const addLine = () => setData('items', [...data.items, emptyLine()]);
    const removeLine = (index) => setData('items', data.items.filter((_, i) => i !== index));

    const total = useMemo(
        () => data.items.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0),
        [data.items],
    );

    const submit = (e) => {
        e.preventDefault();
        if (!isEditing) return; // quotations are created by the pipeline, not from this form
        put(route('quotations.update', { quotation: quotation.id, ...(fromPipeline ? { from: 'pipeline' } : {}) }));
    };

    const hasErrors = Object.keys(errors ?? {}).length > 0;
    const listUrl = fromPipeline ? route('pipelines.index') : route('quotations.index');
    const nextNumber = isEditing ? `${baseNumber(quotation.quotation_number)}-${(quotation.version ?? 0) + 1}` : null;

    const lineGrid = 'sm:grid-cols-[minmax(0,2.4fr)_90px_130px_130px_32px]';
    const mobileLabel = 'mb-1 block text-xs font-medium text-slate-500 sm:hidden';

    return (
        <form onSubmit={submit} noValidate className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
            <Link href={listUrl} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                {fromPipeline ? 'Pipeline' : 'Quotations'}
            </Link>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-5">
                    <Panel title="Quotation details" description="Who is it for, and what is it about?" icon={FileText}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Subject" required htmlFor="subject" error={errors.subject} className="md:col-span-2">
                                <input
                                    id="subject"
                                    type="text"
                                    placeholder="e.g. Paint supplies for Building A"
                                    value={data.subject}
                                    onChange={(e) => updateField('subject', e.target.value)}
                                    className={input(errors.subject)}
                                />
                            </Field>

                            <Field label="Client" required htmlFor="client_id" error={errors.client_id}>
                                <SearchSelect
                                    id="client_id"
                                    ariaLabel="Client"
                                    placeholder="Select client"
                                    searchPlaceholder="Type a client"
                                    emptyText="No clients found"
                                    options={clientOptions}
                                    value={data.client_id}
                                    onChange={changeClient}
                                    inputClassName={input(errors.client_id)}
                                />
                            </Field>

                            <Field
                                label="Contact person"
                                required
                                htmlFor="client_contact_person_id"
                                error={errors.client_contact_person_id}
                            >
                                <SearchSelect
                                    id="client_contact_person_id"
                                    ariaLabel="Contact person"
                                    placeholder={data.client_id ? 'Select contact person' : 'Select a client first'}
                                    searchPlaceholder="Type a name"
                                    emptyText="No contact people found"
                                    options={contactOptions}
                                    value={data.client_contact_person_id}
                                    onChange={(v) => updateField('client_contact_person_id', v)}
                                    inputClassName={input(errors.client_contact_person_id)}
                                />
                            </Field>

                            <Field label="Valid until" htmlFor="valid_until" error={errors.valid_until}>
                                <input
                                    id="valid_until"
                                    type="date"
                                    value={data.valid_until ?? ''}
                                    onChange={(e) => updateField('valid_until', e.target.value)}
                                    className={input(errors.valid_until)}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">Items</h3>
                                <p className="text-xs text-slate-500">What is being offered, and at what price.</p>
                            </div>
                            <Button type="button" variant="outline" onClick={addLine}>
                                <Plus />
                                Add item
                            </Button>
                        </header>

                        {typeof errors.items === 'string' && <p className="px-5 pt-3 text-xs text-red-600">{errors.items}</p>}

                        <div className={cx('hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500 sm:grid', lineGrid)}>
                            <span>Item</span>
                            <span>Qty</span>
                            <span>Unit price</span>
                            <span className="text-right">Subtotal</span>
                            <span />
                        </div>

                        <div className="divide-y divide-slate-100">
                            {data.items.map((line, index) => {
                                const key = (f) => `items.${index}.${f}`;
                                const subtotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);

                                return (
                                    <div key={line._key} className={cx('grid grid-cols-1 gap-3 px-5 py-3 sm:items-start', lineGrid)}>
                                        <div>
                                            <span className={mobileLabel}>Item</span>
                                            <SearchSelect
                                                ariaLabel="Item"
                                                placeholder="Select item"
                                                searchPlaceholder="Type an item or brand"
                                                emptyText="No items found"
                                                options={variantOptions}
                                                value={line.item_variant_id}
                                                onChange={(v) => pickVariant(index, v)}
                                                inputClassName={input(errors[key('item_variant_id')])}
                                            />
                                            {errors[key('item_variant_id')] && (
                                                <p className="mt-1 text-xs text-red-600">{errors[key('item_variant_id')]}</p>
                                            )}
                                        </div>

                                        <div>
                                            <span className={mobileLabel}>Qty</span>
                                            <input
                                                aria-label="Quantity"
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                                                className={input(errors[key('quantity')])}
                                            />
                                            {errors[key('quantity')] && <p className="mt-1 text-xs text-red-600">{errors[key('quantity')]}</p>}
                                        </div>

                                        <div>
                                            <span className={mobileLabel}>Unit price</span>
                                            <input
                                                aria-label="Unit price"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.unit_price}
                                                onChange={(e) => updateLine(index, { unit_price: e.target.value })}
                                                className={input(errors[key('unit_price')])}
                                            />
                                            {errors[key('unit_price')] && <p className="mt-1 text-xs text-red-600">{errors[key('unit_price')]}</p>}
                                        </div>

                                        <div className="flex items-center justify-between sm:h-9 sm:justify-end">
                                            <span className="text-xs text-slate-500 sm:hidden">Subtotal</span>
                                            <span className="text-sm font-semibold tabular-nums text-slate-900">{currency(subtotal)}</span>
                                        </div>

                                        <div className="flex justify-end sm:h-9 sm:items-center">
                                            {data.items.length > 1 && (
                                                <IconButton icon={Trash2} label="Remove item" danger onClick={() => removeLine(index)} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <Panel title="Terms and notes" description="Terms are printed on the quotation. The note is internal.">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Terms" htmlFor="terms" error={errors.terms}>
                                <textarea
                                    id="terms"
                                    rows={4}
                                    placeholder="Price is valid for 30 days."
                                    value={data.terms ?? ''}
                                    onChange={(e) => updateField('terms', e.target.value)}
                                    className={cx(inputCls, 'resize-y')}
                                />
                            </Field>
                            <Field label="Internal note" htmlFor="note" error={errors.note}>
                                <textarea
                                    id="note"
                                    rows={4}
                                    placeholder="Optional"
                                    value={data.note ?? ''}
                                    onChange={(e) => updateField('note', e.target.value)}
                                    className={cx(inputCls, 'resize-y')}
                                />
                            </Field>
                        </div>
                    </Panel>
                </div>

                {/* Sticky summary */}
                <aside className="xl:sticky xl:top-20">
                    <Panel title="Edit quotation" description="Review, then save.">
                        <dl className="space-y-3">
                            <SummaryLine label="Number">{quotation?.quotation_number ?? '—'}</SummaryLine>
                            <SummaryLine label="Client">{selectedClient?.client_name ?? '—'}</SummaryLine>
                            <SummaryLine label="Items">{data.items.length}</SummaryLine>
                            <SummaryLine label="Total">{currency(total)}</SummaryLine>
                        </dl>

                        {isEditing && (
                            <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                Saving a change keeps the current version in the history and creates{' '}
                                <b className="text-slate-900">{nextNumber}</b>. Saving without changes creates nothing.
                            </p>
                        )}

                        {hasErrors && <Banner tone="error" className="mt-4">Fix the highlighted fields before saving.</Banner>}

                        <div className="mt-5 flex flex-col gap-2">
                            <Button type="submit" variant="brand" className="w-full" disabled={processing || !isEditing}>
                                {processing ? 'Saving…' : 'Save changes'}
                            </Button>
                            <Link href={listUrl} className="block">
                                <Button type="button" variant="outline" className="w-full">Cancel</Button>
                            </Link>
                        </div>
                    </Panel>
                </aside>
            </div>
        </form>
    );
}