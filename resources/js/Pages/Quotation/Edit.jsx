import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import { History, Printer } from 'lucide-react';
import QuotationForm from '@/Components/Quotation/QuotationForm';
import { currency } from '@/Components/ui/kit';

const formatDate = (value) =>
    value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

function VersionHistory({ quotation, versions }) {
    return (
        <section className="mx-auto mt-5 w-full max-w-[1680px] px-4 pb-6 sm:px-6">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                    <History className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-900">Version history</h3>
                </header>

                <ul className="divide-y divide-slate-100">
                    {/* The live version */}
                    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                                {quotation.quotation_number}
                                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                    Current · {quotation.version_label}
                                </span>
                            </p>
                            <p className="text-xs text-slate-500">This is the version being edited.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold tabular-nums text-slate-900">{currency(quotation.amount)}</span>
                            <a
                                href={route('quotations.print', quotation.id)}
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
                                    href={route('quotations.versions.print', { quotation: quotation.id, version: v.id })}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-[#667292] hover:underline"
                                >
                                    <Printer className="h-3.5 w-3.5" /> Print
                                </a>
                            </div>
                        </li>
                    ))}
                </ul>

                {versions.length === 0 && (
                    <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                        No earlier versions yet. Saving a change creates the next version
                        {' '}({quotation.quotation_number}-{(quotation.version ?? 0) + 1}) and keeps this one here.
                    </p>
                )}
            </div>
        </section>
    );
}

export default function Edit({ quotation, clients, catalog, versions = [] }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="Edit Quotation" subtitle="Update this price offer." />}
        >
            <Head title="Edit Quotation" />
            <QuotationForm clients={clients} catalog={catalog} quotation={quotation} />
            <VersionHistory quotation={quotation} versions={versions} />
        </AuthenticatedLayout>
    );
}