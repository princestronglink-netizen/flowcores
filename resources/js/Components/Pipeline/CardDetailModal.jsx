import { useState } from 'react';
import Modal from '@/Components/Modal';
import { Link } from '@inertiajs/react';
import ConfirmClientPoModal from '@/Components/ClientPurchaseOrder/ConfirmClientPoModal';
import { Button } from '@/Components/ui/Button';
import { AlertTriangle, Check, CheckCircle2, FileText, Paperclip, Pencil, Receipt } from 'lucide-react';
import { currency, useCan, useCanViewAmounts, stageDeadline } from './Board';
import { PriorityPill, cx } from '@/Components/ui/kit';

/* ------------------------------ helpers ------------------------------ */

const norm = (s) => String(s ?? '').trim().toLowerCase();
const num = (v) => Number(v ?? 0);
const money = (n) => Math.round(num(n) * 100) / 100;

// One row per VARIANT (item + brand + variant). Falls back to item + brand when a line has no variant id.
const keyOf = (l) => (l.item_variant_id ? `v${l.item_variant_id}` : `${norm(l.item_name)}|${norm(l.brand_name)}`);

// Variant text of a line. Quotation lines carry `variant.label` (size + unit of measure),
// client PO lines carry `variant_label` (added by PipelineController).
const variantLabel = (l) => {
    const v = l.variant_label ?? l.variant?.label ?? null;
    return v && v !== '—' ? String(v) : null;
};

/**
 * One row per item + brand + variant, merging the quotation lines, the client PO lines and the deliveries.
 * Quotation and PO are compared by quantity and by LINE TOTAL (qty x price), not by unit price.
 * Each row also carries its own list of problems, so nothing has to be compared by eye.
 */
function buildRows({ item, cpos, canViewAmounts }) {
    const map = new Map();
    const get = (l) => {
        const k = keyOf(l);
        if (!map.has(k)) {
            map.set(k, {
                key: k, name: l.item_name, brand: l.brand_name, variant: null,
                qQty: 0, qAmt: 0, pQty: 0, pAmt: 0, delivered: 0, inQuote: false, inPo: false,
            });
        }
        const r = map.get(k);
        if (!r.variant) r.variant = variantLabel(l);
        return r;
    };

    (item.items ?? []).forEach((l) => {
        const r = get(l);
        r.inQuote = true;
        r.qQty += num(l.quantity);
        r.qAmt += num(l.quantity) * num(l.unit_price);
        r.delivered += num(l.delivered_quantity);
    });

    cpos.forEach((c) =>
        (c.items ?? []).forEach((l) => {
            const r = get(l);
            r.inPo = true;
            r.pQty += num(l.quantity);
            r.pAmt += num(l.quantity) * num(l.unit_price);
        }),
    );

    const hasPo = cpos.length > 0;

    return [...map.values()]
        .map((r) => {
            const target = hasPo && r.inPo ? r.pQty : r.qQty; // what should end up delivered
            const problems = [];

            if (hasPo && !r.inPo) problems.push('Not on PO');
            if (hasPo && !r.inQuote) problems.push('Not on quotation');
            if (hasPo && r.inPo && r.inQuote && r.pQty !== r.qQty) problems.push('Qty differs');
            if (canViewAmounts && hasPo && r.inPo && r.inQuote && money(r.pAmt) !== money(r.qAmt)) problems.push('Total differs');
            if (r.delivered > target) problems.push('Over-delivered');

            return { ...r, target, balance: target - r.delivered, problems };
        })
        .sort(
            (a, b) =>
                String(a.name ?? '').localeCompare(String(b.name ?? '')) ||
                String(a.brand ?? '').localeCompare(String(b.brand ?? '')) ||
                String(a.variant ?? '').localeCompare(String(b.variant ?? '')),
        );
}

/* ------------------------------ parts ------------------------------ */

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

/**
 * Slim strip per client PO: number, status, client PO no./date, Confirm.
 * No edit button: a draft follows the quotation, a confirmed PO is frozen.
 * Confirm opens a modal that requires the client's PO number and PO date.
 *
 * PERMISSION (the server checks it again): auth.can.confirm_client_po -> Confirm button
 */
