import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import StockToast from '@/Components/Pipeline/StockToast';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { Ban, Check, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { currency, cx } from '@/Components/ui/kit';

const STYLE = {
    draft: 'bg-slate-100 text-slate-700 ring-slate-200',
    confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-red-50 text-red-700 ring-red-200',
};

export default function Index({ clientPurchaseOrders, statuses }) {
    const { flash, errors } = usePage().props;
    const [tab, setTab] = useState('all');
    const [deleting, setDeleting] = useState(null);
    const [toast, setToast] = useState(null);
    const [warning, setWarning] = useState(null);

    useEffect(() => {
        if (flash?.stock) setToast(flash.stock);
    }, [flash?.stock]);

    useEffect(() => {
        if (flash?.stock_warning) setWarning(flash.stock_warning);
    }, [flash?.stock_warning]);

    // Confirm / cancel errors arrive as validation errors.
    useEffect(() => {
        const first = Object.values(errors ?? {})[0];
        if (first) setWarning(first);
    }, [errors]);

    const counts = useMemo(() => {
        const c = { all: clientPurchaseOrders.length };
        clientPurchaseOrders.forEach((p) => (c[p.status] = (c[p.status] ?? 0) + 1));
        return c;
    }, [clientPurchaseOrders]);

    const rows = clientPurchaseOrders.filter((p) => tab === 'all' || p.status === tab);

    const confirm = (p) => router.post(route('client-purchase-orders.confirm', p.id), {}, { preserveScroll: true });
    const cancel = (p) => router.patch(route('client-purchase-orders.cancel', p.id), {}, { preserveScroll: true });

    return (
        <AuthenticatedLayout
            header={
                <PageHeading
                    title="Client Purchase Orders"
                    subtitle="The order your client sends after accepting a quotation. Confirm it to set the final items."
                />
            }
        >
            <Head title="Client Purchase Orders" />
            <PageCard>
                <div className="p-5">
                    <div className="mb-4 inline-flex flex-wrap rounded-lg bg-slate-100 p-1" role="tablist">
                        {[['all', 'All'], ...Object.entries(statuses)].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={tab === value}
                                onClick={() => setTab(value)}
                                className={cx(
                                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
                                    tab === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                                )}
                            >
                                {label}
                                <span className="text-xs tabular-nums text-slate-400">{counts[value] ?? 0}</span>
                            </button>
                        ))}
                    </div>

                    {rows.length === 0 ? (
                        <p className="py-14 text-center text-sm text-slate-500">
                            No client purchase orders yet. They appear when a transaction reaches the client purchase order stage.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client PO</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Units</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <p className="font-medium text-slate-900">{p.cpo_number}</p>
                                            <p className="text-xs text-slate-500">
                                                {p.client_po_number ? (
                                                    <>Client ref {p.client_po_number}{p.client_po_date ? ` · ${p.client_po_date}` : ''}</>
                                                ) : (
                                                    <span className="text-amber-600">Add the client's PO number</span>
                                                )}
                                            </p>
                                            {p.transaction && <p className="text-xs text-slate-500">For {p.transaction.name}</p>}
                                        </TableCell>
                                        <TableCell>
                                            <p>{p.client?.client_name}</p>
                                            <p className="text-xs text-slate-500">{p.contact_person?.contact_person}</p>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cx('inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', STYLE[p.status])}>
                                                {statuses[p.status]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {p.items.reduce((s, i) => s + i.quantity, 0)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">{currency(p.amount)}</TableCell>
                                        <TableCell className="flex flex-wrap justify-end gap-2">
                                            {p.status === 'draft' && (
                                                <Button variant="brand" onClick={() => confirm(p)}>
                                                    <Check className="size-3.5" /> Confirm
                                                </Button>
                                            )}
                                            {p.status !== 'cancelled' && (
                                                <Link href={route('client-purchase-orders.edit', p.id)}>
                                                    <Button variant="outline" size="icon" aria-label="Edit">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {p.status === 'draft' && (
                                                <Button variant="outline" size="icon" aria-label="Cancel" onClick={() => cancel(p)}>
                                                    <Ban className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {['draft', 'cancelled'].includes(p.status) && (
                                                <Button variant="outline" size="icon" aria-label="Delete" onClick={() => setDeleting(p)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
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
                deleteUrl={deleting ? route('client-purchase-orders.destroy', deleting.id) : null}
                itemLabel={deleting ? deleting.cpo_number : 'this client purchase order'}
                title="Delete client purchase order?"
            />

            <StockToast message={toast} title="Done" onClose={() => setToast(null)} />
            <StockToast message={warning} title="Can't do that" tone="warning" onClose={() => setWarning(null)} />
        </AuthenticatedLayout>
    );
}