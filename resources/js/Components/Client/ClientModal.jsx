import { useEffect } from 'react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { useForm } from '@inertiajs/react';
import {
    Building2,
    Hash,
    UserRound,
    Mail,
    Phone,
    Plus,
    Trash2,
} from 'lucide-react';

const PALETTE = {
    slate: '#667292',
    teal: '#8d9db6',
    cream: '#bccad6',
    deepEdge: '#3a4157',
    mist: '#eef1f5',
};

const emptyContact = () => ({ contact_person: '', contact_number: '', email: '' });

const emptyForm = () => ({
    client_code: '',
    client_name: '',
    contacts: [emptyContact()],
});

export default function ClientModal({ show, onClose, client }) {
    const isEditing = Boolean(client);

    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm(emptyForm());

    const contacts = data.contacts ?? [emptyContact()];

    // when the modal opens for editing, load that client's data in;
    // when opening for create, reset to blank
    useEffect(() => {
        if (show && client) {
            setData({
                client_code: client.client_code ?? '',
                client_name: client.client_name ?? '',
                contacts:
                    client.contact_people?.length > 0
                        ? client.contact_people.map((c) => ({
                              contact_person: c.contact_person ?? '',
                              contact_number: c.contact_number ?? '',
                              email: c.email ?? '',
                          }))
                        : [emptyContact()],
            });
        } else if (show && !client) {
            reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, client]);

    const updateField = (field, value) => {
        setData(field, value);
        if (value.trim() !== '') {
            clearErrors(field);
        }
    };

    const updateContact = (index, field, value) => {
        const updated = contacts.map((contact, i) =>
            i === index ? { ...contact, [field]: value } : contact
        );
        setData('contacts', updated);
        if (value.trim() !== '') {
            clearErrors(`contacts.${index}.${field}`);
        }
    };

    const addContact = () => {
        setData('contacts', [...contacts, emptyContact()]);
    };

    const removeContact = (index) => {
        setData(
            'contacts',
            contacts.filter((_, i) => i !== index)
        );
    };

    const submit = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (isEditing) {
            put(route('clients.update', client.id), options);
        } else {
            post(route('clients.store'), options);
        }
    };

    const close = () => {
        reset();
        clearErrors();
        onClose();
    };

    const inputStyle = { borderColor: PALETTE.cream, color: PALETTE.deepEdge };
    const errorInputStyle = { borderColor: '#dc2626', color: PALETTE.deepEdge };
    const labelStyle = { color: PALETTE.slate };
    const labelClass =
        'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide';
    const fieldClass =
        'mt-1 block w-full rounded-md border px-3 py-2 text-sm transition-shadow focus:outline-none focus:ring-2';
    const errorClass = 'mt-1 text-xs text-red-600';

    return (
        <Modal show={show} onClose={close} maxWidth="3xl">
            <form onSubmit={submit} noValidate className="p-6">
                <div className="flex items-center gap-3">
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: PALETTE.mist }}
                    >
                        <Building2 className="h-4 w-4" style={{ color: PALETTE.slate }} />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold" style={{ color: PALETTE.deepEdge }}>
                            {isEditing ? 'Edit Client' : 'New Client'}
                        </h2>
                        <p className="text-sm" style={{ color: PALETTE.slate }}>
                            Fill in the details below.
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="client_code" className={labelClass} style={labelStyle}>
                                <Hash className="h-3.5 w-3.5" />
                                Client Code <span style={{ color: PALETTE.slate }}>*</span>
                            </label>
                            <input
                                id="client_code"
                                type="text"
                                placeholder="e.g. ACME-001"
                                value={data.client_code}
                                onChange={(e) => updateField('client_code', e.target.value)}
                                className={fieldClass}
                                style={errors.client_code ? errorInputStyle : inputStyle}
                            />
                            {errors.client_code && <p className={errorClass}>{errors.client_code}</p>}
                        </div>

                        <div>
                            <label htmlFor="client_name" className={labelClass} style={labelStyle}>
                                <Building2 className="h-3.5 w-3.5" />
                                Client Name <span style={{ color: PALETTE.slate }}>*</span>
                            </label>
                            <input
                                id="client_name"
                                type="text"
                                placeholder="e.g. Acme Corp"
                                value={data.client_name}
                                onChange={(e) => updateField('client_name', e.target.value)}
                                className={fieldClass}
                                style={errors.client_name ? errorInputStyle : inputStyle}
                            />
                            {errors.client_name && <p className={errorClass}>{errors.client_name}</p>}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className={labelClass} style={labelStyle}>
                                <UserRound className="h-3.5 w-3.5" />
                                Contact People
                            </span>
                            <button
                                type="button"
                                onClick={addContact}
                                className="flex items-center gap-1 text-xs font-semibold"
                                style={{ color: PALETTE.slate }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Contact
                            </button>
                        </div>

                        {contacts.map((contact, index) => (
                            <div key={index} className="rounded-md border p-3" style={{ borderColor: PALETTE.cream }}>
                                <div className="flex items-start gap-3">
                                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div>
                                            <label htmlFor={`contact_person_${index}`} className={labelClass} style={labelStyle}>
                                                <UserRound className="h-3.5 w-3.5" />
                                                Name <span style={{ color: PALETTE.slate }}>*</span>
                                            </label>
                                            <input
                                                id={`contact_person_${index}`}
                                                type="text"
                                                placeholder="e.g. Jane Cooper"
                                                value={contact.contact_person}
                                                onChange={(e) => updateContact(index, 'contact_person', e.target.value)}
                                                className={fieldClass}
                                                style={errors[`contacts.${index}.contact_person`] ? errorInputStyle : inputStyle}
                                            />
                                            {errors[`contacts.${index}.contact_person`] && (
                                                <p className={errorClass}>{errors[`contacts.${index}.contact_person`]}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor={`contact_number_${index}`} className={labelClass} style={labelStyle}>
                                                <Phone className="h-3.5 w-3.5" />
                                                Number
                                            </label>
                                            <input
                                                id={`contact_number_${index}`}
                                                type="tel"
                                                placeholder="+1 (555) 000-0000"
                                                value={contact.contact_number}
                                                onChange={(e) => updateContact(index, 'contact_number', e.target.value)}
                                                className={fieldClass}
                                                style={errors[`contacts.${index}.contact_number`] ? errorInputStyle : inputStyle}
                                            />
                                            {errors[`contacts.${index}.contact_number`] && (
                                                <p className={errorClass}>{errors[`contacts.${index}.contact_number`]}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor={`email_${index}`} className={labelClass} style={labelStyle}>
                                                <Mail className="h-3.5 w-3.5" />
                                                Email
                                            </label>
                                            <input
                                                id={`email_${index}`}
                                                type="email"
                                                placeholder="jane@acme.com"
                                                value={contact.email}
                                                onChange={(e) => updateContact(index, 'email', e.target.value)}
                                                className={fieldClass}
                                                style={errors[`contacts.${index}.email`] ? errorInputStyle : inputStyle}
                                            />
                                            {errors[`contacts.${index}.email`] && (
                                                <p className={errorClass}>{errors[`contacts.${index}.email`]}</p>
                                            )}
                                        </div>
                                    </div>

                                    {contacts.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeContact(index)}
                                            className="mt-6 shrink-0"
                                            style={{ color: PALETTE.slate }}
                                            aria-label="Remove contact"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
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