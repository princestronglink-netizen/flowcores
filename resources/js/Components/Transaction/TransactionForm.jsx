import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import SearchSelect from '@/Components/ui/SearchSelect';
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    ChevronDown,
    Lock,
    Package,
    Percent,
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
    currency,
    cx,
    input,
    inputCls,
    textareaCls,
} from '@/Components/ui/kit';

// category_id is only used to narrow the Item dropdown; the server saves item_variant_id, quantity and unit_price.
// unit_price is typed by the user for every line (variants no longer carry a price).
const emptyItem = () => ({ item_id: '', item_brand_id: '', item_variant_id: '', quantity: 1, unit_price: '' });

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const emptyForm = () => ({
    name: '',
    client_id: '',
    client_contact_person_id: '',
    priority: 'Medium',
    winning_message: '',
    items: [emptyItem()],
    remarks: '',
    prepared_by: '',
    prepared_by_position: '',
    markup_percent: 0,
    vat_percent: 12,
});

const emptyNewClient = () => ({
    client_name: '',
    address: '',
    contact_person: '',
    contact_number: '',
    email: '',
});

const emptyNewContact = () => ({ contact_person: '', contact_number: '', email: '' });

/** QT-2026-00012-3 -> QT-2026-00012 */
const baseNumber = (n) => String(n ?? '').match(/^(QT-\d{4}-\d+)(?:-\d+)?$/)?.[1] ?? n;

const variantLabel = (v) => [v.unit_of_measure, v.size].filter(Boolean).join(' · ');

const rowGrid = 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.5fr)_84px_116px_108px_32px]';
const mobileLabel = 'mb-1 block text-xs font-medium text-slate-500 lg:hidden';

// Typed numbers only: no spinner arrows, no mouse-wheel or arrow-key changes.
const intOnly = (v) => String(v).replace(/\D/g, '');
const decimalOnly = (v) => {
    const [whole, ...rest] = String(v).replace(/[^\d.]/g, '').split('.');
    return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
};

const ADDRESS_LONG = 60;

/** One line of the receipt: label on the left, value on the right, long values wrap instead of being cut off. */
function ReceiptRow({ label, children }) {
    return (
        <div className="flex items-start justify-between gap-4 text-sm">
            <dt className="shrink-0 text-slate-500">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-slate-900">{children}</dd>
        </div>
    );
}

/**
 * itemsLocked: true once a delivery exists (or the order was deducted the old way).
 * Items and quantities are then read-only; everything else stays editable.
 * The server enforces the same rule; this keeps the form honest about it.
 */
