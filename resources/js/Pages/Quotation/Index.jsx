import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import StockToast from '@/Components/Pipeline/StockToast';
import { Head, Link, usePage } from '@inertiajs/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { Pencil, Printer, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Banner, currency } from '@/Components/ui/kit';

export default function Index({ quotations }) {
    const { errors, flash } = usePage().props;
    const [deleting, setDeleting] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (flash?.stock) setToast(flash.stock);
    }, [flash?.stock]);

    const firstError = Object.values(errors ?? {})[0];

    return (
        <AuthenticatedLayout
            header={
                <PageHeading
                    title="Quotations"
                    subtitle="Generated automatically from the pipeline. Edit or print them here."
                />
            }
        >
            <Head title="Quotations" />
            <PageCard>
                <div className="p-5">
                    {firstError && <div className="mb-4"><Banner tone="error">{firstError}</Banner></div>}

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
                                    <TableHead>Valid until</TableHead>
                                    <TableHead>Transaction</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotations.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell>
                                            <p className="font-medium text-slate-900">{q.quotation_number}</p>
                                            <p className="text-xs text-slate-500">{q.subject}</p>
                                            <span
                                                className={
                                                    'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ' +
                                                    (q.version > 0
                                                        ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                                        : 'bg-slate-100 text-slate-600 ring-slate-200')
                                                }
                                            >
                                                {q.version_label}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <p>{q.client?.client_name}</p>
                                            <p className="text-xs text-slate-500">{q.contact_person?.contact_person}</p>
                                        </TableCell>
                                        <TableCell className={q.is_expired ? 'font-medium text-red-600' : ''}>
                                            {q.valid_until ?? '—'}{q.is_expired && ' (expired)'}
                                        </TableCell>
                                        <TableCell>{q.transaction?.name ?? '—'}</TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">{currency(q.amount)}</TableCell>
                                        <TableCell className="flex flex-wrap justify-end gap-2">
                                            <a href={route('quotations.print', q.id)} target="_blank" rel="noreferrer">
                                                <Button variant="outline" size="icon" aria-label="Print"><Printer className="h-4 w-4" /></Button>
                                            </a>
                                            <Link href={route('quotations.edit', q.id)}>
                                                <Button variant="outline" size="icon" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                                            </Link>
                                            <Button variant="outline" size="icon" aria-label="Delete" onClick={() => setDeleting(q)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </PageCard>

            <ConfirmDelete
                show={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                deleteUrl={deleting ? route('quotations.destroy', deleting.id) : null}
                itemLabel={deleting ? deleting.quotation_number : 'this quotation'}
                title="Delete quotation?"
            />

            <StockToast message={toast} title="Done" onClose={() => setToast(null)} />
        </AuthenticatedLayout>
    );
}