function ClientPoStrip({ cpo }) {
    const [confirming, setConfirming] = useState(false);
    const canConfirm = useCan('confirm_client_po');
    const confirmed = cpo.status === 'confirmed';

    return (
        <div className="space-y-2 rounded-xl bg-white px-4 py-3 ring-1 ring-[#dbe4ef]">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <div className="min-w-0 text-sm text-[#12306b]">
                    <p className="truncate">
                        Client PO <b>{cpo.cpo_number}</b>
                        <span className="ml-2 rounded-full bg-[#eef3fa] px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                            {cpo.status}
                        </span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                        {confirmed
                            ? `Client PO no. ${cpo.client_po_number}${cpo.client_po_date ? ` · ${String(cpo.client_po_date).slice(0, 10)}` : ''}`
                            : cpo.status === 'draft'
                              ? 'Follows the quotation until confirmed'
                              : null}
                    </p>
                </div>

                {cpo.status === 'draft' && canConfirm && (
                    <Button type="button" variant="brand" onClick={() => setConfirming(true)} className="shrink-0">
                        <Check className="size-3.5" /> Confirm
                    </Button>
                )}
            </div>

            {canConfirm && (
                <ConfirmClientPoModal cpo={confirming ? cpo : null} onClose={() => setConfirming(false)} />
            )}
        </div>
    );
}

