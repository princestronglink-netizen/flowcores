import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import { Head, Link } from '@inertiajs/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { Pencil, Printer } from 'lucide-react';
import { currency } from '@/Components/ui/kit';

/**
 * A quotation is a document of a transaction, so this list is the transactions that have been
 * issued a quotation number. Editing happens in the transaction.
 */
export default function Index({ quotations }) {
    return (
        <AuthenticatedLayout
            header={
                <PageHeading
                    title="Quotations"
                    subtitle="Issued when a transaction reaches the quotation stage. Print them here, edit them in the transaction."
                />
            }
        >
            <Head title="Quotations" />
            <PageCard>
                <div className="p-5">
                    {quotations.length === 0 ? (
                        <p className="py-14 text-center text-sm text-slate-500">
                            No quotations yet. They appear when a transaction reaches the quotation stage.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Quotation</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Prepared by</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotations.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>
                                            <p className="font-medium text-slate-900">{t.quotation_number}</p>
                                            <p className="text-xs text-slate-500">{t.name}</p>
                                            <span
                                                className={
                                                    'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ' +
                                                    (t.version > 0
                                                        ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                                        : 'bg-slate-100 text-slate-600 ring-slate-200')
                                                }
                                            >
                                                {t.version_label}
                                            </span>
                                            {t.quotation_frozen && (
                                                <span className="ml-1 mt-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                                                    Sent
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p>{t.client?.client_name}</p>
                                            <p className="text-xs text-slate-500">{t.contact_person?.contact_person}</p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{t.prepared_by ?? '—'}</p>
                                            <p className="text-xs text-slate-500">{t.prepared_by_position ?? ''}</p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{t.stage?.stage_name ?? '—'}</p>
                                            <p className="text-xs capitalize text-slate-500">{t.status}</p>
                                        </TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">{currency(t.amount)}</TableCell>
                                        <TableCell className="flex flex-wrap justify-end gap-2">
                                            <a href={route('transactions.quotation.print', t.id)} target="_blank" rel="noreferrer">
                                                <Button variant="outline" size="icon" aria-label="Print"><Printer className="h-4 w-4" /></Button>
                                            </a>
                                            <Link href={route('transactions.edit', t.id)}>
                                                <Button variant="outline" size="icon" aria-label="Edit transaction"><Pencil className="h-4 w-4" /></Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </PageCard>
        </AuthenticatedLayout>
    );
}