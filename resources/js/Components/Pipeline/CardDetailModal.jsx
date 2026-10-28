import { useState } from 'react';
import Modal from '@/Components/Modal';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import { Check, FileText, Paperclip, Pencil, Receipt, Truck } from 'lucide-react';
import { currency } from './Board';
import { PriorityPill, cx } from '@/Components/ui/kit';

const KINDS = {
    transaction: { label: 'Transaction', Icon: Receipt },
};

/** One label + value pair. */
function Meta({ label, children, className }) {
    const empty = children === null || children === undefined || children === '';
    return (
        <div className={cx('min-w-0', className)}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-[#6b84a8]">{label}</dt>
            <dd className="mt-1 break-words text-base text-slate-900">{empty ? '—' : children}</dd>
        </div>
    );
}

/** Items table: light header, thin dividers. */
function Lines({ cols, rows, total, totalLabel = 'Total', showTotal = true }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-[#dbe4ef] bg-white">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-[#eef3fa] text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {cols.map((c) => (
                            <th key={c.key} className={cx('px-6 py-3', c.right ? 'text-right' : 'text-left')}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#e6edf5]">
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={cols.length} className="px-6 py-4 text-center text-xs text-slate-500">
                                No items.
                            </td>
                        </tr>
                    )}
                    {rows.map((r, i) => (
                        <tr key={r.id ?? i}>
                            {cols.map((c) => (
                                <td key={c.key} className={cx('px-6 py-3.5 text-base', c.right && 'text-right tabular-nums')}>
                                    {c.render(r)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                {showTotal && (
                    <tfoot>
                        <tr className="border-t border-[#dbe4ef] bg-[#f6f9fc]">
                            <td colSpan={cols.length - 1} className="px-6 py-2.5 text-right text-xs font-medium text-slate-500">
                                {totalLabel}
                            </td>
                            <td className="px-6 py-2.5 text-right font-semibold tabular-nums">{currency(total)}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
}

const itemCell = (r) => (
    <>
        <span className="font-medium text-slate-900">{r.item_name}</span>
        {r.brand_name && <span className="text-[#6b84a8]"> — {r.brand_name}</span>}
    </>
);

/** The client's purchase order: the items they ordered, with Confirm and Edit right in the pipeline. */
function ClientPoBox({ cpo, transaction }) {
    const [error, setError] = useState(null);
    const [confirming, setConfirming] = useState(false);

    const delivered = (transaction.deliveries ?? []).length > 0;
    const canEdit = cpo.status !== 'cancelled' && !delivered;
    const missingPoNumber = !String(cpo.client_po_number ?? '').trim();

    const confirm = () => {
        // Same rule the server enforces, checked first so the user gets a clear message.
        if (missingPoNumber) {
            setError("Enter the client's PO number first (use Edit), then confirm.");
            return;
        }

        setError(null);
        router.post(
            route('client-purchase-orders.confirm', cpo.id),
            {},
            {
                preserveScroll: true,
                onStart: () => setConfirming(true),
                onError: (errors) => setError(Object.values(errors)[0] ?? 'Could not confirm this purchase order.'),
                onFinish: () => setConfirming(false),
            },
        );
    };

    return (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-[#dbe4ef]">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <div className="min-w-0 text-sm text-[#12306b]">
                    <p className="truncate">
                        Client PO <b>{cpo.cpo_number}</b>
                        <span className="ml-2 rounded-full bg-[#eef3fa] px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                            {cpo.status}
                        </span>
                    </p>
                    <p className={cx('truncate text-xs', missingPoNumber ? 'font-medium text-amber-700' : 'text-slate-500')}>
                        {missingPoNumber ? 'No client PO number yet' : `Client PO no. ${cpo.client_po_number}`}
                    </p>
                </div>

                <div className="flex shrink-0 gap-2">
                    {cpo.status === 'draft' && (
                        <Button
                            type="button"
                            variant="brand"
                            onClick={confirm}
                            disabled={confirming}
                            title={missingPoNumber ? "Enter the client's PO number first" : undefined}
                            className={missingPoNumber ? 'opacity-60' : undefined}
                        >
                            <Check className="size-3.5" /> {confirming ? 'Confirming…' : 'Confirm'}
                        </Button>
                    )}
                    {canEdit && (
                        <Link href={route('client-purchase-orders.edit', { client_purchase_order: cpo.id, from: 'pipeline' })}>
                            <Button type="button" variant="outline">
                                <Pencil className="size-3.5" /> Edit
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {error && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                    {error}
                </p>
            )}

            <Lines
                cols={[
                    { key: 'item', label: 'Item ordered by client', render: itemCell },
                    { key: 'qty', label: 'Qty', right: true, render: (r) => r.quantity },
                    { key: 'price', label: 'Unit price', right: true, render: (r) => currency(r.unit_price) },
                    { key: 'sub', label: 'Subtotal', right: true, render: (r) => currency(r.quantity * r.unit_price) },
                ]}
                rows={cpo.items ?? []}
                total={cpo.amount}
            />
        </div>
    );
}

/** Subtotal → markup → VAT, a divider, then the Grand total. Hidden when neither markup nor VAT applies. */
function PricingSummary({ item }) {
    const markup = Number(item.markup_percent ?? 0);
    const vat = Number(item.vat_percent ?? 0);
    if (markup <= 0 && vat <= 0) return null;

    return (
        <dl className="w-full rounded-xl bg-[#eef3fa] px-6 py-4 text-base">
            <div className="space-y-1.5">
                <div className="flex justify-between text-slate-600">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums text-slate-800">{currency(item.subtotal)}</dd>
                </div>
                {markup > 0 && (
                    <div className="flex justify-between text-slate-600">
                        <dt>Markup ({markup}%)</dt>
                        <dd className="tabular-nums text-slate-800">{currency(item.markup_amount)}</dd>
                    </div>
                )}
                <div className="flex justify-between text-slate-600">
                    <dt>VAT ({vat}%)</dt>
                    <dd className="tabular-nums text-slate-800">{currency(item.vat_amount)}</dd>
                </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#d5dfec] pt-3 text-lg font-bold text-[#12306b]">
                <dt>Grand Total</dt>
                <dd className="tabular-nums">{currency(item.total)}</dd>
            </div>
        </dl>
    );
}

/** Delivery progress + the delivery receipts (DR number and file) of this transaction. */
function DeliveryBox({ item }) {
    const lines = item.items ?? [];
    const ordered = lines.reduce((s, l) => s + Number(l.quantity ?? 0), 0);
    const delivered = lines.reduce((s, l) => s + Number(l.delivered_quantity ?? 0), 0);
    const deliveries = (item.deliveries ?? []).filter((d) => !d.is_return);
    const withDr = deliveries.filter((d) => d.dr_number || d.dr_file_url);

    if (delivered <= 0 && deliveries.length === 0) return null;

    const pct = ordered ? Math.min(100, Math.round((delivered / ordered) * 100)) : 0;

    return (
        <div className="rounded-xl bg-[#eef3fa] px-4 py-3 text-sm text-[#12306b]">
            <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#6b84a8]">
                    <Truck className="size-3.5" /> Delivery
                </span>
                <span className="tabular-nums text-[#6b84a8]">
                    {delivered}/{ordered} ({pct}%)
                </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>

            {withDr.length > 0 && (
                <ul className="mt-1 divide-y divide-white/70">
                    {withDr.map((d) => (
                        <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-3 py-1 text-xs">
                            <span className="inline-flex items-center gap-1.5">
                                <FileText className="size-3.5 text-[#6b84a8]" />
                                {d.dr_number ? (
                                    <>
                                        DR <b>{d.dr_number}</b>
                                    </>
                                ) : (
                                    'Delivery receipt'
                                )}
                            </span>
                            {d.dr_file_url ? (
                                <a
                                    href={d.dr_file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex max-w-[14rem] items-center gap-1 font-medium text-[#6b84a8] hover:underline"
                                >
                                    <Paperclip className="size-3 shrink-0" />
                                    <span className="truncate">{d.dr_file_name ?? 'View DR'}</span>
                                </a>
                            ) : (
                                <span className="text-slate-500">no file</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function TransactionBody({ item, stageName }) {
    const showDelivered = (item.items ?? []).some((l) => Number(l.delivered_quantity ?? 0) > 0);
    const hasPricing = Number(item.markup_percent ?? 0) > 0 || Number(item.vat_percent ?? 0) > 0;
    const hasDelivery =
        (item.deliveries ?? []).length > 0 || (item.items ?? []).some((l) => Number(l.delivered_quantity ?? 0) > 0);

    const cols = [
        { key: 'item', label: 'Item', render: itemCell },
        { key: 'qty', label: 'Qty', right: true, render: (r) => r.quantity },
        ...(showDelivered
            ? [{ key: 'del', label: 'Delivered', right: true, render: (r) => Number(r.delivered_quantity ?? 0) }]
            : []),
        { key: 'price', label: 'Unit price', right: true, render: (r) => currency(r.unit_price) },
        { key: 'sub', label: 'Subtotal', right: true, render: (r) => currency(r.quantity * r.unit_price) },
    ];

    return (
        <div className="space-y-6">
            {/* ---------- Info grid ---------- */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
                <Meta label="Client">{item.client?.client_name}</Meta>
                <Meta label="Contact">{item.contact_person?.contact_person}</Meta>
                <Meta label="Number">{item.contact_person?.contact_number}</Meta>
                <Meta label="Email">{item.contact_person?.email}</Meta>
                {item.client?.address && (
                    <Meta label="Address" className="col-span-2 sm:col-span-2 lg:col-span-2">
                        {item.client.address}
                    </Meta>
                )}
                <Meta label="Stage">{stageName}</Meta>
                <Meta label="Priority">{item.priority ? <PriorityPill value={item.priority} /> : null}</Meta>
            </dl>

            {hasDelivery && <DeliveryBox item={item} />}

            {(item.client_purchase_orders ?? []).map((c) => (
                <ClientPoBox key={c.id} cpo={c} transaction={item} />
            ))}

            {/* ---------- Items ---------- */}
            <Lines
                cols={cols}
                rows={item.items ?? []}
                total={item.subtotal}
                totalLabel="Subtotal"
                showTotal={!hasPricing}
            />

            {/* ---------- Remarks + totals ---------- */}
            {(item.remarks || hasPricing) && (
                <div className={cx('grid gap-4', item.remarks && hasPricing && 'lg:grid-cols-[minmax(0,1fr)_20rem]')}>
                    {item.remarks && (
                        <div className="rounded-xl border border-[#dbe4ef] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b84a8]">Remarks</p>
                            <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{item.remarks}</p>
                        </div>
                    )}
                    {hasPricing && (
                        <div className={cx(!item.remarks && 'lg:ml-auto lg:w-80')}>
                            <PricingSummary item={item} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/** item = a board card (a transaction). stageName = the stage it is in. */
export default function CardDetailModal({ item, stageName, onClose }) {
    const kind = item?.kind ?? 'transaction';
    const { label } = KINDS[kind];

    return (
        <Modal show={Boolean(item)} onClose={onClose} maxWidth="4xl">
            {item && (
                <div className="flex max-h-[94vh] flex-col bg-[#fbfcfe]">
                    <div className="flex-1 overflow-y-auto">
                        {/* ---------- Header ---------- */}
                        <div className="flex items-start justify-between gap-4 px-8 pb-5 pt-7">
                            <div className="flex min-w-0 items-center gap-5">
                                <span className="relative shrink-0 text-[#1b4a7d]">
                                    <Receipt className="size-14" strokeWidth={1.5} />
                                    <span className="absolute -bottom-1 -right-2 flex size-6 items-center justify-center rounded-full bg-[#4a6fa0] text-xs font-bold text-white">
                                        ₱
                                    </span>
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-3xl font-extrabold uppercase tracking-wide text-[#12306b]">
                                        {label} slip
                                    </h2>
                                    <p className="truncate text-xl text-[#6b84a8]">{stageName ?? item.name}</p>
                                </div>
                            </div>

                            {item.quotation_number && (
                                <div className="shrink-0 rounded-xl bg-[#eef3fa] px-6 py-3">
                                    <p className="text-sm text-[#6b84a8]">Quotation No.</p>
                                    <p className="text-xl font-medium tabular-nums text-[#12306b]">{item.quotation_number}</p>
                                    <p className="mt-0.5 text-xs text-[#6b84a8]">
                                        {item.version_label}
                                        {item.quotation_frozen && ' · sent'}
                                        {item.quotation_is_expired && <span className="text-red-600"> (expired)</span>}
                                        {' · '}
                                        <a
                                            href={route('transactions.quotation.print', item.id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-medium text-[#1b4a7d] hover:underline"
                                        >
                                            View / Print
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mx-8 border-t border-[#c9d6e5]" />

                        {/* ---------- Body ---------- */}
                        <div className="px-8 pb-8 pt-6">
                            {kind === 'transaction' && <TransactionBody item={item} stageName={stageName} />}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-4 py-2">
                        {kind === 'transaction' && (
                            <Link href={route('transactions.edit', { transaction: item.id, from: 'pipeline' })}>
                                <Button variant="outline">
                                    <Pencil className="size-3.5" /> Edit
                                </Button>
                            </Link>
                        )}
                        <Button type="button" variant="brand" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}