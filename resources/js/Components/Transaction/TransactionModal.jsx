import { useState } from 'react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import {
    Receipt,
    Building2,
    UserRound,
    GitBranch,
    Flag,
    Trophy,
    Banknote,
    StickyNote,
    Plus,
    X,
} from 'lucide-react';

const PALETTE = {
    slate: '#667292',
    teal: '#8d9db6',
    cream: '#bccad6',
    deepEdge: '#3a4157',
    mist: '#eef1f5',
};

const PIPELINE_OPTIONS = [
    'Lead',
    'Qualified',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost',
];

const PRIORITY_OPTIONS = [
    { value: 'Low', color: '#8fb08d' },
    { value: 'Medium', color: '#c9a24b' },
    { value: 'High', color: '#c97a4b' },
    { value: 'Critical', color: '#b5504a' },
];

export default function TransactionModal({ show, onClose }) {
    const [showWinningMessage, setShowWinningMessage] = useState(false);
    const [data, setDataState] = useState({
        name: '',
        clientName: '',
        contactPerson: '',
        pipeline: PIPELINE_OPTIONS[0],
        priority: PRIORITY_OPTIONS[1].value,
        winningMessage: '',
        amount: '',
        note: '',
    });

    const setData = (field, value) => {
        setDataState((prev) => ({ ...prev, [field]: value }));
    };

    const reset = () => {
        setShowWinningMessage(false);
        setDataState({
            name: '',
            clientName: '',
            contactPerson: '',
            pipeline: PIPELINE_OPTIONS[0],
            priority: PRIORITY_OPTIONS[1].value,
            winningMessage: '',
            amount: '',
            note: '',
        });
    };

    const submit = (e) => {
        e.preventDefault();
        // TODO: wire up to backend once the route exists.
        console.log('Transaction submitted (UI only):', data);
        reset();
        onClose();
    };

    const close = () => {
        reset();
        onClose();
    };

    const inputStyle = { borderColor: PALETTE.cream, color: PALETTE.deepEdge };
    const labelStyle = { color: PALETTE.slate };
    const labelClass =
        'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide';
    const fieldClass =
        'mt-1 block w-full rounded-md border px-3 py-2 text-sm transition-shadow focus:outline-none focus:ring-2';

    const currentPriority =
        PRIORITY_OPTIONS.find((p) => p.value === data.priority) ??
        PRIORITY_OPTIONS[1];

    return (
        <Modal show={show} onClose={close} maxWidth="3xl">
            <form onSubmit={submit} className="p-6">
                <div className="flex items-center gap-3">
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: PALETTE.mist }}
                    >
                        <Receipt className="h-4 w-4" style={{ color: PALETTE.slate }} />
                    </span>
                    <div>
                        <h2
                            className="text-base font-semibold"
                            style={{ color: PALETTE.deepEdge }}
                        >
                            New Transaction
                        </h2>
                        <p className="text-sm" style={{ color: PALETTE.slate }}>
                            Fill in the details below.
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <label
                            htmlFor="transaction_name"
                            className={labelClass}
                            style={labelStyle}
                        >
                            <Receipt className="h-3.5 w-3.5" />
                            Transaction Name
                        </label>
                        <input
                            id="transaction_name"
                            type="text"
                            placeholder="e.g. Acme Corp — Annual Renewal"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className={fieldClass}
                            style={inputStyle}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="client_name"
                                className={labelClass}
                                style={labelStyle}
                            >
                                <Building2 className="h-3.5 w-3.5" />
                                Client Name
                            </label>
                            <input
                                id="client_name"
                                type="text"
                                placeholder="e.g. Acme Corp"
                                value={data.clientName}
                                onChange={(e) =>
                                    setData('clientName', e.target.value)
                                }
                                className={fieldClass}
                                style={inputStyle}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="contact_person"
                                className={labelClass}
                                style={labelStyle}
                            >
                                <UserRound className="h-3.5 w-3.5" />
                                Contact Person
                            </label>
                            <input
                                id="contact_person"
                                type="text"
                                placeholder="e.g. Jane Cooper"
                                value={data.contactPerson}
                                onChange={(e) =>
                                    setData('contactPerson', e.target.value)
                                }
                                className={fieldClass}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="pipeline"
                                className={labelClass}
                                style={labelStyle}
                            >
                                <GitBranch className="h-3.5 w-3.5" />
                                Pipeline
                            </label>
                            <select
                                id="pipeline"
                                value={data.pipeline}
                                onChange={(e) =>
                                    setData('pipeline', e.target.value)
                                }
                                className={fieldClass}
                                style={inputStyle}
                            >
                                {PIPELINE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="priority"
                                className={labelClass}
                                style={labelStyle}
                            >
                                <Flag className="h-3.5 w-3.5" />
                                Priority
                            </label>
                            <select
                                id="priority"
                                value={data.priority}
                                onChange={(e) =>
                                    setData('priority', e.target.value)
                                }
                                className={fieldClass}
                                style={inputStyle}
                            >
                                {PRIORITY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.value}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="amount" className={labelClass} style={labelStyle}>
                            <Banknote className="h-3.5 w-3.5" />
                            Amount
                        </label>
                        <input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            className={fieldClass}
                            style={inputStyle}
                        />
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
                            onChange={(e) => setData('note', e.target.value)}
                            className={`${fieldClass} resize-y overflow-y-auto`}
                            style={{ ...inputStyle, maxHeight: '160px' }}
                        />
                    </div>

                    {showWinningMessage ? (
                        <div
                            className="rounded-md border p-3"
                            style={{ borderColor: PALETTE.cream, backgroundColor: PALETTE.mist }}
                        >
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="winning_message"
                                    className={labelClass}
                                    style={labelStyle}
                                >
                                    <Trophy className="h-3.5 w-3.5" />
                                    Winning Message
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowWinningMessage(false);
                                        setData('winningMessage', '');
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
                                value={data.winningMessage}
                                onChange={(e) =>
                                    setData('winningMessage', e.target.value)
                                }
                                className={`${fieldClass} bg-white resize-y overflow-y-auto`}
                                style={{ ...inputStyle, maxHeight: '160px' }}
                            />
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

                <div
                    className="mt-6 flex justify-end gap-2 border-t pt-4"
                    style={{ borderColor: PALETTE.cream }}
                >
                    <Button type="button" variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="brand">
                        Save
                    </Button>
                </div>
            </form>
        </Modal>
    );
}