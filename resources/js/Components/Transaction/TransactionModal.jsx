import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { useForm } from '@inertiajs/react';
import {
    Receipt,
    Building2,
    UserRound,
    GitBranch,
    Flag,
    Trophy,
    StickyNote,
    Package,
    Banknote,
    Plus,
    Trash2,
    X,
} from 'lucide-react';

const PALETTE = {
    slate: '#667292',
    teal: '#8d9db6',
    cream: '#bccad6',
    deepEdge: '#3a4157',
    mist: '#eef1f5',
};

const PRIORITY_OPTIONS = [
    { value: 'Low', color: '#8fb08d' },
    { value: 'Medium', color: '#c9a24b' },
    { value: 'High', color: '#c97a4b' },
    { value: 'Critical', color: '#b5504a' },
];

const emptyItem = () => ({ item_name: '', quantity: 1, unit_price: '' });

const emptyForm = (pipelines) => ({
    name: '',
    client_id: '',
    client_contact_person_id: '',
    pipeline: pipelines[0]?.id ?? '',
    priority: PRIORITY_OPTIONS[1].value,
    winning_message: '',
    items: [emptyItem()],
    note: '',
});

const currency = (n) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TransactionModal({ show, onClose, pipelines = [], clients = [], transaction = null }) {
    const isEditing = Boolean(transaction);

    const [showWinningMessage, setShowWinningMessage] = useState(false);

    const [pipelineList, setPipelineList] = useState(pipelines);
    const [clientList, setClientList] = useState(clients);

    const [showAddPipeline, setShowAddPipeline] = useState(false);
    const [showAddClient, setShowAddClient] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);

    const [newPipeline, setNewPipeline] = useState({ pipeline_code: '', pipeline_name: '', pipeline_description: '' });
    const [newClient, setNewClient] = useState({ client_code: '', client_name: '', contact_person: '', contact_number: '', email: '' });
    const [newContact, setNewContact] = useState({ contact_person: '', contact_number: '', email: '' });

    const [quickErrors, setQuickErrors] = useState({});
    const [quickProcessing, setQuickProcessing] = useState(false);

    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm(emptyForm(pipelines));

    const items = data.items ?? [emptyItem()];

    useEffect(() => {
        setPipelineList(pipelines);
    }, [pipelines]);

    useEffect(() => {
        setClientList(clients);
    }, [clients]);

    useEffect(() => {
        if (show && transaction) {
            setData({
                name: transaction.name ?? '',
                client_id: transaction.client_id ?? transaction.client?.id ?? '',
                client_contact_person_id:
                    transaction.client_contact_person_id ?? transaction.contact_person?.id ?? '',
                pipeline: transaction.pipeline_id ?? transaction.pipeline?.id ?? '',
                priority: transaction.priority ?? PRIORITY_OPTIONS[1].value,
                winning_message: transaction.winning_message ?? '',
                items:
                    transaction.items?.length > 0
                        ? transaction.items.map((i) => ({
                              item_name: i.item_name ?? '',
                              quantity: i.quantity ?? 1,
                              unit_price: i.unit_price ?? '',
                          }))
                        : [emptyItem()],
                note: transaction.note ?? '',
            });
            setShowWinningMessage(Boolean(transaction.winning_message));
        } else if (show && !transaction) {
            reset();
            setShowWinningMessage(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, transaction]);

    const selectedClient = useMemo(
        () => clientList.find((c) => String(c.id) === String(data.client_id)),
        [clientList, data.client_id]
    );

    const contactOptions = selectedClient?.contact_people ?? [];

    const total = useMemo(
        () =>
            items.reduce(
                (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
                0
            ),
        [items]
    );

    const updateField = (field, value) => {
        setData(field, value);
        if (String(value).trim() !== '') {
            clearErrors(field);
        }
    };

    const handleClientChange = (value) => {
        updateField('client_id', value);
        updateField('client_contact_person_id', '');
    };

    const updateItem = (index, field, value) => {
        const updated = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
        setData('items', updated);
        if (String(value).trim() !== '') {
            clearErrors(`items.${index}.${field}`);
        }
    };

    const addItem = () => {
        setData('items', [...items, emptyItem()]);
    };

    const removeItem = (index) => {
        setData('items', items.filter((_, i) => i !== index));
    };

    // ---- Quick-add: Pipeline ----
    const submitNewPipeline = async () => {
        setQuickProcessing(true);
        setQuickErrors({});
        try {
            const res = await axios.post(route('pipelines.quickStore'), newPipeline);
            const created = res.data;
            setPipelineList((prev) => [...prev, created]);
            setData('pipeline', created.id);
            clearErrors('pipeline');
            setNewPipeline({ pipeline_code: '', pipeline_name: '', pipeline_description: '' });
            setShowAddPipeline(false);
        } catch (err) {
            if (err.response?.status === 422) setQuickErrors(err.response.data.errors);
        } finally {
            setQuickProcessing(false);
        }
    };

    // ---- Quick-add: Client (+ first contact) ----
    const submitNewClient = async () => {
        setQuickProcessing(true);
        setQuickErrors({});
        try {
            const res = await axios.post(route('clients.quickStore'), newClient);
            const created = res.data;
            setClientList((prev) => [...prev, created]);
            setData('client_id', created.id);
            setData('client_contact_person_id', created.contact_people[0]?.id ?? '');
            clearErrors('client_id');
            clearErrors('client_contact_person_id');
            setNewClient({ client_code: '', client_name: '', contact_person: '', contact_number: '', email: '' });
            setShowAddClient(false);
        } catch (err) {
            if (err.response?.status === 422) setQuickErrors(err.response.data.errors);
        } finally {
            setQuickProcessing(false);
        }
    };

    // ---- Quick-add: Contact Person ----
    const submitNewContact = async () => {
        if (!data.client_id) return;
        setQuickProcessing(true);
        setQuickErrors({});
        try {
            const res = await axios.post(route('clients.quickStoreContact', data.client_id), newContact);
            const created = res.data;
            setClientList((prev) =>
                prev.map((c) =>
                    String(c.id) === String(data.client_id)
                        ? { ...c, contact_people: [...(c.contact_people ?? []), created] }
                        : c
                )
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

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setShowWinningMessage(false);
                reset();
                onClose();
            },
        };

        if (isEditing) {
            put(route('transactions.update', transaction.id), options);
        } else {
            post(route('transactions.store'), options);
        }
    };

    const close = () => {
        setShowWinningMessage(false);
        setShowAddPipeline(false);
        setShowAddClient(false);
        setShowAddContact(false);
        setQuickErrors({});
        reset();
        clearErrors();
        onClose();
    };

    const inputStyle = { borderColor: PALETTE.cream, color: PALETTE.deepEdge };
    const errorInputStyle = { borderColor: '#dc2626', color: PALETTE.deepEdge };
    const labelStyle = { color: PALETTE.slate };
    const labelClass = 'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide';
    const fieldClass =
        'mt-1 block w-full rounded-md border px-3 py-2 text-sm transition-shadow focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400';
    const errorClass = 'mt-1 text-xs text-red-600';
    const quickPanelStyle = { borderColor: PALETTE.cream, backgroundColor: PALETTE.mist };
    const smallFieldClass =
        'mt-1 block w-full rounded-md border px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2';

    return (
        <Modal show={show} onClose={close} maxWidth="4xl">
            <form onSubmit={submit} noValidate className="p-6">
                <div className="flex items-center gap-3">
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: PALETTE.mist }}
                    >
                        <Receipt className="h-4 w-4" style={{ color: PALETTE.slate }} />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold" style={{ color: PALETTE.deepEdge }}>
                            {isEditing ? 'Edit Transaction' : 'New Transaction'}
                        </h2>
                        <p className="text-sm" style={{ color: PALETTE.slate }}>
                            Fill in the details below.
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="transaction_name" className={labelClass} style={labelStyle}>
                            <Receipt className="h-3.5 w-3.5" />
                            Transaction Name <span style={{ color: PALETTE.slate }}>*</span>
                        </label>
                        <input
                            id="transaction_name"
                            type="text"
                            placeholder="e.g. Acme Corp — Annual Renewal"
                            value={data.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className={fieldClass}
                            style={errors.name ? errorInputStyle : inputStyle}
                        />
                        {errors.name && <p className={errorClass}>{errors.name}</p>}
                    </div>

                    {/* ---- Client / Contact Person ---- */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="client_id" className={labelClass} style={labelStyle}>
                                    <Building2 className="h-3.5 w-3.5" />
                                    Client <span style={{ color: PALETTE.slate }}>*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowAddClient((v) => !v)}
                                    className="flex items-center gap-1 text-xs font-semibold"
                                    style={{ color: PALETTE.slate }}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    New
                                </button>
                            </div>
                            <select
                                id="client_id"
                                value={data.client_id}
                                onChange={(e) => handleClientChange(e.target.value)}
                                className={fieldClass}
                                style={errors.client_id ? errorInputStyle : inputStyle}
                            >
                                <option value="" disabled>Select a client</option>
                                {clientList.map((c) => (
                                    <option key={c.id} value={c.id}>{c.client_name}</option>
                                ))}
                            </select>
                            {errors.client_id && <p className={errorClass}>{errors.client_id}</p>}

                            {showAddClient && (
                                <div className="mt-2 space-y-2 rounded-md border p-3" style={quickPanelStyle}>
                                    <input
                                        type="text"
                                        placeholder="Client code"
                                        value={newClient.client_code}
                                        onChange={(e) => setNewClient((p) => ({ ...p, client_code: e.target.value }))}
                                        className={smallFieldClass}
                                        style={inputStyle}
                                    />
                                    {quickErrors.client_code && <p className={errorClass}>{quickErrors.client_code[0]}</p>}

                                    <input
                                        type="text"
                                        placeholder="Client name"
                                        value={newClient.client_name}
                                        onChange={(e) => setNewClient((p) => ({ ...p, client_name: e.target.value }))}
                                        className={smallFieldClass}
                                        style={inputStyle}
                                    />
                                    {quickErrors.client_name && <p className={errorClass}>{quickErrors.client_name[0]}</p>}

                                    <input
                                        type="text"
                                        placeholder="Contact person"
                                        value={newClient.contact_person}
                                        onChange={(e) => setNewClient((p) => ({ ...p, contact_person: e.target.value }))}
                                        className={smallFieldClass}
                                        style={inputStyle}
                                    />
                                    {quickErrors.contact_person && <p className={errorClass}>{quickErrors.contact_person[0]}</p>}

                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddClient(false)}
                                            className="text-xs font-semibold"
                                            style={{ color: PALETTE.slate }}
                                        >
                                            Cancel
                                        </button>
                                        <Button type="button" variant="brand" onClick={submitNewClient} disabled={quickProcessing}>
                                            Add Client
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="client_contact_person_id" className={labelClass} style={labelStyle}>
                                    <UserRound className="h-3.5 w-3.5" />
                                    Contact Person <span style={{ color: PALETTE.slate }}>*</span>
                                </label>
                                {data.client_id && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddContact((v) => !v)}
                                        className="flex items-center gap-1 text-xs font-semibold"
                                        style={{ color: PALETTE.slate }}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        New
                                    </button>
                                )}
                            </div>
                            <select
                                id="client_contact_person_id"
                                value={data.client_contact_person_id}
                                onChange={(e) => updateField('client_contact_person_id', e.target.value)}
                                className={fieldClass}
                                style={errors.client_contact_person_id ? errorInputStyle : inputStyle}
                                disabled={!data.client_id}
                            >
                                <option value="" disabled>
                                    {data.client_id ? 'Select a contact person' : 'Select a client first'}
                                </option>
                                {contactOptions.map((person) => (
                                    <option key={person.id} value={person.id}>{person.contact_person}</option>
                                ))}
                            </select>
                            {errors.client_contact_person_id && (
                                <p className={errorClass}>{errors.client_contact_person_id}</p>
                            )}

                            {showAddContact && (
                                <div className="mt-2 space-y-2 rounded-md border p-3" style={quickPanelStyle}>
                                    <input
                                        type="text"
                                        placeholder="Contact person name"
                                        value={newContact.contact_person}
                                        onChange={(e) => setNewContact((p) => ({ ...p, contact_person: e.target.value }))}
                                        className={smallFieldClass}
                                        style={inputStyle}
                                    />
                                    {quickErrors.contact_person && <p className={errorClass}>{quickErrors.contact_person[0]}</p>}

                                    <input
                                        type="tel"
                                        placeholder="Contact number (optional)"
                                        value={newContact.contact_number}
                                        onChange={(e) => setNewContact((p) => ({ ...p, contact_number: e.target.value }))}
                                        className={smallFieldClass}
                                        style={inputStyle}
                                    />

                                    <input
                                        type="email"
                                        placeholder="Email (optional)"
                                        value={newContact.email}
                                        onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                                        className={smallFieldClass}
                                        style={inputStyle}
                                    />

                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddContact(false)}
                                            className="text-xs font-semibold"
                                            style={{ color: PALETTE.slate }}
                                        >
                                            Cancel
                                        </button>
                                        <Button type="button" variant="brand" onClick={submitNewContact} disabled={quickProcessing}>
                                            Add Contact
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ---- Pipeline / Priority ---- */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="pipeline" className={labelClass} style={labelStyle}>
                                    <GitBranch className="h-3.5 w-3.5" />
                                    Pipeline <span style={{ color: PALETTE.slate }}>*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowAddPipeline((v) => !v)}
                                    className="flex items-center gap-1 text-xs font-semibold"
                                    style={{ color: PALETTE.slate }}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    New
                                </button>
                            </div>
                            <select
                                id="pipeline"
                                value={data.pipeline}
                                onChange={(e) => updateField('pipeline', e.target.value)}
                                className={fieldClass}
                                style={errors.pipeline ? errorInputStyle : inputStyle}
                            >
                                <option value="" disabled>Select a pipeline</option>
                                {pipelineList.map((p) => (
                                    <option key={p.id} value={p.id}>{p.pipeline_name}</option>
                                ))}
                            </select>
                            {errors.pipeline && <p className={errorClass}>{errors.pipeline}</p>}

                            {showAddPipeline && (
                                <div className="mt-2 space-y-2 rounded-md border p-3" style={quickPanelStyle}>
                                    <input
                                        type="text"
                                        placeholder="Pipeline code"
                                        value={newPipeline.pipeline_code}
                                        onChange={(e) => setNewPipeline((p) => ({ ...p, pipeline_code: e.target.value }))}
                                        className={smallFieldClass}
                                        style={inputStyle}
                                    />
                                    {quickErrors.pipeline_code && <p className={errorClass}>{quickErrors.pipeline_code[0]}</p>}

                                    <input
                                        type="text"
                                        placeholder="Pipeline name"
                                        value={newPipeline.pipeline_name}
                                        onChange={(e) => setNewPipeline((p) => ({ ...p, pipeline_name: e.target.value }))}
                                        className={smallFieldClass}
                                        style={inputStyle}
                                    />
                                    {quickErrors.pipeline_name && <p className={errorClass}>{quickErrors.pipeline_name[0]}</p>}

                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddPipeline(false)}
                                            className="text-xs font-semibold"
                                            style={{ color: PALETTE.slate }}
                                        >
                                            Cancel
                                        </button>
                                        <Button type="button" variant="brand" onClick={submitNewPipeline} disabled={quickProcessing}>
                                            Add Pipeline
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="priority" className={labelClass} style={labelStyle}>
                                <Flag className="h-3.5 w-3.5" />
                                Priority
                            </label>
                            <select
                                id="priority"
                                value={data.priority}
                                onChange={(e) => updateField('priority', e.target.value)}
                                className={fieldClass}
                                style={errors.priority ? errorInputStyle : inputStyle}
                            >
                                {PRIORITY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.value}</option>
                                ))}
                            </select>
                            {errors.priority && <p className={errorClass}>{errors.priority}</p>}
                        </div>
                    </div>

                    {/* ---- Items ---- */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className={labelClass} style={labelStyle}>
                                <Package className="h-3.5 w-3.5" />
                                Items <span style={{ color: PALETTE.slate }}>*</span>
                            </span>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1 text-xs font-semibold"
                                style={{ color: PALETTE.slate }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Item
                            </button>
                        </div>

                        {errors.items && <p className={errorClass}>{errors.items}</p>}

                        {items.map((item, index) => {
                            const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                            return (
                                <div key={index} className="rounded-md border p-3" style={{ borderColor: PALETTE.cream }}>
                                    <div className="flex items-start gap-3">
                                        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[1fr_100px_140px_120px]">
                                            <div>
                                                <label className={labelClass} style={labelStyle}>Item</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Widget A"
                                                    value={item.item_name}
                                                    onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                                    className={fieldClass}
                                                    style={errors[`items.${index}.item_name`] ? errorInputStyle : inputStyle}
                                                />
                                                {errors[`items.${index}.item_name`] && (
                                                    <p className={errorClass}>{errors[`items.${index}.item_name`]}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className={labelClass} style={labelStyle}>Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                    className={fieldClass}
                                                    style={errors[`items.${index}.quantity`] ? errorInputStyle : inputStyle}
                                                />
                                                {errors[`items.${index}.quantity`] && (
                                                    <p className={errorClass}>{errors[`items.${index}.quantity`]}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className={labelClass} style={labelStyle}>Unit Price</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                    className={fieldClass}
                                                    style={errors[`items.${index}.unit_price`] ? errorInputStyle : inputStyle}
                                                />
                                                {errors[`items.${index}.unit_price`] && (
                                                    <p className={errorClass}>{errors[`items.${index}.unit_price`]}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className={labelClass} style={labelStyle}>Subtotal</label>
                                                <div
                                                    className={`${fieldClass} bg-gray-50 font-semibold`}
                                                    style={{ ...inputStyle, color: PALETTE.deepEdge }}
                                                >
                                                    {currency(lineTotal)}
                                                </div>
                                            </div>
                                        </div>

                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="mt-6 shrink-0"
                                                style={{ color: PALETTE.slate }}
                                                aria-label="Remove item"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <div
                            className="flex items-center justify-end gap-2 rounded-md border p-3"
                            style={{ borderColor: PALETTE.cream, backgroundColor: PALETTE.mist }}
                        >
                            <Banknote className="h-4 w-4" style={{ color: PALETTE.slate }} />
                            <span className="text-sm font-semibold" style={{ color: PALETTE.slate }}>
                                Total:
                            </span>
                            <span className="text-base font-bold" style={{ color: PALETTE.deepEdge }}>
                                {currency(total)}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="note" className={labelClass} style={labelStyle}>
                            <StickyNote className="h-3.5 w-3.5" />
                            Note (optional)
                        </label>
                        <textarea
                            id="note"
                            rows={3}
                            placeholder="Anything else worth noting..."
                            value={data.note}
                            onChange={(e) => updateField('note', e.target.value)}
                            className={`${fieldClass} resize-y overflow-y-auto`}
                            style={{ ...(errors.note ? errorInputStyle : inputStyle), maxHeight: '160px' }}
                        />
                        {errors.note && <p className={errorClass}>{errors.note}</p>}
                    </div>

                    {showWinningMessage ? (
                        <div
                            className="rounded-md border p-3"
                            style={{ borderColor: PALETTE.cream, backgroundColor: PALETTE.mist }}
                        >
                            <div className="flex items-center justify-between">
                                <label htmlFor="winning_message" className={labelClass} style={labelStyle}>
                                    <Trophy className="h-3.5 w-3.5" />
                                    Winning Message
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowWinningMessage(false);
                                        updateField('winning_message', '');
                                    }}
                                    className="flex items-center gap-1 text-xs font-semibold"
                                    style={{ color: PALETTE.slate }}
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Remove
                                </button>
                            </div>
                            <textarea
                                id="winning_message"
                                rows={2}
                                placeholder="Why did this deal win?"
                                value={data.winning_message}
                                onChange={(e) => updateField('winning_message', e.target.value)}
                                className={`${fieldClass} bg-white resize-y overflow-y-auto`}
                                style={{
                                    ...(errors.winning_message ? errorInputStyle : inputStyle),
                                    maxHeight: '160px',
                                }}
                            />
                            {errors.winning_message && <p className={errorClass}>{errors.winning_message}</p>}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowWinningMessage(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold"
                            style={{ color: PALETTE.slate }}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add custom field (Winning Message)
                        </button>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t pt-4" style={{ borderColor: PALETTE.cream }}>
                    <Button type="button" variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="brand" disabled={processing}>
                        {isEditing ? 'Update' : 'Save'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}