import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import SearchSelect from '@/Components/ui/SearchSelect';
import LineItemsEditor, { duplicateLineCount, linesFromServer } from '@/Components/ui/LineItemsEditor';
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    ChevronDown,
    Lock,
    Percent,
    Plus,
    Receipt,
    StickyNote,
    Trophy,
    UserRound,
    X,
} from 'lucide-react';
import {
    Banner,
    Field,
    LinkButton,
    Panel,
    PriorityPill,
    PRIORITIES,
    Segmented,
    currency,
    cx,
    input,
    textareaCls,
} from '@/Components/ui/kit';

// The server saves item_variant_id, quantity and unit_price (item_id / item_brand_id only drive the dropdowns).
// unit_price is typed by the user for every line (variants no longer carry a price).

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const emptyForm = () => ({
    name: '',
    client_id: '',
    client_contact_person_id: '',
    priority: 'Medium',
    winning_message: '',
    items: linesFromServer([], 'unit_price'), // one blank line
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

/* ---------------- Quick-add validation (mirrors ClientController rules) ---------------- */

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const tooLong = (label, max) => [`${label} may not be longer than ${max} characters.`];

/** Contact fields shared by both quick-add boxes. */
const validateContactFields = (c) => {
    const e = {};
    const person = c.contact_person.trim();
    const number = c.contact_number.trim();
    const email = c.email.trim();

    if (!person) e.contact_person = ['Contact person is required.'];
    else if (person.length > 255) e.contact_person = tooLong('Contact person', 255);

    if (number.length > 255) e.contact_number = tooLong('Contact number', 255);

    if (email && !isEmail(email)) e.email = ['Enter a valid email address.'];
    else if (email.length > 255) e.email = tooLong('Email', 255);

    return e;
};

const validateNewClient = (c) => {
    const e = validateContactFields(c);
    const name = c.client_name.trim();

    if (!name) e.client_name = ['Client name is required.'];
    else if (name.length > 255) e.client_name = tooLong('Client name', 255);

    if (c.address.trim().length > 500) e.address = tooLong('Address', 500);

    return e;
};

// [key, placeholder, input type, required]
const NEW_CLIENT_FIELDS = [
    ['client_name', 'Client name', 'text', true],
    ['address', 'Address (optional)', 'text', false],
    ['contact_person', 'Contact person', 'text', true],
    ['contact_number', 'Contact number (optional)', 'tel', false],
    ['email', 'Email (optional)', 'email', false],
];

const NEW_CONTACT_FIELDS = [
    ['contact_person', 'Contact person name', 'text', true],
    ['contact_number', 'Contact number (optional)', 'tel', false],
    ['email', 'Email (optional)', 'email', false],
];

/** QT-2026-00012-3 -> QT-2026-00012 */
const baseNumber = (n) => String(n ?? '').match(/^(QT-\d{4}-\d+)(?:-\d+)?$/)?.[1] ?? n;

// Typed numbers only: no spinner arrows, no mouse-wheel or arrow-key changes.
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

/** Native fieldset: `disabled` turns off every input, select and button inside it. Looks like a plain wrapper. */
const lockWrap = 'm-0 min-w-0 border-0 p-0';

/**
 * itemsLocked: true once a delivery exists (or the order was deducted the old way).
 * Items and quantities are then read-only; everything else stays editable.
 *
 * poConfirmed: true once a client PO is confirmed. The whole quotation is then locked
 * (client, items, markup, VAT, prepared by, remarks, name). Only priority and winning message stay editable.
 *
 * The server enforces the same rules; this keeps the form honest about it.
 */
export default function TransactionForm({
    clients = [],
    catalog = [],
    transaction = null,
    itemsLocked = false,
    poConfirmed = false,
}) {
    const isEditing = Boolean(transaction);
    const { auth } = usePage().props;
    const currentUser = auth?.user ?? {};

    // Opened from a pipeline card (?from=pipeline): after saving, go back to the board.
    const fromPipeline =
        typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'pipeline';

    // Quotation issued and not sent yet (and no confirmed PO): real edits create versions.
    const quotationEditable =
        Boolean(transaction?.quotation_number) && !transaction?.quotation_frozen && !poConfirmed;
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
    const [quickMessage, setQuickMessage] = useState(null); // non-validation failures (network, 500, expired session)
    const [quickProcessing, setQuickProcessing] = useState(false);
    const [showAddress, setShowAddress] = useState(false);

    const initialData = transaction
        ? {
              name: transaction.name ?? '',
              client_id: transaction.client_id ?? transaction.client?.id ?? '',
              client_contact_person_id: transaction.client_contact_person_id ?? transaction.contact_person?.id ?? '',
              priority: transaction.priority ?? 'Medium',
              winning_message: transaction.winning_message ?? '',
              items: linesFromServer(transaction.items, 'unit_price'),
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
    const items = data.items ?? linesFromServer([], 'unit_price');

    useEffect(() => setClientList(clients), [clients]);

    const selectedClient = useMemo(
        () => clientList.find((c) => String(c.id) === String(data.client_id)),
        [clientList, data.client_id],
    );
    useEffect(() => setShowAddress(false), [selectedClient?.id]);
    const contactOptions = selectedClient?.contact_people ?? [];
    const selectedContact = contactOptions.find((c) => String(c.id) === String(data.client_contact_person_id));

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
    const deliveredPerLine = itemsLocked ? (transaction?.items ?? []).map((l) => Number(l.delivered_quantity ?? 0)) : null;
    const orderedDelivered = itemsLocked ? deliveredPerLine.reduce((s, n) => s + n, 0) : 0;
    const orderedTotal = itemsLocked ? (transaction?.items ?? []).reduce((s, l) => s + Number(l.quantity ?? 0), 0) : 0;

    // Two rows can share a variant, so add them up before comparing with stock.
    const shortages = useMemo(() => {
        if (itemsLocked || poConfirmed) return [];
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
    }, [items, catalog, itemsLocked, poConfirmed]);

    // Lines that pick the same variant as another line. Saving is blocked until they are fixed.
    // (The rows themselves are flagged inside LineItemsEditor.)
    const duplicateCount = itemsLocked || poConfirmed ? 0 : duplicateLineCount(items);

    // ---- form helpers ----
    const updateField = (field, value) => {
        setData(field, value);
        if (String(value).trim() !== '') clearErrors(field);
    };

    const handleClientChange = (value) => {
        setData((prev) => ({ ...prev, client_id: value, client_contact_person_id: '' }));
        clearErrors('client_id');
    };

    // ---- quick add ----
    const toggleAddClient = () => {
        setQuickErrors({});
        setQuickMessage(null);
        setShowAddClient((v) => !v);
    };

    const toggleAddContact = () => {
        setQuickErrors({});
        setQuickMessage(null);
        setShowAddContact((v) => !v);
    };

    // Typing in a field clears just that field's error.
    const clearQuickError = (key) => {
        setQuickMessage(null);
        setQuickErrors((prev) => {
            if (!prev[key]) return prev;
            const { [key]: _removed, ...rest } = prev;
            return rest;
        });
    };

    const handleQuickFailure = (err) => {
        if (err.response?.status === 422) {
            setQuickErrors(err.response.data.errors ?? {});
        } else if (err.response?.status === 419) {
            setQuickMessage('Your session expired. Refresh the page and try again.');
        } else if (!err.response) {
            setQuickMessage('Could not reach the server. Check your connection and try again.');
        } else {
            setQuickMessage('Something went wrong while saving. Please try again.');
        }
    };

    const submitNewClient = async () => {
        const found = validateNewClient(newClient);
        if (Object.keys(found).length > 0) {
            setQuickErrors(found);
            setQuickMessage(null);
            return;
        }

        setQuickProcessing(true);
        setQuickErrors({});
        setQuickMessage(null);
        try {
            const payload = Object.fromEntries(Object.entries(newClient).map(([k, v]) => [k, v.trim()]));
            const { data: created } = await axios.post(route('clients.quickStore'), payload);
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
            handleQuickFailure(err);
        } finally {
            setQuickProcessing(false);
        }
    };

    const submitNewContact = async () => {
        if (!data.client_id) return;

        const found = validateContactFields(newContact);
        if (Object.keys(found).length > 0) {
            setQuickErrors(found);
            setQuickMessage(null);
            return;
        }

        setQuickProcessing(true);
        setQuickErrors({});
        setQuickMessage(null);
        try {
            const payload = Object.fromEntries(Object.entries(newContact).map(([k, v]) => [k, v.trim()]));
            const { data: created } = await axios.post(route('clients.quickStoreContact', data.client_id), payload);
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
            handleQuickFailure(err);
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
                    {poConfirmed && (
                        <Banner tone="warning" icon={Lock} title="Client PO confirmed">
                            The quotation is locked and can't be edited. Only the priority and winning message can still change.
                        </Banner>
                    )}

                    <Panel title="Overview" description="Name this transaction and set how urgent it is." icon={Receipt}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Transaction name" required htmlFor="transaction_name" error={errors.name}>
                                <input
                                    id="transaction_name"
                                    type="text"
                                    placeholder="e.g. Acme Corp — Annual Renewal"
                                    value={data.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    disabled={poConfirmed}
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

                    <fieldset disabled={poConfirmed} className={lockWrap}>
                        <Panel title="Client" description="Who is this transaction with?" icon={Building2}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Field
                                        label="Client"
                                        required
                                        htmlFor="client_id"
                                        error={errors.client_id}
                                        action={
                                            !poConfirmed && (
                                                <LinkButton icon={Plus} onClick={toggleAddClient}>
                                                    New client
                                                </LinkButton>
                                            )
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
                                            disabled={poConfirmed}
                                            inputClassName={input(errors.client_id)}
                                        />
                                    </Field>

                                    {showAddClient && !poConfirmed && (
                                        <div className={quickBox}>
                                            {quickMessage && <Banner tone="error">{quickMessage}</Banner>}

                                            {NEW_CLIENT_FIELDS.map(([key, placeholder, type, required]) => (
                                                <div key={key}>
                                                    <input
                                                        type={type}
                                                        placeholder={required ? `${placeholder} *` : placeholder}
                                                        aria-label={placeholder}
                                                        aria-invalid={Boolean(quickErrors[key])}
                                                        value={newClient[key]}
                                                        onChange={(e) => {
                                                            setNewClient((p) => ({ ...p, [key]: e.target.value }));
                                                            clearQuickError(key);
                                                        }}
                                                        className={input(quickErrors[key])}
                                                    />
                                                    {quickErrors[key] && (
                                                        <p role="alert" className="mt-1 text-xs text-red-600">{quickErrors[key][0]}</p>
                                                    )}
                                                </div>
                                            ))}

                                            <div className="flex justify-end gap-2 pt-1">
                                                <Button type="button" variant="outline" onClick={toggleAddClient}>Cancel</Button>
                                                <Button type="button" variant="brand" onClick={submitNewClient} disabled={quickProcessing}>
                                                    {quickProcessing ? 'Adding…' : 'Add client'}
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
                                            data.client_id && !poConfirmed && (
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
                                            disabled={!data.client_id || poConfirmed}
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

                                    {showAddContact && !poConfirmed && (
                                        <div className={quickBox}>
                                            {quickMessage && <Banner tone="error">{quickMessage}</Banner>}

                                            {NEW_CONTACT_FIELDS.map(([key, placeholder, type, required]) => (
                                                <div key={key}>
                                                    <input
                                                        type={type}
                                                        placeholder={required ? `${placeholder} *` : placeholder}
                                                        aria-label={placeholder}
                                                        aria-invalid={Boolean(quickErrors[key])}
                                                        value={newContact[key]}
                                                        onChange={(e) => {
                                                            setNewContact((p) => ({ ...p, [key]: e.target.value }));
                                                            clearQuickError(key);
                                                        }}
                                                        className={input(quickErrors[key])}
                                                    />
                                                    {quickErrors[key] && (
                                                        <p role="alert" className="mt-1 text-xs text-red-600">{quickErrors[key][0]}</p>
                                                    )}
                                                </div>
                                            ))}

                                            <div className="flex justify-end gap-2 pt-1">
                                                <Button type="button" variant="outline" onClick={toggleAddContact}>Cancel</Button>
                                                <Button type="button" variant="brand" onClick={submitNewContact} disabled={quickProcessing}>
                                                    {quickProcessing ? 'Adding…' : 'Add contact'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Panel>
                    </fieldset>

                    {/* The shared item table */}
                    <LineItemsEditor
                        items={items}
                        onChange={(v) => setData('items', v)}
                        catalog={catalog}
                        errors={errors}
                        clearErrors={clearErrors}
                        priceField="unit_price"
                        priceLabel="Unit price"
                        title="Line items"
                        description={
                            poConfirmed
                                ? 'Locked because the client purchase order is confirmed.'
                                : itemsLocked
                                  ? 'Locked because deliveries have been recorded.'
                                  : 'Pick an item, brand and variant, then enter the quantity and unit price.'
                        }
                        locked={itemsLocked || poConfirmed}
                        delivered={deliveredPerLine}
                        notice={
                            itemsLocked ? (
                                <Banner tone="warning" icon={Lock} title={`Items are locked (${orderedDelivered} of ${orderedTotal} delivered)`}>
                                    Items, quantities and prices can't change once goods are delivered, because that would break the
                                    delivery and stock records. You can still edit the client, priority and remarks. If the order really
                                    changed, mark this deal as lost and create a new transaction.
                                </Banner>
                            ) : null
                        }
                    />

                    <fieldset disabled={poConfirmed} className={lockWrap}>
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
                                        !poConfirmed && (
                                            <span className="flex gap-3">
                                                <LinkButton onClick={() => updateField('vat_percent', '12')}>12%</LinkButton>
                                                <LinkButton onClick={() => updateField('vat_percent', '0')}>VAT-exempt</LinkButton>
                                            </span>
                                        )
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
                    </fieldset>

                    {transaction?.quotation_frozen && !poConfirmed && (
                        <Banner tone="warning" icon={Lock} title="This quotation was already sent">
                            The card is past the quotation stage, so edits no longer create a new version. Move the card
                            back to the quotation stage to change it.
                        </Banner>
                    )}

                    <fieldset disabled={poConfirmed} className={lockWrap}>
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
                    </fieldset>

                    <Panel title="Remarks" description="Printed on the quotation under Remarks." icon={StickyNote}>
                        <div className="space-y-4">
                            <Field label="Remarks" htmlFor="remarks" error={errors.remarks}>
                                <textarea
                                    id="remarks"
                                    rows={3}
                                    placeholder="e.g. Price is valid for 30 days. Delivery within 5 working days."
                                    value={data.remarks ?? ''}
                                    onChange={(e) => updateField('remarks', e.target.value)}
                                    disabled={poConfirmed}
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
                                {poConfirmed && (
                                    <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        The client PO is confirmed, so the quotation is locked. Saving only updates the
                                        priority and winning message.
                                    </p>
                                )}
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