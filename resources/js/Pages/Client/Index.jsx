// resources/js/Pages/Client/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import ClientModal from '@/Components/Client/ClientModal';
import ClientTable from '@/Components/Client/ClientTable';
import Pagination from '@/Components/ui/Pagination';
import useServerFilters from '@/Hooks/useServerFilters';
import { FilterBar, SearchBox } from '@/Components/Index';
import { Head, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function Index({ clients: paginator, filters: initialFilters, hasAny }) {
    // Shared by HandleInertiaRequests (auth.can) from ClientPolicy.
    const can = usePage().props.auth?.can ?? {};
    const canCreate = !!can.create_client;
    const canEdit   = !!can.edit_client;
    const canDelete = !!can.delete_client;

    const [modal, setModal]       = useState({ open: false, client: null });
    const [deleting, setDeleting] = useState(null);

    // Search and page size run on the server so they cover every page.
    const [filters, setFilter] = useServerFilters(route('clients.index'), initialFilters);

    const rows = paginator.data;
    const noData = !hasAny;

    return (
        <AuthenticatedLayout header={<PageHeading title="Clients" subtitle="Manage the companies you sell to and their contact people." />}>
            <Head title="Clients" />

            <PageCard
                toolbar={
                    canCreate ? (
                        <PageToolbar>
                            <Button variant="brand" onClick={() => setModal({ open: true, client: null })}>
                                <Plus />
                                New Client
                            </Button>
                        </PageToolbar>
                    ) : undefined
                }
            >
                <div className="p-5">
                    {!noData && (
                        <FilterBar>
                            <SearchBox
                                value={filters.search}
                                onChange={(v) => setFilter('search', v)}
                                placeholder="Search clients or contacts"
                            />
                        </FilterBar>
                    )}

                    <ClientTable
                        rows={rows}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={(c) => setModal({ open: true, client: c })}
                        onDelete={setDeleting}
                        emptyTitle={noData ? 'No clients yet' : 'No clients found'}
                        emptyHint={noData ? (canCreate ? 'Add your first client.' : undefined) : 'Try a different search.'}
                    />

                    <Pagination paginator={paginator} onPerPageChange={(n) => setFilter('per_page', n)} />
                </div>
            </PageCard>

            {/* Your ClientModal loads the client itself when `show` + `client` change */}
            {(canCreate || canEdit) && (
                <ClientModal
                    show={modal.open}
                    client={modal.client}
                    onClose={() => setModal({ open: false, client: null })}
                />
            )}

            {canDelete && (
                <ConfirmDelete
                    show={Boolean(deleting)}
                    onClose={() => setDeleting(null)}
                    deleteUrl={deleting ? route('clients.destroy', deleting.id) : null}
                    itemLabel={deleting ? `"${deleting.client_name}" and its contact people` : 'this client'}
                    title="Delete client?"
                />
            )}
        </AuthenticatedLayout>
    );
}