import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { FileText, Truck, Undo2, X } from 'lucide-react';
import { cx } from '@/Components/ui/kit';

const formatDate = (v) =>
    v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/**
 * transaction = a row of the transactions list (with delivery_history loaded) or null.
 * Read-only: deliveries and returns, newest first.
 */
export default function DeliveryHistoryModal({ transaction, onClose }) {
    const history = transaction?.delivery_history ?? [];

    const net = history.reduce((s, d) => s + d.units, 0);
    const ordered = (transaction?.items ?? []).reduce((s, i) => s + Number(i.quantity ?? 0), 0);

    return (
        <Modal show={Boolean(transaction)} onClose={onClose} maxWidth="2xl">
            {transaction && (
                <div className="flex max-h-[88vh] flex-col bg-[#fbfcfe]">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-[#dbe4ef] bg-white px-6 py-5">
                        <div className="flex min-w-0 items-center gap-3.5">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef3fa] text-[#1b4a7d]">
                                <Truck className="size-5" />
                            </span>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-[#12306b]">Delivery history</h2>
                                <p className="truncate text-sm text-[#6b84a8]">
                                    {transaction.name} · {net} of {ordered} delivered
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="rounded-lg p-1.5 text-[#6b84a8] transition hover:bg-[#eef3fa] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b4a7d]/40"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {history.length === 0 ? (
                            <p className="py-10 text-center text-sm text-slate-500">No deliveries recorded yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {history.map((d) => (
                                    <li key={d.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                                    {d.is_return ? (
                                                        <Undo2 className="h-4 w-4 text-amber-600" />
                                                    ) : (
                                                        <Truck className="h-4 w-4 text-slate-500" />
                                                    )}
                                                    {d.is_return ? 'Return' : 'Delivery'}
                                                    <span
                                                        className={cx(
                                                            'rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                                                            d.units < 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
                                                        )}
                                                    >
                                                        {d.units > 0 ? `+${d.units}` : d.units} unit(s)
                                                    </span>
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {formatDate(d.delivered_at)}
                                                    {d.by && ` · by ${d.by}`}
                                                    {d.dr_number && ` · DR ${d.dr_number}`}
                                                </p>
                                                {d.note && <p className="mt-0.5 text-xs text-slate-500">{d.note}</p>}
                                            </div>

                                            {!d.is_return && d.dr_file_url && (
                                                <a
                                                    href={d.dr_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    {d.dr_file_name || 'Open DR'}
                                                </a>
                                            )}
                                        </div>

                                        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100 text-xs text-slate-600">
                                            {d.lines.map((l, i) => (
                                                <li key={i} className="flex items-start justify-between gap-3 px-3 py-1.5">
                                                    <span className="min-w-0">
                                                        <span className="font-medium text-slate-800">{l.item_name}</span>
                                                        {l.brand_name && ` · ${l.brand_name}`}
                                                        {l.variant_name && ` · ${l.variant_name}`}
                                                        {d.is_return && (
                                                            <span className="block text-[11px] text-slate-500">
                                                                {l.written_off > 0 &&
                                                                    `${l.written_off} written off${l.reason ? ` (${l.reason})` : ''}. `}
                                                                {l.replace ? 'Replacement needed.' : 'No replacement, order reduced.'}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span
                                                        className={cx(
                                                            'shrink-0 font-semibold tabular-nums',
                                                            l.quantity < 0 ? 'text-amber-700' : 'text-slate-900',
                                                        )}
                                                    >
                                                        {l.quantity > 0 ? `+${l.quantity}` : l.quantity}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end border-t border-[#dbe4ef] bg-white px-6 py-3">
                        <Button type="button" variant="brand" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}