export default function TransactionForm({ clients = [], catalog = [], transaction = null, itemsLocked = false }) {
    const isEditing = Boolean(transaction);
    const { auth } = usePage().props;
    const currentUser = auth?.user ?? {};

    // Opened from a pipeline card (?from=pipeline): after saving, go back to the board.
    const fromPipeline =
        typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'pipeline';

    // Quotation issued and not sent yet: real edits create versions.
    const quotationEditable = Boolean(transaction?.quotation_number) && !transaction?.quotation_frozen;
    const nextNumber = transaction?.quotation_number
        ? `${baseNumber(transaction.quotation_number)}-${(transaction.version ?? 0) + 1}`
        : null;

    const [showWinningMessage, setShowWinningMessage] = useState(Boolean(transaction?.winning_message));
    const [clientList, setClientList] = useState(clients);
    const [showAddClient, setShowAddClient] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);
    const [newClient, setNewClient] = useState(emptyNewClient());
    const [newContact, setNewContact] = useState(emptyNewContact());
    const [quickErrors, setQuickErrors] = useState({});
    const [quickProcessing, setQuickProcessing] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [showAddress, setShowAddress] = useState(false);

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
              remarks: transaction.remarks ?? '',
              prepared_by: transaction.prepared_by ?? currentUser.name ?? '',
              prepared_by_position: transaction.prepared_by_position ?? currentUser.position ?? '',
              markup_percent: transaction.markup_percent ?? 0,
              vat_percent: transaction.vat_percent ?? 12,
          }
        : {
              ...emptyForm(),
              prepared_by: currentUser.name ?? '',
              prepared_by_position: currentUser.position ?? '',
          };

    const { data, setData, post, put, processing, errors, clearErrors } = useForm(initialData);
    const items = data.items ?? [emptyItem()];

    useEffect(() => setClientList(clients), [clients]);

    const selectedClient = useMemo(
        () => clientList.find((c) => String(c.id) === String(data.client_id)),
        [clientList, data.client_id],
    );
    useEffect(() => setShowAddress(false), [selectedClient?.id]);
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

    // ---- totals: subtotal → markup → VAT → grand total ----
    const subtotal = useMemo(
        () => items.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0),
        [items],
    );
    const markupAmount = round2(subtotal * ((Number(data.markup_percent) || 0) / 100));
    const net = round2(subtotal + markupAmount);
    const vatAmount = round2(net * ((Number(data.vat_percent) || 0) / 100));
    const total = round2(net + vatAmount);

    // ---- delivery progress (locked orders) ----
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

    // Lines that pick the same variant (so the same item and brand too) as another line.
    // The lines are kept and flagged, and saving is blocked until they are fixed:
    // { lineIndex: [other line numbers] }.
    // The same item with a different variant is fine.
    const duplicateOf = useMemo(() => {
        const byVariant = {};
        items.forEach((r, i) => {
            if (!r.item_variant_id) return;
            const key = String(r.item_variant_id);
            byVariant[key] = [...(byVariant[key] ?? []), i];
        });

        const out = {};
        Object.values(byVariant).forEach((idxs) => {
            if (idxs.length < 2) return;
            idxs.forEach((i) => {
                out[i] = idxs.filter((x) => x !== i).map((x) => x + 1);
            });
        });
        return out;
    }, [items]);
    const duplicateCount = itemsLocked ? 0 : Object.keys(duplicateOf).length;

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
    const changeItem = (i, v) => patchItem(i, { item_id: v, item_brand_id: '', item_variant_id: '' });
    const changeBrand = (i, v) => patchItem(i, { item_brand_id: v, item_variant_id: '' });
    const changeVariant = (i, variantId) => {
        patchItem(i, { item_variant_id: variantId });
        clearErrors(`items.${i}.item_variant_id`);
    };
    const updateItem = (i, field, value) => {
        patchItem(i, { [field]: value });
        if (String(value).trim() !== '') clearErrors(`items.${i}.${field}`);
    };
    const addItem = () => !itemsLocked && setData('items', [...items, emptyItem()]);
    const removeItem = (i) => !itemsLocked && setData('items', items.filter((_, idx) => idx !== i));

    // ---- quick add ----
    const toggleAddClient = () => {
        setQuickErrors({});
        setShowAddClient((v) => !v);
    };

    const toggleAddContact = () => {
        setQuickErrors({});
        setShowAddContact((v) => !v);
    };

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
            setNewClient(emptyNewClient());
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
            setNewContact(emptyNewContact());
            setShowAddContact(false);
        } catch (err) {
            if (err.response?.status === 422) setQuickErrors(err.response.data.errors);
        } finally {
            setQuickProcessing(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        // Same item + brand + variant on two lines: stay on the form until it is fixed.
        if (duplicateCount > 0) return;
        if (isEditing) {
            put(route('transactions.update', { transaction: transaction.id, ...(fromPipeline ? { from: 'pipeline' } : {}) }));
        } else post(route('transactions.store'));
    };

    const hasErrors = Object.keys(errors ?? {}).length > 0;
    const listUrl = fromPipeline ? route('pipelines.index') : route('transactions.index');
    const quickBox = 'mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3';

    return (
        <form onSubmit={submit} noValidate className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
            <Link href={listUrl} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                {fromPipeline ? 'Pipeline' : 'Transactions'}
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
                                        <LinkButton icon={Plus} onClick={toggleAddClient}>
                                            New client
                                        </LinkButton>
                                    }
                                >
                                    <SearchSelect
                                        id="client_id"
                                        ariaLabel="Client"
                                        placeholder="Select a client"
                                        searchPlaceholder="Type a client name"
                                        emptyText="No clients found"
                                        options={clientList.map((c) => ({
                                            value: c.id,
                                            label: c.client_name,
                                        }))}
                                        value={data.client_id}
                                        onChange={handleClientChange}
                                        inputClassName={input(errors.client_id)}
                                    />
                                </Field>

                                {showAddClient && (
                                    <div className={quickBox}>
                                        {[
                                            ['client_name', 'Client name', 'text'],
                                            ['address', 'Address (optional)', 'text'],
                                            ['contact_person', 'Contact person', 'text'],
                                            ['contact_number', 'Contact number (optional)', 'tel'],
                                            ['email', 'Email (optional)', 'email'],
                                        ].map(([key, placeholder, type]) => (
                                            <div key={key}>
                                                <input
                                                    type={type}
                                                    placeholder={placeholder}
                                                    value={newClient[key]}
                                                    onChange={(e) => setNewClient((p) => ({ ...p, [key]: e.target.value }))}
                                                    className={input(quickErrors[key])}
                                                />
                                                {quickErrors[key] && <p className="mt-1 text-xs text-red-600">{quickErrors[key][0]}</p>}
                                            </div>
                                        ))}
                                        <div className="flex justify-end gap-2 pt-1">
                                            <Button type="button" variant="outline" onClick={toggleAddClient}>Cancel</Button>
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
                                            <LinkButton icon={Plus} onClick={toggleAddContact}>
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
                                        <div>
                                            <input
                                                type="tel"
                                                placeholder="Contact number (optional)"
                                                value={newContact.contact_number}
                                                onChange={(e) => setNewContact((p) => ({ ...p, contact_number: e.target.value }))}
                                                className={input(quickErrors.contact_number)}
                                            />
                                            {quickErrors.contact_number && (
                                                <p className="mt-1 text-xs text-red-600">{quickErrors.contact_number[0]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                type="email"
                                                placeholder="Email (optional)"
                                                value={newContact.email}
                                                onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                                                className={input(quickErrors.email)}
                                            />
                                            {quickErrors.email && (
                                                <p className="mt-1 text-xs text-red-600">{quickErrors.email[0]}</p>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1">
                                            <Button type="button" variant="outline" onClick={toggleAddContact}>Cancel</Button>
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
                                : 'Pick an item, brand and variant, then enter the quantity and unit price.'
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
                                    delivery and stock records. You can still edit the client, priority and remarks. If the order really
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
                                const isDuplicate = !itemsLocked && Boolean(duplicateOf[index]);

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
                                                value={item.item_id}
                                                onChange={(v) => changeItem(index, v)}
                                                disabled={itemsLocked}
                                                inputClassName={input(variantError && !item.item_id)}
                                            />
                                        </div>

                                        <div>
                                            <span className={mobileLabel}>Brand</span>
                                            <SearchSelect
                                                ariaLabel="Brand"
                                                placeholder={item.item_id ? 'Select brand' : '—'}
                                                searchPlaceholder="Type a brand"
                                                emptyText="No brands found"
                                                options={brandsFor(item).map((b) => ({ value: b.id, label: b.brand_name }))}
                                                value={item.item_brand_id}
                                                onChange={(v) => changeBrand(index, v)}
                                                disabled={itemsLocked || !item.item_id}
                                                inputClassName={input(variantError && item.item_id && !item.item_brand_id)}
                                            />
                                        </div>

                                        <div>
                                            <span className={mobileLabel}>Variant</span>
                                            <SearchSelect
                                                ariaLabel="Variant"
                                                placeholder={item.item_brand_id ? 'Select variant' : '—'}
                                                searchPlaceholder="Type a size or unit"
                                                emptyText="No variants found"
                                                options={variantsFor(item).map((v) => ({
                                                    value: v.id,
                                                    label: variantLabel(v),
                                                    hint: `${v.stock} in stock`,
                                                }))}
                                                value={item.item_variant_id}
                                                onChange={(v) => changeVariant(index, v)}
                                                disabled={itemsLocked || !item.item_brand_id}
                                                inputClassName={cx(
                                                    input(variantError),
                                                    isDuplicate && '!border-amber-500 !bg-amber-50 focus:!border-amber-600',
                                                )}
                                            />
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
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', intOnly(e.target.value))}
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
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0.00"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(index, 'unit_price', decimalOnly(e.target.value))}
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
                            <span className="text-slate-500">Subtotal</span>
                            <span className="text-base font-semibold tabular-nums text-slate-900">{currency(subtotal)}</span>
                        </div>
                    </Panel>

                    <Panel
                        title="Markup & VAT"
                        description="Markup is added to the subtotal first, then VAT is computed on the result."
                        icon={Percent}
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Markup (%)" htmlFor="markup_percent" error={errors.markup_percent} hint="0 for no markup.">
                                <input
                                    id="markup_percent"
                                    type="text"
                                    inputMode="decimal"
                                    value={data.markup_percent}
                                    onChange={(e) => updateField('markup_percent', decimalOnly(e.target.value))}
                                    onBlur={() => data.markup_percent === '' && updateField('markup_percent', '0')}
                                    className={input(errors.markup_percent)}
                                />
                            </Field>

                            <Field
                                label="VAT (%)"
                                htmlFor="vat_percent"
                                error={errors.vat_percent}
                                action={
                                    <span className="flex gap-3">
                                        <LinkButton onClick={() => updateField('vat_percent', '12')}>12%</LinkButton>
                                        <LinkButton onClick={() => updateField('vat_percent', '0')}>VAT-exempt</LinkButton>
                                    </span>
                                }
                            >
                                <input
                                    id="vat_percent"
                                    type="text"
                                    inputMode="decimal"
                                    value={data.vat_percent}
                                    onChange={(e) => updateField('vat_percent', decimalOnly(e.target.value))}
                                    onBlur={() => data.vat_percent === '' && updateField('vat_percent', '0')}
                                    className={input(errors.vat_percent)}
                                />
                            </Field>
                        </div>
                    </Panel>

                    {transaction?.quotation_frozen && (
                        <Banner tone="warning" icon={Lock} title="This quotation was already sent">
                            The card is past the quotation stage, so edits no longer create a new version. Move the card
                            back to the quotation stage to change it.
                        </Banner>
                    )}

                    <Panel title="Prepared by" description="Printed at the bottom of the quotation." icon={UserRound}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Name" htmlFor="prepared_by" error={errors.prepared_by}>
                                <input
                                    id="prepared_by"
                                    type="text"
                                    value={data.prepared_by ?? ''}
                                    onChange={(e) => updateField('prepared_by', e.target.value)}
                                    className={input(errors.prepared_by)}
                                />
                            </Field>
                            <Field label="Position" htmlFor="prepared_by_position" error={errors.prepared_by_position}>
                                <input
                                    id="prepared_by_position"
                                    type="text"
                                    placeholder="e.g. Purchasing Coordinator"
                                    value={data.prepared_by_position ?? ''}
                                    onChange={(e) => updateField('prepared_by_position', e.target.value)}
                                    className={input(errors.prepared_by_position)}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Remarks" description="Printed on the quotation under Remarks." icon={StickyNote}>
                        <div className="space-y-4">
                            <Field label="Remarks" htmlFor="remarks" error={errors.remarks}>
                                <textarea
                                    id="remarks"
                                    rows={3}
                                    placeholder="e.g. Price is valid for 30 days. Delivery within 5 working days."
                                    value={data.remarks ?? ''}
                                    onChange={(e) => updateField('remarks', e.target.value)}
                                    className={textareaCls(errors.remarks)}
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

                {/* ---------------- Sticky summary (receipt) ---------------- */}
                <aside className="xl:sticky xl:top-20">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-dashed border-slate-300 px-5 py-4 text-center">
                            <h2 className="text-sm font-semibold text-slate-900">
                                {isEditing ? 'Edit transaction' : 'New transaction'}
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">Review, then save.</p>
                            {transaction?.quotation_number && (
                                <p className="mt-2 text-xs font-medium tabular-nums text-slate-600">{transaction.quotation_number}</p>
                            )}
                        </div>

                        <div className="space-y-4 px-5 py-4">
                            {/* Client + address */}
                            <div>
                                <div className="flex items-start justify-between gap-4 text-sm">
                                    <span className="text-slate-500">Client</span>
                                    <span className="min-w-0 break-words text-right font-medium text-slate-900">
                                        {selectedClient?.client_name ?? '—'}
                                    </span>
                                </div>

                                {selectedClient?.address && (
                                    <div className="mt-3 rounded-md bg-slate-50 px-3 py-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-500">Address</span>
                                            {selectedClient.address.length > ADDRESS_LONG && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddress((v) => !v)}
                                                    aria-expanded={showAddress}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-[#667292] hover:text-slate-900"
                                                >
                                                    {showAddress ? 'Hide' : 'See more'}
                                                    <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', showAddress && 'rotate-180')} />
                                                </button>
                                            )}
                                        </div>
                                        <p
                                            className={cx(
                                                'mt-1 break-words text-sm leading-relaxed text-slate-800',
                                                !showAddress && selectedClient.address.length > ADDRESS_LONG && 'line-clamp-2',
                                            )}
                                        >
                                            {selectedClient.address}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Contact */}
                            <dl className="space-y-2">
                                <ReceiptRow label="Contact">
                                    <span className="inline-flex items-center gap-1">
                                        {selectedContact && <UserRound className="h-3.5 w-3.5 text-slate-400" />}
                                        {selectedContact?.contact_person ?? '—'}
                                    </span>
                                </ReceiptRow>
                                {selectedContact?.contact_number && (
                                    <ReceiptRow label="Number">{selectedContact.contact_number}</ReceiptRow>
                                )}
                                {selectedContact?.email && <ReceiptRow label="Email">{selectedContact.email}</ReceiptRow>}
                            </dl>

                            <dl className="space-y-2 border-t border-dashed border-slate-300 pt-4">
                                <ReceiptRow label="Priority">
                                    <PriorityPill value={data.priority} />
                                </ReceiptRow>
                                <ReceiptRow label="Line items">{items.length}</ReceiptRow>
                            </dl>

                            {/* Totals */}
                            <dl className="space-y-1.5 border-t border-dashed border-slate-300 pt-4 text-sm">
                                <div className="flex justify-between text-slate-500">
                                    <dt>Subtotal</dt>
                                    <dd className="tabular-nums text-slate-700">{currency(subtotal)}</dd>
                                </div>
                                {markupAmount > 0 && (
                                    <div className="flex justify-between text-slate-500">
                                        <dt>Markup ({Number(data.markup_percent) || 0}%)</dt>
                                        <dd className="tabular-nums text-slate-700">{currency(markupAmount)}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-500">
                                    <dt>VAT ({Number(data.vat_percent) || 0}%)</dt>
                                    <dd className="tabular-nums text-slate-700">{currency(vatAmount)}</dd>
                                </div>
                                <div className="flex items-baseline justify-between border-t border-dashed border-slate-300 pt-3">
                                    <dt className="text-sm font-medium text-slate-700">Grand total</dt>
                                    <dd className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{currency(total)}</dd>
                                </div>
                            </dl>

                            <div className="space-y-2">
                                {quotationEditable && (
                                    <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        Changing the client, items, markup, VAT, remarks or prepared-by keeps the current quotation in the
                                        history and creates <b className="text-slate-900">{nextNumber}</b>. Changing only the priority or
                                        winning message, or saving without changes, creates nothing.
                                    </p>
                                )}
                                {shortages.length > 0 && (
                                    <Banner tone="warning" title="Not enough stock yet">
                                        {shortages.length} {shortages.length === 1 ? 'variant is' : 'variants are'} short. You can still save, but
                                        you won't be able to deliver until it's restocked.
                                    </Banner>
                                )}
                                {duplicateCount > 0 && (
                                    <Banner tone="warning" icon={AlertTriangle} title="Repeated item and variant">
                                        {duplicateCount} {duplicateCount === 1 ? 'line uses' : 'lines use'} an item and variant that is already
                                        on this order. Change the variant or remove the repeated lines before saving.
                                    </Banner>
                                )}
                                {hasErrors && <Banner tone="error">Fix the highlighted fields before saving.</Banner>}
                            </div>

                            <div className="flex flex-col gap-2 border-t border-dashed border-slate-300 pt-4">
                                <Button type="submit" variant="brand" className="w-full" disabled={processing || duplicateCount > 0}>
                                    {processing ? 'Saving…' : isEditing ? 'Save changes' : 'Create transaction'}
                                </Button>
                                <Link href={listUrl} className="block">
                                    <Button type="button" variant="outline" className="w-full">Cancel</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </form>
    );
}