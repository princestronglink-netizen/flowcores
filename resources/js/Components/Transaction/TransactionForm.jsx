import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import {
    ArrowLeft,
    Building2,
    Lock,
    Package,
    Plus,
    Receipt,
    StickyNote,
    Trash2,
    Trophy,
    UserRound,
    X,
} from 'lucide-react';
import {
    Banner,
    Field,
    IconButton,
    LinkButton,
    Panel,
    PriorityPill,
    PRIORITIES,
    Segmented,
    SummaryLine,
    currency,
    cx,
    input,
    inputCls,
    textareaCls,
} from '@/Components/ui/kit';

// category_id is only used to narrow the Item dropdown; the server saves item_variant_id, quantity and unit_price.
const emptyItem = () => ({ item_id: '', item_brand_id: '', item_variant_id: '', quantity: 1, unit_price: '' });

const emptyForm = () => ({
    name: '',
    client_id: '',
    client_contact_person_id: '',
    priority: 'Medium',
    winning_message: '',
    items: [emptyItem()],
    note: '',
});

const variantLabel = (v) => [v.unit_of_measure, v.size].filter(Boolean).join(' · ') + ` — ${currency(v.price)}`;

const rowGrid = 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.5fr)_84px_116px_108px_32px]';
const mobileLabel = 'mb-1 block text-xs font-medium text-slate-500 lg:hidden';

/**
 * itemsLocked: true once a delivery exists (or the order was deducted the old way).
 * Items, quantities and prices are then read-only; everything else stays editable.
 * The server enforces the same rule; this keeps the form honest about it.
 */
