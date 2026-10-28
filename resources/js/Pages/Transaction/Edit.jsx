import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head, router, usePage } from '@inertiajs/react';
import { History, Printer, RotateCcw } from 'lucide-react';
import TransactionForm from '@/Components/Transaction/TransactionForm';
import { currency } from '@/Components/ui/kit';

const formatDate = (value) =>
    value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

const baseNumber = (n) => String(n ?? '').match(/^(QT-\d{4}-\d+)(?:-\d+)?$/)?.[1] ?? n;

/** Quotation versions of this transaction. Only shown once the quotation has been issued. */
function VersionHistory({ transaction, versions, canRestore }) {
    const { errors } = usePage().props;
    const nextNumber = `${baseNumber(transaction.quotation_number)}-${(transaction.version ?? 0) + 1}`;

    const restore = (v) => {
        const ok = window.confirm(
            `Go back to ${v.quotation_number}?\n\n` +
                `Its content is copied into a new version (${nextNumber}). The current version and all history are kept.\n` +
                `Unsaved changes in the form above will be lost.`,
        );
        if (!ok) return;
        router.post(
            route('transactions.versions.restore', { transaction: transaction.id, version: v.id }),
            {},
            { preserveScroll: true },
        );
    };

    return (
        <section className="mx-auto mt-5 w-full max-w-[1680px] px-4 pb-6 sm:px-6">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                    <History className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-900">Quotation versions</h3>
                </header>

                {errors?.restore && (
                    <p role="alert" className="border-b border-red-200 bg-red-50 px-5 py-2.5 text-sm text-red-800">
                        {errors.restore}
                    </p>
                )}

                <ul className="divide-y divide-slate-100">
                    {/* The live version */}
                    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                                {transaction.quotation_number}
                                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                    Current · {transaction.version_label}
                                </span>
                                {transaction.quotation_frozen && (
                                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                                        Sent
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-slate-500">
                                {transaction.quotation_frozen
                                    ? 'The card is past the quotation stage, so this copy no longer changes.'
                                    : 'This is the version being edited.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold tabular-nums text-slate-900">{currency(transaction.amount)}</span>
                            <a
                                href={route('transactions.quotation.print', transaction.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#667292] hover:underline"
                            >
                                <Printer className="h-3.5 w-3.5" /> Print
                            </a>
                        </div>
                    </li>

                    {/* Older versions, newest first */}
                    {versions.map((v) => (
                        <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900">
                                    {v.quotation_number}
                                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                                        {v.version_label}
                                    </span>
                                </p>
                                <p className="text-xs text-slate-500">
                                    {v.item_count} {v.item_count === 1 ? 'item' : 'items'} · replaced {formatDate(v.replaced_at)}
                                    {v.edited_by && ` by ${v.edited_by}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-semibold tabular-nums text-slate-700">{currency(v.amount)}</span>
                                <a
                                    href={route('transactions.versions.print', { transaction: transaction.id, version: v.id })}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-[#667292] hover:underline"
                                >
                                    <Printer className="h-3.5 w-3.5" /> Print
                                </a>
                                {canRestore && (
                                    <button
                                        type="button"
                                        onClick={() => restore(v)}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>

                {versions.length === 0 && (
                    <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                        No earlier versions yet.{' '}
                        {transaction.quotation_frozen
                            ? 'The quotation was sent as it is.'
                            : `Saving a change creates the next version (${nextNumber}) and keeps this one here.`}
                    </p>
                )}
            </div>
        </section>
    );
}

export default function Edit({ transaction, clients, catalog, itemsLocked = false, versions = [] }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="Edit Transaction" subtitle="Update transaction details." />}
        >
            <Head title="Edit Transaction" />
            <TransactionForm
                clients={clients}
                catalog={catalog}
                transaction={transaction}
                itemsLocked={itemsLocked}
            />
            {transaction.quotation_number && (
                <VersionHistory
                    transaction={transaction}
                    versions={versions}
                    canRestore={!transaction.quotation_frozen && !itemsLocked}
                />
            )}
        </AuthenticatedLayout>
    );
}
