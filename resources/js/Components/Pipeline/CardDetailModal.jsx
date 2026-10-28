import { useState } from 'react';
import Modal from '@/Components/Modal';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import { Check, Pencil, Receipt } from 'lucide-react';
import { currency } from './Board';
import { cx } from '@/Components/ui/kit';

const KINDS = {
    transaction: { label: 'Transaction', Icon: Receipt },
};

function Meta({ label, children }) {
    const empty = children === null || children === undefined || children === '';
    return (
        <div className="min-w-0">
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 truncate text-sm text-slate-900">{empty ? '—' : children}</dd>
        </div>
    );
}

function Lines({ cols, rows, total, totalLabel = 'Total' }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-[#bccad6]">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500">
                        {cols.map((c) => (
                            <th key={c.key} className={cx('px-3 py-2', c.right ? 'text-right' : 'text-left')}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={cols.length} className="px-3 py-4 text-center text-xs text-slate-500">
                                No items.
                            </td>
                        </tr>
                    )}
                    {rows.map((r, i) => (
                        <tr key={r.id ?? i}>
                            {cols.map((c) => (
                                <td key={c.key} className={cx('px-3 py-2', c.right && 'text-right tabular-nums')}>
                                    {c.render(r)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50">
                        <td colSpan={cols.length - 1} className="px-3 py-2 text-right text-xs font-medium text-slate-500">
                            {totalLabel}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{currency(total)}</td>
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

function Notes({ title, text }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{text}</p>
        </div>
    );
}

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
        <div className="space-y-3 rounded-lg bg-white p-3 ring-1 ring-[#bccad6]">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 text-sm text-[#3a4157]">
                    <p className="truncate">
                        Client PO <b>{cpo.cpo_number}</b>
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                            {cpo.status}
                        </span>
                    </p>
                    <p className={cx('mt-0.5 truncate text-xs', missingPoNumber ? 'font-medium text-amber-700' : 'text-slate-500')}>
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
                        <Link
                            href={route('client-purchase-orders.edit', {
                                client_purchase_order: cpo.id,
                                from: 'pipeline',
                            })}
                        >
                            <Button type="button" variant="outline">
                                <Pencil className="size-3.5" /> Edit
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {error && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
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
        <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
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
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                <dt>Grand total</dt>
                <dd className="tabular-nums">{currency(item.total)}</dd>
            </div>
        </dl>
    );
}

function TransactionBody({ item, stageName }) {
    return (
        <>
            {/* The card is minimal, so the full client details live here. */}
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Meta label="Client">{item.client?.client_name}</Meta>
                <Meta label="Contact">{item.contact_person?.contact_person}</Meta>
                <Meta label="Priority">{item.priority}</Meta>
                <Meta label="Number">{item.contact_person?.contact_number}</Meta>
                <Meta label="Email">{item.contact_person?.email}</Meta>
                <Meta label="Stage">{stageName}</Meta>
                {item.client?.address && (
                    <div className="col-span-2 sm:col-span-3">
                        <Meta label="Address">{item.client.address}</Meta>
                    </div>
                )}
            </dl>

            {/* Documents the pipeline generated for this transaction */}
            {(item.quotation_number || item.client_purchase_orders?.length > 0) && (
                <div className="space-y-2 rounded-lg bg-[#eef1f5] px-3.5 py-2.5 text-sm text-[#3a4157]">
                    {/* The quotation is the transaction itself: this row just prints it. */}
                    {item.quotation_number && (
                        <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate">
                                Quotation <b>{item.quotation_number}</b>
                                <span className="text-slate-500">
                                    {' '}
                                    · {item.version_label}
                                    {item.quotation_frozen && ' · sent'}
                                </span>
                                {item.quotation_is_expired && <span className="text-red-600"> (expired)</span>}
                            </span>
                            <a
                                href={route('transactions.quotation.print', item.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[#667292] hover:bg-white hover:underline"
                            >
                                View / Print
                            </a>
                        </div>
                    )}
                    {(item.client_purchase_orders ?? []).map((c) => (
                        <ClientPoBox key={c.id} cpo={c} transaction={item} />
                    ))}
                </div>
            )}

            <Lines
                cols={[
                    { key: 'item', label: 'Item', render: itemCell },
                    { key: 'qty', label: 'Qty', right: true, render: (r) => r.quantity },
                    { key: 'del', label: 'Delivered', right: true, render: (r) => Number(r.delivered_quantity ?? 0) },
                    { key: 'price', label: 'Unit price', right: true, render: (r) => currency(r.unit_price) },
                    { key: 'sub', label: 'Subtotal', right: true, render: (r) => currency(r.quantity * r.unit_price) },
                ]}
                rows={item.items ?? []}
                total={item.subtotal}
                totalLabel="Subtotal"
            />

            <PricingSummary item={item} />

            {item.note && <Notes title="Note" text={item.note} />}
        </>
    );
}

/** item = a board card (a transaction). stageName = the stage it is in. */
export default function CardDetailModal({ item, stageName, onClose }) {
    const kind = item?.kind ?? 'transaction';
    const { label, Icon } = KINDS[kind];

    return (
        <Modal show={Boolean(item)} onClose={onClose} maxWidth="2xl">
            {item && (
                <div className="flex max-h-[88vh] flex-col">
                    <div className="flex items-center gap-3 border-b px-6 py-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef1f5] text-[#667292]">
                            <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
                            <h2 className="truncate text-base font-semibold text-[#3a4157]">{item.name}</h2>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-lg font-semibold tabular-nums text-[#3a4157]">{currency(item.total)}</p>
                            {stageName && <p className="text-xs text-slate-500">{stageName}</p>}
                        </div>
                    </div>

                    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                        {kind === 'transaction' && <TransactionBody item={item} stageName={stageName} />}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-6 py-3">
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