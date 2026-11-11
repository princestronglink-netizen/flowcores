// resources/js/Pages/ClientPurchaseOrder/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import ConfirmClientPoModal from '@/Components/ClientPurchaseOrder/ConfirmClientPoModal';
import ClientPurchaseOrderTable from '@/Components/ClientPurchaseOrder/ClientPurchaseOrderTable';
import StockToast from '@/Components/Pipeline/StockToast';
import Pagination from '@/Components/ui/Pagination';
import useServerFilters from '@/Hooks/useServerFilters';
import { FilterBar, SearchBox, Tabs } from '@/Components/Index';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/**
 * There is no edit screen: a draft follows the quotation, a confirmed PO is frozen.
 *
 * PERMISSION (the server checks all of these again):
 *   confirm_client_po  client_po.confirm -> Confirm button
 *   edit_client_po     client_po.edit    -> Cancel button
 *   delete_client_po   client_po.delete  -> Delete button
 *   view_amounts       amounts.view      -> Total column
 */
export default function Index({ clientPurchaseOrders: paginator, statuses, counts, filters: initialFilters }) {
    const { flash, errors, auth } = usePage().props;
    const can = auth?.can ?? {};
    const canConfirm = Boolean(can.confirm_client_po);
    const canEdit = Boolean(can.edit_client_po);
    const canDelete = Boolean(can.delete_client_po);
    const canViewAmounts = Boolean(can.view_amounts);

    const rows = paginator.data;

    // Search, status tab and page size live on the server (so they cover every page).
    const [filters, setFilter] = useServerFilters(route('client-purchase-orders.index'), initialFilters);

    const [deleting, setDeleting] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const [toast, setToast] = useState(null);
    const [warning, setWarning] = useState(null);

    useEffect(() => {
        if (flash?.stock) setToast(flash.stock);
    }, [flash?.stock]);

    useEffect(() => {
        if (flash?.stock_warning) setWarning(flash.stock_warning);
    }, [flash?.stock_warning]);

    // Cancel errors arrive as validation errors. (Confirm errors show inside the confirm modal.)
    useEffect(() => {
        if (confirming) return;
        const first = Object.values(errors ?? {})[0];
        if (first) setWarning(first);
    }, [errors]);

    const cancel = (p) => router.patch(route('client-purchase-orders.cancel', p.id), {}, { preserveScroll: true });

    // Does this row have at least one button for this user? (decides if the Actions column shows)
    const hasActions = (p) =>
        (canConfirm && p.status === 'draft') ||
        (canEdit && p.status === 'draft') ||
        (canDelete && ['draft', 'cancelled'].includes(p.status));
    const showActions = rows.some(hasActions);

    // "No data at all" comes from the unfiltered total, not from the current page.
    const noData = (counts?.all ?? 0) === 0;

    return (
        <AuthenticatedLayout
            header={
                <PageHeading
                    title="Client Purchase Orders"
                    subtitle="The order your client sends after accepting a quotation. Confirm it with the client's PO number and date."
                />
            }
        >
            <Head title="Client Purchase Orders" />

            <PageCard>
                <div className="p-5">
                    {!noData && (
                        <FilterBar>
                            <Tabs
                                label="Status"
                                value={filters.status}
                                onChange={(v) => setFilter('status', v)}
                                options={[
                                    ['all', 'All', counts?.all ?? 0],
                                    ...Object.entries(statuses).map(([v, l]) => [v, l, counts?.[v] ?? 0]),
                                ]}
                            />
                            <SearchBox
                                value={filters.search}
                                onChange={(v) => setFilter('search', v)}
                                placeholder="Search PO, client or transaction"
                            />
                        </FilterBar>
                    )}

                    <ClientPurchaseOrderTable
                        rows={rows}
                        statuses={statuses}
                        canConfirm={canConfirm}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canViewAmounts={canViewAmounts}
                        showActions={showActions}
                        onConfirm={setConfirming}
                        onCancel={cancel}
                        onDelete={setDeleting}
                        emptyTitle={noData ? 'No client purchase orders yet' : 'No client purchase orders found'}
                        emptyHint={
                            noData
                                ? 'They appear when a transaction reaches the client purchase order stage.'
                                : 'Try a different tab or search.'
                        }
                    />

                    <Pagination paginator={paginator} onPerPageChange={(n) => setFilter('per_page', n)} />
                </div>
            </PageCard>

            {canDelete && (
                <ConfirmDelete
                    show={Boolean(deleting)}
                    onClose={() => setDeleting(null)}
                    deleteUrl={deleting ? route('client-purchase-orders.destroy', deleting.id) : null}
                    itemLabel={deleting ? deleting.cpo_number : 'this client purchase order'}
                    title="Delete client purchase order?"
                />
            )}

            {canConfirm && <ConfirmClientPoModal cpo={confirming} onClose={() => setConfirming(null)} />}

            <StockToast message={toast} title="Done" onClose={() => setToast(null)} />
            <StockToast message={warning} title="Can't do that" tone="warning" onClose={() => setWarning(null)} />
        </AuthenticatedLayout>
    );
}