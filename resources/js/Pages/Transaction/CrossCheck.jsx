// resources/js/Pages/Transaction/CrossCheck.jsx
import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import { Button } from '@/Components/ui/Button';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Layers,
    ListChecks,
    Truck,
    Undo2,
    XCircle,
} from 'lucide-react';
import { currency, cx } from '@/Components/ui/kit';

/* ------------------------------ helpers ------------------------------ */

const formatDate = (v) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const formatShort = (v) => (v ? new Date(v).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—');
const isNil = (v) => v === null || v === undefined;
const sum = (list, key) => list.reduce((s, r) => s + (Number(r[key]) || 0), 0);
const differs = (a, b) => !isNil(a) && !isNil(b) && Math.abs(Number(a) - Number(b)) >= 0.005;

/* ------------------------------- parts -------------------------------- */

function Card({ title, subtitle, icon: Icon, children, aside, className }) {
    return (
        <section className={cx('flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
                <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        {Icon && <Icon className="h-4 w-4 text-slate-500" />}
                        {title}
                    </h3>
                    {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                </div>
                {aside}
            </header>
            {children}
        </section>
    );
}

/** Quantity cell. Red when it differs from the reference value. */
function Qty({ value, against, strong = false }) {
    const bad = differs(value, against);
    return (
        <span className={cx('tabular-nums', strong && 'font-semibold', bad && 'font-semibold text-red-600')}>
            {isNil(value) ? '—' : value}
        </span>
    );
}

/** Money cell. Red when it differs from the reference value. */
function Money({ value, against, strong = false, muted = false }) {
    const bad = differs(value, against);
    return (
        <span
            className={cx(
                'tabular-nums',
                strong && 'font-semibold',
                muted && 'text-slate-500',
                bad && 'font-semibold text-red-600',
            )}
        >
            {isNil(value) ? '—' : currency(value)}
        </span>
    );
}

/** One column of the breakdown comparison (subtotal → markup → VAT → total). */
function BreakdownColumn({ title, subtitle, data, highlightTotal }) {
    return (
        <div className="bg-white px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mb-2 truncate text-xs text-slate-500">{subtitle}</p>

            {!data ? (
                <p className="text-sm text-slate-400">Not available</p>
            ) : (
                <dl className="space-y-1 text-sm">
                    <div className="flex justify-between text-slate-500">
                        <dt>Subtotal</dt>
                        <dd className="tabular-nums text-slate-800">{currency(data.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between text-slate-500">
                        <dt>Markup ({data.markup_percent}%)</dt>
                        <dd className="tabular-nums text-slate-800">{currency(data.markup_amount)}</dd>
                    </div>
                    <div className="flex justify-between text-slate-500">
                        <dt>VAT ({data.vat_percent}%)</dt>
                        <dd className="tabular-nums text-slate-800">{currency(data.vat_amount)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-dashed border-slate-300 pt-1.5">
                        <dt className="font-medium text-slate-700">Total</dt>
                        <dd className={cx('text-lg font-semibold tabular-nums', highlightTotal ? 'text-red-600' : 'text-slate-900')}>
                            {currency(data.total)}
                        </dd>
                    </div>
                    {data.stored_total != null && Math.abs(data.stored_total - data.total) >= 0.01 && (
                        <p className="pt-1 text-xs text-red-600">
                            PO record says {currency(data.stored_total)}, but its lines add up to {currency(data.total)}.
                        </p>
                    )}
                </dl>
            )}
        </div>
    );
}

/* ---------------------------- line-by-line table ---------------------------- */

const th = 'whitespace-nowrap px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600';
const thGroup = 'border-l border-slate-200 px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-700';
const td = 'px-2 py-1.5 text-sm';
const groupStart = 'border-l border-slate-100';

function LineTable({ rows, showAmounts }) {
    // item -> brand -> variants, plus item subtotals
    const grouped = useMemo(() => {
        const items = new Map();
        rows.forEach((r) => {
            const itemKey = r.item_name ?? '—';
            const brandKey = r.brand_name || 'No brand';
            if (!items.has(itemKey)) items.set(itemKey, new Map());
            const brands = items.get(itemKey);
            if (!brands.has(brandKey)) brands.set(brandKey, []);
            brands.get(brandKey).push(r);
        });
        return [...items.entries()].map(([item, brands]) => {
            const all = [...brands.values()].flat();
            return {
                item,
                count: all.length,
                totals: {
                    quoted: sum(all, 'quoted_total'),
                    po: sum(all, 'po_total'),
                    delivered: sum(all, 'delivered_total'),
                },
                brands: [...brands.entries()].map(([brand, variants]) => ({ brand, variants })),
            };
        });
    }, [rows]);

    const grand = useMemo(
        () => ({
            quoted_qty: sum(rows, 'quoted_qty'),
            po_qty: sum(rows, 'po_qty'),
            final_qty: sum(rows, 'final_qty'),
            delivered: sum(rows, 'delivered'),
            quoted_total: sum(rows, 'quoted_total'),
            po_total: sum(rows, 'po_total'),
            final_total: sum(rows, 'final_total'),
            delivered_total: sum(rows, 'delivered_total'),
        }),
        [rows],
    );

    const colCount = showAmounts ? 14 : 7;

    if (rows.length === 0) {
        return <p className="px-4 py-6 text-center text-sm text-slate-500">No lines to compare.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                        <th rowSpan={2} className={cx(th, 'sticky left-0 z-10 bg-slate-50 align-bottom')}>
                            Item · Brand · Variant
                        </th>
                        <th colSpan={4} className={thGroup}>Quantity</th>
                        <th rowSpan={2} className={cx(th, groupStart, 'align-bottom')}>Delivered per DR</th>
                        {showAmounts && <th colSpan={3} className={thGroup}>Unit price</th>}
                        {showAmounts && <th colSpan={4} className={thGroup}>Line total</th>}
                        <th rowSpan={2} className={cx(th, groupStart, 'align-bottom')}>Result</th>
                    </tr>
                    <tr className="border-b border-slate-200">
                        <th className={cx(th, 'border-l border-slate-200 text-right')}>Quote</th>
                        <th className={cx(th, 'text-right')}>PO</th>
                        <th className={cx(th, 'text-right')}>Final</th>
                        <th className={cx(th, 'text-right')}>Delivered</th>
                        {showAmounts && (
                            <>
                                <th className={cx(th, 'border-l border-slate-200 text-right')}>Quote</th>
                                <th className={cx(th, 'text-right')}>PO</th>
                                <th className={cx(th, 'text-right')}>Final</th>
                                <th className={cx(th, 'border-l border-slate-200 text-right')}>Quote</th>
                                <th className={cx(th, 'text-right')}>PO</th>
                                <th className={cx(th, 'text-right')}>Final</th>
                                <th className={cx(th, 'text-right')}>Delivered</th>
                            </>
                        )}
                    </tr>
                </thead>

                <tbody>
                    {grouped.map((g) => (
                        <ItemSection key={g.item} group={g} colCount={colCount} showAmounts={showAmounts} />
                    ))}
                </tbody>

                <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                        <td className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Total
                        </td>
                        <td className={cx(td, groupStart, 'text-right tabular-nums')}>{grand.quoted_qty}</td>
                        <td className={cx(td, 'text-right tabular-nums')}>{grand.po_qty}</td>
                        <td className={cx(td, 'text-right tabular-nums')}>{grand.final_qty}</td>
                        <td className={cx(td, 'text-right tabular-nums')}>{grand.delivered}</td>
                        <td className={cx(td, groupStart)} />
                        {showAmounts && (
                            <>
                                <td className={cx(td, groupStart)} colSpan={3} />
                                <td className={cx(td, groupStart, 'text-right tabular-nums')}>{currency(grand.quoted_total)}</td>
                                <td className={cx(td, 'text-right tabular-nums')}>{currency(grand.po_total)}</td>
                                <td className={cx(td, 'text-right tabular-nums')}>{currency(grand.final_total)}</td>
                                <td className={cx(td, 'text-right tabular-nums')}>{currency(grand.delivered_total)}</td>
                            </>
                        )}
                        <td className={cx(td, groupStart)} />
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

/** One item: a header strip with its totals, then each brand with its variants underneath. */
function ItemSection({ group, colCount, showAmounts }) {
    return (
        <>
            <tr className="border-y border-slate-200 bg-slate-100/70">
                <td colSpan={colCount} className="px-2 py-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                            {group.item}
                            <span className="ml-2 text-xs font-normal text-slate-500">
                                {group.count} {group.count === 1 ? 'variant' : 'variants'}
                            </span>
                        </p>
                        {showAmounts && (
                            <p className="text-xs text-slate-600">
                                Quote <b className="tabular-nums text-slate-900">{currency(group.totals.quoted)}</b>
                                <span className="mx-2 text-slate-300">|</span>
                                PO <b className="tabular-nums text-slate-900">{currency(group.totals.po)}</b>
                                <span className="mx-2 text-slate-300">|</span>
                                Delivered <b className="tabular-nums text-slate-900">{currency(group.totals.delivered)}</b>
                            </p>
                        )}
                    </div>
                </td>
            </tr>

            {group.brands.map((b) => (
                <BrandSection key={b.brand} brand={b} colCount={colCount} showAmounts={showAmounts} />
            ))}
        </>
    );
}

function BrandSection({ brand, colCount, showAmounts }) {
    return (
        <>
            <tr>
                <td colSpan={colCount} className="bg-white px-2 pb-0 pl-4 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Brand · {brand.brand}
                </td>
            </tr>

            {brand.variants.map((r) => (
                <VariantRow key={r.variant_id} r={r} showAmounts={showAmounts} />
            ))}
        </>
    );
}

function VariantRow({ r, showAmounts }) {
    const hasIssues = r.issues.length > 0;

    return (
        <tr className={cx('border-b border-slate-100 align-top', hasIssues ? 'bg-red-50/30' : 'bg-white')}>
            <td className={cx(td, 'sticky left-0 z-10 pl-6 font-medium text-slate-900', hasIssues ? 'bg-red-50' : 'bg-white')}>
                {r.variant_name}
            </td>

            {/* Quantity */}
            <td className={cx(td, groupStart, 'text-right')}><Qty value={r.quoted_qty} against={r.final_qty} /></td>
            <td className={cx(td, 'text-right')}><Qty value={r.po_qty} against={r.final_qty} /></td>
            <td className={cx(td, 'text-right')}><Qty value={r.final_qty} strong /></td>
            <td className={cx(td, 'text-right')}><Qty value={r.delivered} against={r.final_qty} strong /></td>

            {/* Delivered per DR */}
            <td className={cx(td, groupStart)}>
                {r.deliveries.length === 0 ? (
                    <span className="text-xs text-slate-400">None</span>
                ) : (
                    <ul className="space-y-0.5">
                        {r.deliveries.map((d, i) => (
                            <li key={`${d.delivery_id}-${i}`} className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                                {d.is_return && <Undo2 className="h-3 w-3 text-amber-600" />}
                                <span>{d.dr_number ? `DR ${d.dr_number}` : formatShort(d.delivered_at)}</span>
                                <span
                                    className={cx(
                                        'rounded px-1.5 py-0.5 font-semibold tabular-nums',
                                        d.quantity < 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
                                    )}
                                >
                                    {d.quantity > 0 ? `+${d.quantity}` : d.quantity}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </td>

            {showAmounts && (
                <>
                    {/* Unit price */}
                    <td className={cx(td, groupStart, 'text-right')}><Money value={r.quoted_price} against={r.po_price} /></td>
                    <td className={cx(td, 'text-right')}><Money value={r.po_price} against={r.quoted_price} /></td>
                    <td className={cx(td, 'text-right')}><Money value={r.final_price} strong /></td>

                    {/* Line total */}
                    <td className={cx(td, groupStart, 'text-right')}><Money value={r.quoted_total} against={r.po_total} /></td>
                    <td className={cx(td, 'text-right')}><Money value={r.po_total} against={r.quoted_total} /></td>
                    <td className={cx(td, 'text-right')}><Money value={r.final_total} strong /></td>
                    <td className={cx(td, 'text-right')}><Money value={r.delivered_total} /></td>
                </>
            )}

            {/* Result */}
            <td className={cx(td, groupStart)}>
                {!hasIssues ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Matches
                    </span>
                ) : (
                    <ul className="space-y-0.5 text-xs text-red-700">
                        {r.issues.map((i) => (
                            <li key={i} className="flex items-start gap-1">
                                <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>{i}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </td>
        </tr>
    );
}

/* -------------------------------- page --------------------------------- */

export default function CrossCheck({ transaction, po, rows, deliveries, checks, totals, breakdowns, showAmounts }) {
    const failed = checks.filter((c) => !c.ok).length;
    const allGood = failed === 0;

    const totalsDiffer =
        totals && totals.quotation !== null && totals.po !== null && Math.abs(totals.quotation - totals.po) >= 0.01;

    return (
        <AuthenticatedLayout
            header={<PageHeading title="Cross-check" subtitle="Quotation, client PO, deliveries and DR files side by side." />}
        >
            <Head title={`Cross-check · ${transaction.name}`} />

            <PageCard>
            <div className="space-y-5 p-5">
                <Link href={route('transactions.index')}>
                    <Button variant="outline">
                        <ArrowLeft className="h-4 w-4" /> Transactions
                    </Button>
                </Link>

                {/* ---------- 1. Summary header ---------- */}
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                <ClipboardCheck className="h-5 w-5 text-slate-600" />
                            </span>
                            <div className="min-w-0">
                                <h2 className="truncate text-lg font-semibold text-slate-900">{transaction.name}</h2>
                                <p className="text-sm text-slate-500">
                                    {transaction.client}
                                    {transaction.contact && ` · ${transaction.contact}`}
                                </p>
                            </div>
                        </div>
                        <span
                            className={cx(
                                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset',
                                allGood ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200',
                            )}
                        >
                            {allGood ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {allGood ? 'Everything matches' : `${failed} to review`}
                        </span>
                    </div>

                    <dl className="mt-3 grid gap-px overflow-hidden rounded-lg bg-slate-100 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div className="bg-white px-3 py-2">
                            <dt className="text-xs text-slate-500">Final quotation</dt>
                            <dd className="font-medium text-slate-900">{transaction.quotation_number ?? '—'}</dd>
                        </div>
                        <div className="bg-white px-3 py-2">
                            <dt className="text-xs text-slate-500">Client purchase order</dt>
                            <dd className="font-medium text-slate-900">
                                {po ? `${po.cpo_number} · ${po.client_po_number}` : '—'}
                            </dd>
                            {po?.client_po_date && <dd className="text-xs text-slate-500">dated {po.client_po_date}</dd>}
                        </div>
                        <div className="bg-white px-3 py-2">
                            <dt className="text-xs text-slate-500">Deliveries</dt>
                            <dd className="font-medium text-slate-900">{deliveries.filter((d) => !d.is_return).length}</dd>
                        </div>
                        <div className="bg-white px-3 py-2">
                            <dt className="text-xs text-slate-500">{showAmounts ? 'Deal amount' : 'Stage'}</dt>
                            <dd className="font-semibold tabular-nums text-slate-900">
                                {showAmounts && totals ? currency(totals.final) : transaction.stage ?? '—'}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* ---------- 2. Checklist + breakdown ---------- */}
                <div className="grid gap-5">
                    <Card title="Checklist" icon={ListChecks} subtitle={allGood ? 'All checks passed' : `${failed} check(s) need a look`}>
                        <ul className="divide-y divide-slate-100">
                            {checks.map((c) => (
                                <li key={c.label} className="flex items-center gap-2 px-4 py-1 text-xs">
                                    {c.ok ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                    ) : (
                                        <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                                    )}
                                    <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{c.label}</span>
                                    <span className={cx('shrink-0 truncate', c.ok ? 'text-slate-500' : 'text-red-600')}>{c.detail}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    {showAmounts && breakdowns && (
                        <Card
                            title="Breakdown"
                            subtitle="Subtotal → markup → VAT → total"
                            icon={Layers}
                            aside={
                                totals && (
                                    <span className="text-sm text-slate-600">
                                        Deal amount <b className="tabular-nums text-slate-900">{currency(totals.final)}</b>
                                    </span>
                                )
                            }
                        >
                            <div className="grid flex-1 gap-px bg-slate-100 md:grid-cols-3">
                                <BreakdownColumn
                                    title="Quotation"
                                    subtitle={transaction.quotation_number ?? 'No quotation'}
                                    data={breakdowns.quotation}
                                    highlightTotal={totalsDiffer}
                                />
                                <BreakdownColumn
                                    title="Client PO"
                                    subtitle={po ? `${po.cpo_number} · ${po.client_po_number}` : 'No confirmed PO'}
                                    data={breakdowns.po}
                                    highlightTotal={totalsDiffer}
                                />
                                <BreakdownColumn
                                    title="Delivered so far"
                                    subtitle="Net delivered units at final-order prices"
                                    data={breakdowns.delivered}
                                />
                            </div>
                        </Card>
                    )}
                </div>

                {/* ---------- 3. Line by line ---------- */}
                <Card
                    title="Line by line"
                    subtitle={
                        showAmounts
                            ? 'Per item, brand and variant: quantity, unit price and line total (before markup and VAT).'
                            : 'Per item, brand and variant.'
                    }
                    icon={Layers}
                    aside={
                        <span className="text-xs text-slate-500">
                            <span className="font-semibold text-red-600">Red</span> = differs from the other document
                        </span>
                    }
                >
                    <LineTable rows={rows} showAmounts={showAmounts} />
                </Card>

                {/* ---------- 4. Deliveries + DR files ---------- */}
                <Card title="Deliveries and DR files" icon={Truck} subtitle={`${deliveries.length} record(s), oldest first`}>
                    {deliveries.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-slate-500">No deliveries were recorded for this deal.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {deliveries.map((d) => (
                                <li key={d.id} className="bg-white px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                                {d.is_return ? (
                                                    <Undo2 className="h-4 w-4 text-amber-600" />
                                                ) : (
                                                    <Truck className="h-4 w-4 text-slate-500" />
                                                )}
                                                {d.is_return ? 'Return' : 'Delivery'} · {formatDate(d.delivered_at)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {Math.abs(d.units)} unit(s)
                                                {d.dr_number && ` · DR ${d.dr_number}`}
                                                {d.note && ` · ${d.note}`}
                                            </p>
                                        </div>

                                        {!d.is_return &&
                                            (d.has_file ? (
                                                <a
                                                    href={d.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                >
                                                    <FileText className="h-3.5 w-3.5" /> {d.dr_file_name || 'Open DR'}
                                                </a>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                                                    <XCircle className="h-3.5 w-3.5" /> No DR file uploaded
                                                </span>
                                            ))}
                                    </div>

                                    {!d.is_return && !d.dr_number && <p className="mt-1 text-xs text-red-600">No DR number entered.</p>}

                                    <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100 text-xs text-slate-600">
                                        {d.lines.map((l, i) => (
                                            <li key={i} className="flex items-center justify-between gap-3 px-3 py-1">
                                                <span className="min-w-0 truncate">
                                                    <span className="font-medium text-slate-800">{l.item_name}</span>
                                                    {l.brand_name && ` · ${l.brand_name}`}
                                                    {l.variant_name && l.variant_name !== '—' && ` · ${l.variant_name}`}
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

                                    {/* Inline preview for image / PDF DRs */}
                                    {d.has_file && /\.(pdf|png|jpe?g|webp)$/i.test(d.dr_file_name ?? '') && (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-xs font-medium text-[#667292]">Preview DR</summary>
                                            {/\.pdf$/i.test(d.dr_file_name) ? (
                                                <iframe
                                                    title={`DR ${d.dr_number ?? d.id}`}
                                                    src={d.file_url}
                                                    className="mt-2 h-[480px] w-full rounded-md border border-slate-200"
                                                />
                                            ) : (
                                                <img
                                                    src={d.file_url}
                                                    alt={`DR ${d.dr_number ?? d.id}`}
                                                    className="mt-2 max-h-[480px] rounded-md border border-slate-200"
                                                />
                                            )}
                                        </details>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
            </PageCard>
        </AuthenticatedLayout>
    );
}
