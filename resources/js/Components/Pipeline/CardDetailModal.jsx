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
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-words text-sm text-slate-900">{empty ? '—' : children}</dd>
        </div>
    );
}

function SectionTitle({ children }) {
    return <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#667292]">{children}</h3>;
}

function Lines({ cols, rows, total, totalLabel = 'Total' }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-[#bccad6]">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100 bg-[#f3f5f9] text-[11px] font-semibold uppercase tracking-wide text-[#667292]">
                        {cols.map((c) => (
                            <th key={c.key} className={cx('px-3 py-1', c.right ? 'text-right' : 'text-left')}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={cols.length} className="px-3 py-3 text-center text-xs text-slate-500">
                                No items.
                            </td>
                        </tr>
                    )}
                    {rows.map((r, i) => (
                        <tr key={r.id ?? i}>
                            {cols.map((c) => (
                                <td key={c.key} className={cx('px-3 py-1', c.right && 'text-right tabular-nums')}>
                                    {c.render(r)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50">
                        <td colSpan={cols.length - 1} className="px-3 py-1 text-right text-xs font-medium text-slate-500">
                            {totalLabel}
                        </td>
                        <td className="px-3 py-1 text-right font-semibold tabular-nums">{currency(total)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

const itemCell = (r) => (
    <>
        <span className="font-medium text-slate-900">{r.item_name}</span>
        {r.brand_name && <span className="text-slate-500"> — {r.brand_name}</span>}
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
        <div className="space-y-2 rounded-lg bg-white p-2.5 ring-1 ring-[#bccad6]">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <div className="min-w-0 text-sm text-[#3a4157]">
                    <p className="truncate">
                        Client PO <b>{cpo.cpo_number}</b>
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
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

/** Subtotal → markup → VAT → grand total. Hidden when neither markup nor VAT applies. */
function PricingSummary({ item }) {
    const markup = Number(item.markup_percent ?? 0);
    const vat = Number(item.vat_percent ?? 0);
    if (markup <= 0 && vat <= 0) return null;

    return (
        <dl className="w-full space-y-0.5 rounded-lg border border-[#bccad6] px-3 py-2 text-sm">
            <div className="flex justify-between text-slate-500">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-slate-700">{currency(item.subtotal)}</dd>
            </div>
            {markup > 0 && (
                <div className="flex justify-between text-slate-500">
                    <dt>Markup ({markup}%)</dt>
                    <dd className="tabular-nums text-slate-700">{currency(item.markup_amount)}</dd>
                </div>
            )}
            <div className="flex justify-between text-slate-500">
                <dt>VAT ({vat}%)</dt>
                <dd className="tabular-nums text-slate-700">{currency(item.vat_amount)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
                <dt>Grand total</dt>
                <dd className="tabular-nums">{currency(item.total)}</dd>
            </div>
        </dl>
    );
}

/** Quotation row: number, version and a print link. */
function QuotationBox({ item }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#eef1f5] px-3 py-2 text-sm text-[#3a4157]">
            <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#667292]">
                    <FileText className="size-3.5" /> Quotation
                </p>
                <p className="truncate">
                    <b>{item.quotation_number}</b>
                    <span className="text-slate-500">
                        {' '}· {item.version_label}
                        {item.quotation_frozen && ' · sent'}
                    </span>
                    {item.quotation_is_expired && <span className="text-red-600"> (expired)</span>}
                </p>
            </div>
            <a
                href={route('transactions.quotation.print', item.id)}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[#667292] hover:bg-white hover:underline"
            >
                View / Print
            </a>
        </div>
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
        <div className="rounded-lg bg-[#eef1f5] px-3 py-2 text-sm text-[#3a4157]">
            <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#667292]">
                    <Truck className="size-3.5" /> Delivery
                </span>
                <span className="tabular-nums text-[#667292]">
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
                                <FileText className="size-3.5 text-[#667292]" />
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
                                    className="inline-flex max-w-[14rem] items-center gap-1 font-medium text-[#667292] hover:underline"
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
        <div className="space-y-3">
            {/* ---------- Info strip ---------- */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-[#bccad6] px-3 py-2.5 sm:grid-cols-3 lg:grid-cols-4">
                <Meta label="Client">{item.client?.client_name}</Meta>
                <Meta label="Contact">{item.contact_person?.contact_person}</Meta>
                <Meta label="Number">{item.contact_person?.contact_number}</Meta>
                <Meta label="Email">{item.contact_person?.email}</Meta>
                {item.client?.address && <Meta label="Address" className="col-span-2 sm:col-span-2 lg:col-span-2">{item.client.address}</Meta>}
                <Meta label="Stage">{stageName}</Meta>
                <Meta label="Priority">{item.priority ? <PriorityPill value={item.priority} /> : null}</Meta>
            </dl>

            {/* ---------- Documents: quotation + delivery side by side ---------- */}
            {(item.quotation_number || hasDelivery) && (
                <div className={cx('grid gap-3', item.quotation_number && hasDelivery && 'lg:grid-cols-2')}>
                    {item.quotation_number && <QuotationBox item={item} />}
                    {hasDelivery && <DeliveryBox item={item} />}
                </div>
            )}

            {(item.client_purchase_orders ?? []).map((c) => (
                <ClientPoBox key={c.id} cpo={c} transaction={item} />
            ))}

            {/* ---------- Items ---------- */}
            <div>
                <SectionTitle>Items</SectionTitle>
                <Lines cols={cols} rows={item.items ?? []} total={item.subtotal} totalLabel="Subtotal" />
            </div>

            {/* ---------- Remarks + totals ---------- */}
            {(item.remarks || hasPricing) && (
                <div className={cx('grid gap-3', item.remarks && hasPricing && 'lg:grid-cols-[minmax(0,1fr)_16rem]')}>
                    {item.remarks && (
                        <div className="rounded-lg border border-[#bccad6] px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Remarks</p>
                            <p className="mt-0.5 whitespace-pre-line text-sm text-slate-800">{item.remarks}</p>
                        </div>
                    )}
                    {hasPricing && (
                        <div className={cx(!item.remarks && 'lg:ml-auto lg:w-64')}>
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
    const { label, Icon } = KINDS[kind];

    return (
        <Modal show={Boolean(item)} onClose={onClose} maxWidth="4xl">
            {item && (
                <div className="flex max-h-[94vh] flex-col">
                    <div className="flex items-center gap-3 border-b px-4 py-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eef1f5] text-[#667292]">
                            <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
                            <h2 className="truncate text-sm font-semibold text-[#3a4157]">{item.name}</h2>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-base font-semibold tabular-nums text-[#3a4157]">{currency(item.total)}</p>
                            {stageName && <p className="text-xs text-slate-500">{stageName}</p>}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        {kind === 'transaction' && <TransactionBody item={item} stageName={stageName} />}
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