import Modal from '@/Components/Modal';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import { Check, FileText, Pencil, Printer, Receipt } from 'lucide-react';
import { currency } from './Board';
import { cx } from '@/Components/ui/kit';

const KINDS = {
    transaction: { label: 'Transaction', Icon: Receipt },
    quotation: { label: 'Quotation', Icon: FileText },
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
    const delivered = (transaction.deliveries ?? []).length > 0;
    const canEdit = cpo.status !== 'cancelled' && !delivered;

    const confirm = () =>
        router.post(route('client-purchase-orders.confirm', cpo.id), {}, { preserveScroll: true });

    return (
        <div className="space-y-2 rounded-lg bg-white p-3 ring-1 ring-[#bccad6]">
            <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-[#3a4157]">
                    Client PO <b>{cpo.cpo_number}</b>
                    {cpo.client_po_number ? ` (${cpo.client_po_number})` : ' · no client PO number yet'} · {cpo.status}
                </span>
                <div className="flex shrink-0 gap-2">
                    {cpo.status === 'draft' && (
                        <Button type="button" variant="brand" onClick={confirm}>
                            <Check className="size-3.5" /> Confirm
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

function TransactionBody({ item, stageName }) {
    return (
        <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Meta label="Client">{item.client?.client_name}</Meta>
                <Meta label="Contact">{item.contact_person?.contact_person}</Meta>
                <Meta label="Priority">{item.priority}</Meta>
                <Meta label="Stage">{stageName}</Meta>
                <Meta label="Status">{item.status}</Meta>
            </dl>

            {/* Documents the pipeline generated for this transaction */}
            {(item.quotations?.length > 0 || item.client_purchase_orders?.length > 0) && (
                <div className="space-y-2 rounded-lg bg-[#eef1f5] px-3.5 py-2.5 text-sm text-[#3a4157]">
                    {(item.quotations ?? []).map((q) => (
                        <div key={q.id} className="flex items-center justify-between gap-3">
                            <span className="truncate">Quotation <b>{q.quotation_number}</b></span>
                            <a href={route('quotations.print', q.id)} target="_blank" rel="noreferrer"
                               className="shrink-0 text-xs font-medium text-[#667292] hover:underline">View</a>
                        </div>
                    ))}
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
                total={item.total}
            />

            {item.note && <Notes title="Note" text={item.note} />}
        </>
    );
}

function QuotationBody({ item }) {
    const d = item.detail ?? {};
    return (
        <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Meta label="Client">{d.client}</Meta>
                <Meta label="Contact">{d.contact}</Meta>
                <Meta label="Valid until">
                    {d.valid_until}
                    {d.is_expired && <span className="text-red-600"> (expired)</span>}
                </Meta>
                <Meta label="Subject">{d.subject}</Meta>
            </dl>

            {d.transaction && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
                    <span className="min-w-0 truncate">
                        Converted to transaction <b>{d.transaction.name}</b>
                    </span>
                    <Link href={route('transactions.index')} className="shrink-0 text-xs font-medium hover:underline">
                        Open transactions
                    </Link>
                </div>
            )}

            <Lines
                cols={[
                    { key: 'item', label: 'Item', render: itemCell },
                    { key: 'qty', label: 'Qty', right: true, render: (r) => r.quantity },
                    { key: 'price', label: 'Unit price', right: true, render: (r) => currency(r.unit_price) },
                    { key: 'sub', label: 'Subtotal', right: true, render: (r) => currency(r.subtotal) },
                ]}
                rows={d.lines ?? []}
                total={item.total}
            />

            {d.terms && <Notes title="Terms" text={d.terms} />}
            {d.note && <Notes title="Internal note" text={d.note} />}
        </>
    );
}

/** item = a board card (transaction or quotation). stageName = the stage it is in. */
export default function CardDetailModal({ item, stageName, onClose }) {
    const kind = item?.kind ?? 'transaction';
    const { label, Icon } = KINDS[kind];
    const d = item?.detail;

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
                        {kind === 'quotation' && <QuotationBody item={item} />}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-6 py-3">
                        {kind === 'transaction' && (
                            <Link href={route('transactions.edit', item.id)}>
                                <Button variant="outline">
                                    <Pencil className="size-3.5" /> Edit
                                </Button>
                            </Link>
                        )}
                        {kind === 'quotation' && (
                            <>
                                <a href={route('quotations.print', item.id)} target="_blank" rel="noreferrer">
                                    <Button variant="outline">
                                        <Printer className="size-3.5" /> Print
                                    </Button>
                                </a>
                                {d?.can_edit && (
                                    <Link href={route('quotations.edit', item.id)}>
                                        <Button variant="outline">
                                            <Pencil className="size-3.5" /> Edit
                                        </Button>
                                    </Link>
                                )}
                            </>
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