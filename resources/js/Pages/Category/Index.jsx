// resources/js/Pages/Category/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import CategoryModal from '@/Components/Category/CategoryModal';
import CategoryTable from '@/Components/Category/CategoryTable';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import Pagination from '@/Components/ui/Pagination';
import useServerFilters from '@/Hooks/useServerFilters';
import { FilterBar, SearchBox } from '@/Components/Index';
import { Head, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function Index({ categories: paginator, filters: initialFilters, hasAny }) {
    // Shared by HandleInertiaRequests under auth.can (ItemCategoryPolicy):
    // create_category / edit_category / delete_category.
    const can = usePage().props.auth?.can ?? {};
    const canCreate = !!can.create_category;
    const canEdit   = !!can.edit_category;
    const canDelete = !!can.delete_category;

    const [modal, setModal] = useState({ open: false, category: null });
    const [deleting, setDeleting] = useState(null);

    // Search and page size run on the server. (Check this route name matches yours.)
    const [filters, setFilter] = useServerFilters(route('categories.index'), initialFilters);

    const rows = paginator.data;
    const noData = !hasAny;

    return (
        <AuthenticatedLayout header={<PageHeading title="Item Categories" subtitle="Group items to find them faster." />}>
            <Head title="Item Categories" />

            <PageCard
                toolbar={
                    canCreate ? (
                        <PageToolbar>
                            <Button variant="brand" onClick={() => setModal({ open: true, category: null })}>
                                <Plus />
                                New Category
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
                                placeholder="Search categories"
                            />
                        </FilterBar>
                    )}

                    <CategoryTable
                        rows={rows}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={(c) => setModal({ open: true, category: c })}
                        onDelete={setDeleting}
                        emptyTitle={noData ? 'No categories yet' : 'No categories found'}
                        emptyHint={
                            noData
                                ? (canCreate ? 'Create one, then assign it to your items.' : undefined)
                                : 'Try a different search.'
                        }
                    />

                    <Pagination paginator={paginator} onPerPageChange={(n) => setFilter('per_page', n)} />
                </div>
            </PageCard>

            {/* key remounts the form so it starts from the right category each time */}
            {(canCreate || canEdit) && (
                <CategoryModal
                    key={modal.category?.id ?? 'new'}
                    show={modal.open}
                    category={modal.category}
                    onClose={() => setModal({ open: false, category: null })}
                />
            )}

            {canDelete && (
                <ConfirmDelete
                    show={Boolean(deleting)}
                    onClose={() => setDeleting(null)}
                    deleteUrl={deleting ? route('categories.destroy', deleting.id) : null}
                    itemLabel={deleting ? `"${deleting.category_name}". Its ${deleting.items_count} item(s) will become Uncategorized` : 'this category'}
                    title="Delete category?"
                />
            )}
        </AuthenticatedLayout>
    );
}