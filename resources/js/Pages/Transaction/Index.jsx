// resources/js/Pages/Transaction/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import TransactionTable from '@/Components/Transaction/TransactionTable';
import StageHistoryModal from '@/Components/Transaction/StageHistoryModal';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import Pagination from '@/Components/ui/Pagination';
import useServerFilters from '@/Hooks/useServerFilters';
import { FilterBar, FilterSelect, SearchBox, Tabs } from '@/Components/Index';
import DeliveryHistoryModal from '@/Components/Transaction/DeliveryHistoryModal';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import { Plus } from 'lucide-react';
import { useState } from 'react';

/**
 * PERMISSION (the server checks all of these again):
 *   create_transaction  transaction.create -> New transaction button
 *   edit_transaction    transaction.edit   -> Edit button
 *   delete_transaction  transaction.delete -> Delete button
 *   view_amounts        amounts.view       -> Amount column
 *   (cross-check)       transaction.view   -> shown on every won deal
 *
 * Stage history (who moved the card to which stage, and when) is read-only,
 * so everyone who can see the list can open it.
 */
export default function Index({ transactions: paginator, stages = [], counts, filters: initialFilters }) {
    const can = usePage().props.auth?.can ?? {};
    const canCreate = Boolean(can.create_transaction);
    const canEdit = Boolean(can.edit_transaction);
    const canDelete = Boolean(can.delete_transaction);
    const canViewAmounts = Boolean(can.view_amounts);

    const [deleting, setDeleting] = useState(null);

    // The row whose stage history is open. Only the id is stored so the modal always reads fresh data.
    const [historyId, setHistoryId] = useState(null);
    const [deliveryId, setDeliveryId] = useState(null);

    // Status tab, search, stage, priority and page size all run on the server.
    // This page defaults to the "open" tab, so 'open' is the value left out of the URL.
    const [filters, setFilter] = useServerFilters(route('transactions.index'), initialFilters, { status: 'open' });

    const rows = paginator.data;
    const historyRow  = historyId  ? rows.find((r) => r.id === historyId)  ?? null : null;
    const deliveryRow = deliveryId ? rows.find((r) => r.id === deliveryId) ?? null : null;

    // "Clear filters" resets search, stage and priority (the status tab stays as chosen).
    const hasFilters = filters.search || filters.priority || filters.stage;

    const clearFilters = () => {
        setFilter('search', '');
        setFilter('priority', '');
        setFilter('stage', '');
    };

    return (
        <AuthenticatedLayout header={<PageHeading title="Transactions" subtitle="Every deal, its client and its value." />}>
            <Head title="Transactions" />

            <PageCard
                toolbar={
                    // PERMISSION: the New transaction button only shows for users who can create
                    canCreate ? (
                        <PageToolbar>
                            <Link href={route('transactions.create')}>
                                <Button variant="brand">
                                    <Plus />
                                    New transaction
                                </Button>
                            </Link>
                        </PageToolbar>
                    ) : undefined
                }
            >
                <div className="p-5">
                    <FilterBar>
                        <Tabs
                            label="Status"
                            value={filters.status}
                            onChange={(v) => setFilter('status', v)}
                            options={[
                                ['open', 'Open', counts?.open ?? 0],
                                ['won', 'Won', counts?.won ?? 0],
                                ['lost', 'Lost', counts?.lost ?? 0],
                                ['all', 'All', counts?.all ?? 0],
                            ]}
                        />
                        <SearchBox
                            value={filters.search}
                            onChange={(v) => setFilter('search', v)}
                            placeholder="Search name, client, stage or item"
                            label="Search transactions"
                        />
                        <FilterSelect label="Filter by stage" value={filters.stage} onChange={(v) => setFilter('stage', v)}>
                            <option value="">All stages</option>
                            {stages.map((s) => (
                                <option key={s.id} value={s.id}>{s.stage_name}</option>
                            ))}
                        </FilterSelect>
                        <FilterSelect label="Filter by priority" value={filters.priority} onChange={(v) => setFilter('priority', v)}>
                            <option value="">All priorities</option>
                            {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </FilterSelect>
                        {hasFilters && (
                            <Button variant="ghost" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        )}
                    </FilterBar>

                    <TransactionTable
                        rows={rows}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canViewAmounts={canViewAmounts}
                        onDelete={setDeleting}
                        onHistory={(row) => setHistoryId(row.id)}
                        onDeliveries={(row) => setDeliveryId(row.id)}
                        emptyTitle="No transactions found"
                        emptyHint={canCreate ? 'Change the filters, or create a new transaction.' : 'Change the filters to see more.'}
                    />

                    <Pagination paginator={paginator} onPerPageChange={(n) => setFilter('per_page', n)} />
                </div>
            </PageCard>

            <StageHistoryModal transaction={historyRow} stages={stages} onClose={() => setHistoryId(null)} />
            <DeliveryHistoryModal transaction={deliveryRow} onClose={() => setDeliveryId(null)} />

            {canDelete && (
                <ConfirmDelete
                    show={Boolean(deleting)}
                    onClose={() => setDeleting(null)}
                    deleteUrl={deleting ? route('transactions.destroy', deleting.id) : null}
                    itemLabel={deleting ? `"${deleting.name || 'this transaction'}"` : 'this transaction'}
                    title="Delete transaction?"
                />
            )}
        </AuthenticatedLayout>
    );
}