export default function TransactionForm({ clients = [], catalog = [], transaction = null, itemsLocked = false }) {
    const isEditing = Boolean(transaction);

    const [showWinningMessage, setShowWinningMessage] = useState(Boolean(transaction?.winning_message));
    const [clientList, setClientList] = useState(clients);
    const [showAddClient, setShowAddClient] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);
    const [newClient, setNewClient] = useState({ client_code: '', client_name: '', contact_person: '', contact_number: '', email: '' });
    const [newContact, setNewContact] = useState({ contact_person: '', contact_number: '', email: '' });
    const [quickErrors, setQuickErrors] = useState({});
    const [quickProcessing, setQuickProcessing] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');

    const initialData = transaction
        ? {
              name: transaction.name ?? '',
              client_id: transaction.client_id ?? transaction.client?.id ?? '',
              client_contact_person_id: transaction.client_contact_person_id ?? transaction.contact_person?.id ?? '',
              priority: transaction.priority ?? 'Medium',
              winning_message: transaction.winning_message ?? '',
              items:
                  transaction.items?.length > 0
                      ? transaction.items.map((i) => ({
                            item_id: i.variant?.brand?.item_id ?? '',
                            item_brand_id: i.variant?.brand?.id ?? '',
                            item_variant_id: i.item_variant_id ?? '',
                            quantity: i.quantity ?? 1,
                            unit_price: i.unit_price ?? '',
                        }))
                      : [emptyItem()],
              note: transaction.note ?? '',
          }
        : emptyForm();

    const { data, setData, post, put, processing, errors, clearErrors } = useForm(initialData);
    const items = data.items ?? [emptyItem()];

    useEffect(() => setClientList(clients), [clients]);

    const selectedClient = useMemo(
        () => clientList.find((c) => String(c.id) === String(data.client_id)),
        [clientList, data.client_id],
    );
    const contactOptions = selectedClient?.contact_people ?? [];
    const selectedContact = contactOptions.find((c) => String(c.id) === String(data.client_contact_person_id));

    // ---- catalog lookups ----
    const categories = useMemo(() => {
        const map = new Map();
        catalog.forEach((i) => i.category && map.set(i.category.id, i.category));
        return [...map.values()].sort((a, b) => a.category_name.localeCompare(b.category_name));
    }, [catalog]);

    const itemsFor = () =>
        catalog.filter((i) => !categoryFilter || String(i.item_category_id) === String(categoryFilter));
    const brandsFor = (row) => catalog.find((i) => String(i.id) === String(row.item_id))?.brands ?? [];
    const variantsFor = (row) =>
        brandsFor(row).find((b) => String(b.id) === String(row.item_brand_id))?.variants ?? [];
    const variantFor = (row) => variantsFor(row).find((v) => String(v.id) === String(row.item_variant_id));

    // ---- totals ----
    const total = useMemo(
        () => items.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0),
        [items],
    );
    const deliveredAt = (index) => Number(transaction?.items?.[index]?.delivered_quantity ?? 0);
    const orderedDelivered = itemsLocked
        ? (transaction?.items ?? []).reduce((s, l) => s + Number(l.delivered_quantity ?? 0), 0)
        : 0;
    const orderedTotal = itemsLocked ? (transaction?.items ?? []).reduce((s, l) => s + Number(l.quantity ?? 0), 0) : 0;

    // Two rows can share a variant, so add them up before comparing with stock.
    const shortages = useMemo(() => {
        if (itemsLocked) return [];
        const need = {};
        items.forEach((r) => {
            if (r.item_variant_id) need[r.item_variant_id] = (need[r.item_variant_id] || 0) + (Number(r.quantity) || 0);
        });
        return Object.entries(need)
            .map(([id, qty]) => {
                const v = catalog.flatMap((i) => i.brands.flatMap((b) => b.variants)).find((x) => String(x.id) === id);
                return v && qty > Number(v.stock) ? { id, qty, stock: Number(v.stock) } : null;
            })
            .filter(Boolean);
    }, [items, catalog, itemsLocked]);

    // ---- form helpers ----
    const updateField = (field, value) => {
        setData(field, value);
        if (String(value).trim() !== '') clearErrors(field);
    };

    const handleClientChange = (value) => {
        setData((prev) => ({ ...prev, client_id: value, client_contact_person_id: '' }));
        clearErrors('client_id');
    };

    const patchItem = (index, patch) => {
        if (itemsLocked) return;
        setData('items', items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    };
    const changeItem = (i, v) => patchItem(i, { item_id: v, item_brand_id: '', item_variant_id: '', unit_price: '' });
    const changeBrand = (i, v) => patchItem(i, { item_brand_id: v, item_variant_id: '', unit_price: '' });
    const changeVariant = (i, variantId) => {
        const variant = variantsFor(items[i]).find((v) => String(v.id) === String(variantId));
        patchItem(i, { item_variant_id: variantId, unit_price: variant ? variant.price : '' });
        clearErrors(`items.${i}.item_variant_id`, `items.${i}.unit_price`);
    };
    const updateItem = (i, field, value) => {
        patchItem(i, { [field]: value });
        if (String(value).trim() !== '') clearErrors(`items.${i}.${field}`);
    };
    const addItem = () => !itemsLocked && setData('items', [...items, emptyItem()]);
    const removeItem = (i) => !itemsLocked && setData('items', items.filter((_, idx) => idx !== i));

    // ---- quick add ----
    const submitNewClient = async () => {
        setQuickProcessing(true);
        setQuickErrors({});
        try {
            const { data: created } = await axios.post(route('clients.quickStore'), newClient);
            setClientList((prev) => [...prev, created]);
            setData((prev) => ({
                ...prev,
                client_id: created.id,
                client_contact_person_id: created.contact_people[0]?.id ?? '',
            }));
            clearErrors('client_id', 'client_contact_person_id');
            setNewClient({ client_code: '', client_name: '', contact_person: '', contact_number: '', email: '' });
            setShowAddClient(false);
        } catch (err) {
            if (err.response?.status === 422) setQuickErrors(err.response.data.errors);
        } finally {
            setQuickProcessing(false);
        }
    };

    const submitNewContact = async () => {
        if (!data.client_id) return;
        setQuickProcessing(true);
        setQuickErrors({});
        try {
            const { data: created } = await axios.post(route('clients.quickStoreContact', data.client_id), newContact);
            setClientList((prev) =>
                prev.map((c) =>
                    String(c.id) === String(data.client_id)
                        ? { ...c, contact_people: [...(c.contact_people ?? []), created] }
                        : c,
                ),
            );
            setData('client_contact_person_id', created.id);
            clearErrors('client_contact_person_id');
            setNewContact({ contact_person: '', contact_number: '', email: '' });
            setShowAddContact(false);
        } catch (err) {
            if (err.response?.status === 422) setQuickErrors(err.response.data.errors);
        } finally {
            setQuickProcessing(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        if (isEditing) put(route('transactions.update', transaction.id));
        else post(route('transactions.store'));
    };

    const hasErrors = Object.keys(errors ?? {}).length > 0;
    const listUrl = route('transactions.index');
    const quickBox = 'mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3';

    return (
        <form onSubmit={submit} noValidate className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
            <Link href={listUrl} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                Transactions
            </Link>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                {/* ---------------- Main column ---------------- */}
                <div className="min-w-0 space-y-5">
                    <Panel title="Overview" description="Name this transaction and set how urgent it is." icon={Receipt}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Transaction name" required htmlFor="transaction_name" error={errors.name}>
                                <input
                                    id="transaction_name"
                                    type="text"
                                    placeholder="e.g. Acme Corp — Annual Renewal"
                                    value={data.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className={input(errors.name)}
                                />
                            </Field>
                            <Field label="Priority" error={errors.priority}>
                                <Segmented
                                    label="Priority"
                                    options={PRIORITIES}
                                    value={data.priority}
                                    onChange={(v) => updateField('priority', v)}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Client" description="Who is this transaction with?" icon={Building2}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Field
                                    label="Client"
                                    required
                                    htmlFor="client_id"
                                    error={errors.client_id}
                                    action={
                                        <LinkButton icon={Plus} onClick={() => setShowAddClient((v) => !v)}>
                                            New client
                                        </LinkButton>
                                    }
                                >
                                    <select
                                        id="client_id"
                                        value={data.client_id}
                                        onChange={(e) => handleClientChange(e.target.value)}
                                        className={input(errors.client_id)}
                                    >
                                        <option value="" disabled>Select a client</option>
                                        {clientList.map((c) => (
                                            <option key={c.id} value={c.id}>{c.client_name}</option>
                                        ))}
                                    </select>
                                </Field>

                                {showAddClient && (
                                    <div className={quickBox}>
                                        {[
                                            ['client_code', 'Client code'],
                                            ['client_name', 'Client name'],
                                            ['contact_person', 'Contact person'],
                                        ].map(([key, placeholder]) => (
                                            <div key={key}>
                                                <input
                                                    type="text"
                                                    placeholder={placeholder}
                                                    value={newClient[key]}
                                                    onChange={(e) => setNewClient((p) => ({ ...p, [key]: e.target.value }))}
                                                    className={input(quickErrors[key])}
                                                />
                                                {quickErrors[key] && <p className="mt-1 text-xs text-red-600">{quickErrors[key][0]}</p>}
                                            </div>
                                        ))}
                                        <div className="flex justify-end gap-2 pt-1">
                                            <Button type="button" variant="outline" onClick={() => setShowAddClient(false)}>Cancel</Button>
                                            <Button type="button" variant="brand" onClick={submitNewClient} disabled={quickProcessing}>
                                                Add client
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Field
                                    label="Contact person"
                                    required
                                    htmlFor="client_contact_person_id"
                                    error={errors.client_contact_person_id}
                                    hint={!data.client_id ? 'Pick a client first to see its contacts.' : undefined}
                                    action={
                                        data.client_id && (
                                            <LinkButton icon={Plus} onClick={() => setShowAddContact((v) => !v)}>
                                                New contact
                                            </LinkButton>
                                        )
                                    }
                                >
                                    <select
                                        id="client_contact_person_id"
                                        value={data.client_contact_person_id}
                                        onChange={(e) => updateField('client_contact_person_id', e.target.value)}
                                        disabled={!data.client_id}
                                        className={input(errors.client_contact_person_id)}
                                    >
                                        <option value="" disabled>
                                            {data.client_id ? 'Select a contact person' : 'Select a client first'}
                                        </option>
                                        {contactOptions.map((p) => (
                                            <option key={p.id} value={p.id}>{p.contact_person}</option>
                                        ))}
                                    </select>
                                </Field>

                                {showAddContact && (
                                    <div className={quickBox}>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Contact person name"
                                                value={newContact.contact_person}
                                                onChange={(e) => setNewContact((p) => ({ ...p, contact_person: e.target.value }))}
                                                className={input(quickErrors.contact_person)}
                                            />
                                            {quickErrors.contact_person && (
                                                <p className="mt-1 text-xs text-red-600">{quickErrors.contact_person[0]}</p>
                                            )}
                                        </div>
                                        <input
                                            type="tel"
                                            placeholder="Contact number (optional)"
                                            value={newContact.contact_number}
                                            onChange={(e) => setNewContact((p) => ({ ...p, contact_number: e.target.value }))}
                                            className={inputCls}
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email (optional)"
                                            value={newContact.email}
                                            onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                                            className={inputCls}
                                        />
                                        <div className="flex justify-end gap-2 pt-1">
                                            <Button type="button" variant="outline" onClick={() => setShowAddContact(false)}>Cancel</Button>
                                            <Button type="button" variant="brand" onClick={submitNewContact} disabled={quickProcessing}>
                                                Add contact
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Panel>

                    <Panel
                        title="Line items"
                        description={
                            itemsLocked
                                ? 'Locked because deliveries have been recorded.'
                                : 'Pick an item, brand and variant. The price fills in automatically.'
                        }
                        icon={Package}
                        bodyClass="p-0"
                        actions={
                            !itemsLocked && (
                                <>
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
                                    <Button type="button" variant="outline" onClick={addItem}>
                                        <Plus />
                                        Add item
                                    </Button>
                                </>
                            )
                        }
                    >
                        {itemsLocked && (
                            <div className="p-4 pb-0">
                                <Banner tone="warning" icon={Lock} title={`Items are locked (${orderedDelivered} of ${orderedTotal} delivered)`}>
                                    Items, quantities and prices can't change once goods are delivered, because that would break the
                                    delivery and stock records. You can still edit the client, priority and notes. If the order really
                                    changed, mark this deal as lost and create a new transaction.
                                </Banner>
                            </div>
                        )}

                        {catalog.length === 0 && !itemsLocked && (
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
                            <span>Unit price</span>
                            <span className="text-right">Subtotal</span>
                            <span />
                        </div>

                        <div className="divide-y divide-slate-100">
                            {items.map((item, index) => {
                                const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                                const selectedVariant = variantFor(item);
                                const over = !itemsLocked && selectedVariant && Number(item.quantity) > Number(selectedVariant.stock);
                                const variantError = errors[`items.${index}.item_variant_id`];
                                const lineDelivered = deliveredAt(index);

                                return (
                                    <div key={index} className={cx('grid grid-cols-1 gap-3 px-5 py-3.5 lg:items-start', rowGrid)}>
                                        <div>
                                            <span className={mobileLabel}>Item</span>
                                            <select
                                                value={item.item_id}
                                                onChange={(e) => changeItem(index, e.target.value)}
                                                disabled={itemsLocked}
                                                aria-label="Item"
                                                className={input(variantError && !item.item_id)}
                                            >
                                                <option value="" disabled>Select item</option>
                                                {itemsFor().map((i) => (
                                                    <option key={i.id} value={i.id}>{i.item_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <span className={mobileLabel}>Brand</span>
                                            <select
                                                value={item.item_brand_id}
                                                onChange={(e) => changeBrand(index, e.target.value)}
                                                disabled={itemsLocked || !item.item_id}
                                                aria-label="Brand"
                                                className={input(variantError && item.item_id && !item.item_brand_id)}
                                            >
                                                <option value="" disabled>{item.item_id ? 'Select brand' : '—'}</option>
                                                {brandsFor(item).map((b) => (
                                                    <option key={b.id} value={b.id}>{b.brand_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <span className={mobileLabel}>Variant</span>
                                            <select
                                                value={item.item_variant_id}
                                                onChange={(e) => changeVariant(index, e.target.value)}
                                                disabled={itemsLocked || !item.item_brand_id}
                                                aria-label="Variant"
                                                className={input(variantError)}
                                            >
                                                <option value="" disabled>{item.item_brand_id ? 'Select variant' : '—'}</option>
                                                {variantsFor(item).map((v) => (
                                                    <option key={v.id} value={v.id}>{variantLabel(v)}</option>
                                                ))}
                                            </select>
                                            {variantError && <p className="mt-1 text-xs text-red-600">Select an item, brand and variant.</p>}
                                            {itemsLocked ? (
                                                <p className={cx('mt-1 text-xs', lineDelivered >= Number(item.quantity) ? 'text-emerald-600' : 'text-slate-500')}>
                                                    Delivered {lineDelivered} of {item.quantity}
                                                </p>
                                            ) : (
                                                selectedVariant && (
                                                    <p className={cx('mt-1 text-xs', over ? 'font-medium text-orange-600' : 'text-slate-500')}>
                                                        {over ? `Only ${selectedVariant.stock} in stock` : `${selectedVariant.stock} in stock`}
                                                    </p>
                                                )
                                            )}
                                        </div>

                                        <div>
                                            <span className={mobileLabel}>Qty</span>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                disabled={itemsLocked}
                                                aria-label="Quantity"
                                                className={input(errors[`items.${index}.quantity`])}
                                            />
                                            {errors[`items.${index}.quantity`] && (
                                                <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.quantity`]}</p>
                                            )}
                                        </div>

                                        <div>
                                            <span className={mobileLabel}>Unit price</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                disabled={itemsLocked}
                                                aria-label="Unit price"
                                                className={input(errors[`items.${index}.unit_price`])}
                                            />
                                            {errors[`items.${index}.unit_price`] && (
                                                <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.unit_price`]}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between lg:h-9 lg:justify-end">
                                            <span className={cx(mobileLabel, 'mb-0')}>Subtotal</span>
                                            <span className="text-sm font-semibold tabular-nums text-slate-900">{currency(lineTotal)}</span>
                                        </div>

                                        <div className="flex justify-end lg:h-9 lg:items-center">
                                            {itemsLocked ? (
                                                <Lock className="h-4 w-4 text-slate-300" aria-label="Locked" />
                                            ) : (
                                                items.length > 1 && <IconButton icon={Trash2} label="Remove item" danger onClick={() => removeItem(index)} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm">
                            <span className="text-slate-500">Total</span>
                            <span className="text-base font-semibold tabular-nums text-slate-900">{currency(total)}</span>
                        </div>
                    </Panel>

                    <Panel title="Notes" description="Optional context for your team." icon={StickyNote}>
                        <div className="space-y-4">
                            <Field label="Note" htmlFor="note" error={errors.note}>
                                <textarea
                                    id="note"
                                    rows={3}
                                    placeholder="Anything else worth noting…"
                                    value={data.note}
                                    onChange={(e) => updateField('note', e.target.value)}
                                    className={textareaCls(errors.note)}
                                />
                            </Field>

                            {showWinningMessage ? (
                                <Field
                                    label="Winning message"
                                    htmlFor="winning_message"
                                    error={errors.winning_message}
                                    hint="Shown on the celebration screen when this deal is won."
                                    action={
                                        <LinkButton
                                            icon={X}
                                            onClick={() => {
                                                setShowWinningMessage(false);
                                                updateField('winning_message', '');
                                            }}
                                        >
                                            Remove
                                        </LinkButton>
                                    }
                                >
                                    <textarea
                                        id="winning_message"
                                        rows={2}
                                        placeholder="Why did this deal win?"
                                        value={data.winning_message}
                                        onChange={(e) => updateField('winning_message', e.target.value)}
                                        className={textareaCls(errors.winning_message)}
                                    />
                                </Field>
                            ) : (
                                <LinkButton icon={Trophy} onClick={() => setShowWinningMessage(true)}>
                                    Add a winning message
                                </LinkButton>
                            )}
                        </div>
                    </Panel>
                </div>

                {/* ---------------- Sticky summary ---------------- */}
                <aside className="xl:sticky xl:top-20">
                    <Panel title={isEditing ? 'Edit transaction' : 'New transaction'} description="Review, then save.">
                        <dl className="space-y-3">
                            <SummaryLine label="Client">{selectedClient?.client_name ?? '—'}</SummaryLine>
                            <SummaryLine label="Contact">
                                <span className="inline-flex items-center gap-1">
                                    {selectedContact && <UserRound className="h-3.5 w-3.5 text-slate-400" />}
                                    {selectedContact?.contact_person ?? '—'}
                                </span>
                            </SummaryLine>
                            <SummaryLine label="Priority">
                                <PriorityPill value={data.priority} />
                            </SummaryLine>
                            <SummaryLine label="Line items">{items.length}</SummaryLine>
                        </dl>

                        <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-4">
                            <span className="text-sm text-slate-500">Total</span>
                            <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{currency(total)}</span>
                        </div>

                        <div className="mt-4 space-y-2">
                            {shortages.length > 0 && (
                                <Banner tone="warning" title="Not enough stock yet">
                                    {shortages.length} {shortages.length === 1 ? 'variant is' : 'variants are'} short. You can still save, but
                                    you won't be able to deliver until it's restocked.
                                </Banner>
                            )}
                            {hasErrors && <Banner tone="error">Fix the highlighted fields before saving.</Banner>}
                        </div>

                        <div className="mt-5 flex flex-col gap-2">
                            <Button type="submit" variant="brand" className="w-full" disabled={processing}>
                                {processing ? 'Saving…' : isEditing ? 'Save changes' : 'Create transaction'}
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