/** Subtotal → markup → VAT, a divider, then the Grand total. Hidden when neither markup nor VAT applies. */
function PricingSummary({ item }) {
    const markup = num(item.markup_percent);
    const vat = num(item.vat_percent);
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

/**
 * THE cross-check table: quotation ↔ client PO ↔ delivered, one row per item + brand + variant.
 * Amounts are LINE TOTALS (qty x price), not unit prices.
 * Columns appear only when they apply (PO columns only when a PO exists, etc.).
 *
 * isFirstStage = true → the card is still a plain "Transaction", so the table says
 * "Transaction" / "Qty" / "Total" instead of "Quotation ...".
 */
function CrossCheckTable({ item, cpos, canViewAmounts, checking = true, isFirstStage = false }) {
    const hasPo = cpos.length > 0;
    const hasDelivery = (item.deliveries ?? []).length > 0 || (item.items ?? []).some((l) => num(l.delivered_quantity) > 0);

    const rows = buildRows({ item, cpos, canViewAmounts });
    const issues = rows.filter((r) => r.problems.length > 0).length;

    const th = (right) => cx('whitespace-nowrap px-4 py-3', right ? 'text-right' : 'text-left');
    const td = (right) => cx('px-4 py-3 text-sm', right && 'text-right tabular-nums');

    const tot = rows.reduce(
        (s, r) => ({
            q: s.q + r.qQty,
            p: s.p + r.pQty,
            d: s.d + r.delivered,
            b: s.b + Math.max(0, r.balance),
            qa: s.qa + r.qAmt,
            pa: s.pa + r.pAmt,
        }),
        { q: 0, p: 0, d: 0, b: 0, qa: 0, pa: 0 },
    );

    // Number of columns before the "Check" column, for the empty-state row (Item + Brand + Variant + Qty ...).
    const leadCols = 3 + 1 + (hasPo ? 1 : 0) + (hasDelivery ? 2 : 0) + (canViewAmounts ? (hasPo ? 2 : 1) : 0);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#12306b]">
                    {isFirstStage ? (
                        'Transaction'
                    ) : (
                        <>
                            Quotation{hasPo && ' · PO'}{hasDelivery && ' · Delivery'}
                        </>
                    )}
                </h3>
                {rows.length > 0 && checking && (
                    <span
                        className={cx(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                            issues > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
                        )}
                    >
                        {issues > 0 ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
                        {issues > 0 ? `${issues} ${issues === 1 ? 'item needs' : 'items need'} checking` : 'Everything matches'}
                    </span>
                )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#dbe4ef] bg-white">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#eef3fa] text-xs font-semibold uppercase tracking-wide text-slate-600">
                            <th className={th(false)}>Item</th>
                            <th className={th(false)}>Brand</th>
                            <th className={th(false)}>Variant</th>
                            <th className={th(true)}>{isFirstStage ? 'Qty' : 'Quotation qty'}</th>
                            {hasPo && <th className={th(true)}>PO qty</th>}
                            {hasDelivery && <th className={th(true)}>Delivered</th>}
                            {hasDelivery && <th className={th(true)}>Balance</th>}
                            {canViewAmounts && <th className={th(true)}>{isFirstStage ? 'Total' : 'Quotation total'}</th>}
                            {canViewAmounts && hasPo && <th className={th(true)}>PO total</th>}
                            {checking && <th className={th(false)}>Check</th>}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[#e6edf5]">
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={leadCols + (checking ? 1 : 0)} className="px-4 py-4 text-center text-xs text-slate-500">
                                    No items.
                                </td>
                            </tr>
                        )}

                        {rows.map((r) => {
                            const qtyDiff = checking && hasPo && r.inPo && r.inQuote && r.pQty !== r.qQty;
                            const totalDiff = checking && canViewAmounts && hasPo && r.inPo && r.inQuote && money(r.pAmt) !== money(r.qAmt);
                            const over = checking && r.delivered > r.target;
                            const complete = checking && r.delivered > 0 && r.delivered === r.target;
                            const bad = 'font-semibold text-amber-700';

                            return (
                                <tr key={r.key} className={checking && r.problems.length > 0 ? 'bg-amber-50/40' : undefined}>
                                    <td className={cx(td(false), 'font-medium text-slate-900')}>{r.name || '—'}</td>
                                    <td className={cx(td(false), 'text-slate-700')}>{r.brand || '—'}</td>
                                    <td className={td(false)}>
                                        {r.variant ? (
                                            <span className="rounded-full bg-[#eef3fa] px-2 py-0.5 text-xs font-medium text-[#4a5d7a]">
                                                {r.variant}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </td>

                                    <td className={cx(td(true), !r.inQuote && 'text-slate-400')}>{r.inQuote ? r.qQty : '—'}</td>

                                    {hasPo && (
                                        <td className={cx(td(true), qtyDiff || (checking && !r.inPo) ? bad : '')}>{r.inPo ? r.pQty : '—'}</td>
                                    )}

                                    {hasDelivery && (
                                        <td
                                            className={cx(
                                                td(true),
                                                over ? 'font-semibold text-red-700' : complete ? 'font-medium text-emerald-700' : '',
                                            )}
                                        >
                                            {r.delivered}
                                        </td>
                                    )}
                                    {hasDelivery && (
                                        <td className={cx(td(true), r.balance > 0 ? 'text-slate-700' : 'text-slate-400')}>
                                            {Math.max(0, r.balance)}
                                        </td>
                                    )}

                                    {canViewAmounts && (
                                        <td className={td(true)}>{r.inQuote ? currency(r.qAmt) : '—'}</td>
                                    )}
                                    {canViewAmounts && hasPo && (
                                        <td className={cx(td(true), totalDiff ? bad : '')}>{r.inPo ? currency(r.pAmt) : '—'}</td>
                                    )}

                                    {checking && (
                                        <td className={td(false)}>
                                            {r.problems.length === 0 ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                                    <CheckCircle2 className="size-3.5" /> OK
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-start gap-1 text-xs font-medium text-amber-700">
                                                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                                                    {r.problems.join(' · ')}
                                                </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>

                    {rows.length > 0 && (
                        <tfoot>
                            <tr className="border-t border-[#dbe4ef] bg-[#f6f9fc] text-sm font-semibold">
                                <td colSpan={3} className="px-4 py-2.5 text-xs font-medium text-slate-500">Total</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{tot.q}</td>
                                {hasPo && <td className="px-4 py-2.5 text-right tabular-nums">{tot.p}</td>}
                                {hasDelivery && <td className="px-4 py-2.5 text-right tabular-nums">{tot.d}</td>}
                                {hasDelivery && <td className="px-4 py-2.5 text-right tabular-nums">{tot.b}</td>}
                                {canViewAmounts && (
                                    <td
                                        className="px-4 py-2.5 text-right tabular-nums"
                                        title={isFirstStage ? 'Transaction items total' : 'Quotation items total'}
                                    >
                                        {currency(tot.qa)}
                                    </td>
                                )}
                                {canViewAmounts && hasPo && (
                                    <td className="px-4 py-2.5 text-right tabular-nums" title="Client PO items total">
                                        {currency(tot.pa)}
                                    </td>
                                )}
                                {checking && <td className="px-4 py-2.5" />}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

/** Delivery receipts only (DR number + file). Quantities are already in the table above. */
function DeliveryReceipts({ item }) {
    const withDr = (item.deliveries ?? []).filter((d) => !d.is_return && (d.dr_number || d.dr_file_url));
    if (withDr.length === 0) return null;

    return (
        <div className="rounded-xl bg-[#eef3fa] px-4 py-3 text-sm text-[#12306b]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b84a8]">Delivery receipts</p>
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
        </div>
    );
}

/** "Due in this stage" value: date, red when overdue, amber when due today. Empty when the stage has no day limit. */
function StageDue({ item, stage }) {
    const d = stageDeadline(item, stage);
    if (!d) return null;

    const date = d.due.toLocaleDateString(undefined, { dateStyle: 'medium' });

    return (
        <span className={d.overdue ? 'font-semibold text-red-600' : d.dueToday ? 'font-semibold text-amber-600' : ''}>
            {date}
            {d.overdue && ` · overdue by ${d.daysLate} ${d.daysLate === 1 ? 'day' : 'days'}`}
            {d.dueToday && ' · due today'}
        </span>
    );
}

function TransactionBody({ item, stage, stageName, canViewAmounts, checking, isFirstStage }) {
    // Only a CONFIRMED client PO appears in the cross-check table. Drafts still show in the strip above (to Confirm / Edit).
    const cpos = (item.client_purchase_orders ?? []).filter((c) => c.status === 'confirmed');
    const hasPricing = canViewAmounts && (num(item.markup_percent) > 0 || num(item.vat_percent) > 0);

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
                <Meta label="Due in this stage">
                    <StageDue item={item} stage={stage} />
                </Meta>
                <Meta label="Priority">{item.priority ? <PriorityPill value={item.priority} /> : null}</Meta>
            </dl>

            {/* ---------- Client PO strip (Confirm only), no table ---------- */}
            {(item.client_purchase_orders ?? []).map((c) => (
                <ClientPoStrip key={c.id} cpo={c} />
            ))}

            {/* ---------- The one table ---------- */}
            <CrossCheckTable
                item={item}
                cpos={cpos}
                canViewAmounts={canViewAmounts}
                checking={checking}
                isFirstStage={isFirstStage}
            />

            <DeliveryReceipts item={item} />

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

/**
 * item = a board card (a transaction). stage = the stage it is in (used for the due date).
 * stageName = the name of that stage.
 * checking = false in the first stage (no cross-check there), unless that stage is where the quotation is created.
 * isFirstStage = true when the card is in the first (initial) stage: the table is then called "Transaction", not "Quotation".
 */
export default function CardDetailModal({
    item,
    stage = null,
    stageName,
    checking = true,
    isFirstStage = false,
    onClose,
}) {
    const canViewAmounts = useCanViewAmounts();

    // PERMISSION: auth.can.print_quotation = quotation.view + amounts.view (the server checks this again)
    const canPrintQuotation = useCan('print_quotation');

    // PERMISSION: auth.can.edit_transaction = transaction.edit (the server checks this again)
    const canEditTransaction = useCan('edit_transaction');

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
                                    {canViewAmounts && (
                                        <span className="absolute -bottom-1 -right-2 flex size-6 items-center justify-center rounded-full bg-[#4a6fa0] text-xs font-bold text-white">
                                            ₱
                                        </span>
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-3xl font-extrabold uppercase tracking-wide text-[#12306b]">
                                        Transaction slip
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
                                        {canPrintQuotation && (
                                            <>
                                                {' · '}
                                                <a
                                                    href={route('transactions.quotation.print', item.id)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="font-medium text-[#1b4a7d] hover:underline"
                                                >
                                                    View / Print
                                                </a>
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mx-8 border-t border-[#c9d6e5]" />

                        {/* ---------- Body ---------- */}
                        <div className="px-8 pb-8 pt-6">
                            <TransactionBody
                                item={item}
                                stage={stage}
                                stageName={stageName}
                                canViewAmounts={canViewAmounts}
                                checking={checking}
                                isFirstStage={isFirstStage}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-4 py-2">
                        {canEditTransaction && (
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