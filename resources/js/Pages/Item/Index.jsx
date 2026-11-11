// resources/js/Pages/Item/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import Pagination from '@/Components/ui/Pagination';
import useServerFilters from '@/Hooks/useServerFilters';
import { FilterBar, FilterSelect, SearchBox, Tabs } from '@/Components/Index';
import { Button } from '@/Components/ui/Button';
import { Head, Link, usePage } from '@inertiajs/react';
import { PackagePlus, Plus, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import ItemTable from '@/Components/Item/ItemTable';
import { statusOf, stockOf } from '@/Components/Item/itemStock';

/**
 * PERMISSION (the server checks all of these again):
 *   create_item  item.create -> New item button
 *   edit_item    item.edit   -> Edit button
 *   delete_item  item.delete -> Delete button
 */
export default function Index({ items: paginator, categories = [], counts, filters: initialFilters }) {
    const can = usePage().props.auth?.can ?? {};
    const canCreate = Boolean(can.create_item);
    const canEdit = Boolean(can.edit_item);
    const canDelete = Boolean(can.delete_item);

    // Search, stock tab, category and page size all run on the server.
    const [filters, setFilter] = useServerFilters(route('items.index'), initialFilters);

    const [openIds, setOpenIds] = useState(() => new Set());
    const [deletingItem, setDeletingItem] = useState(null);

    // Per-row numbers for the CURRENT page only (used by the table badges).
    const rows = useMemo(
        () =>
            paginator.data.map((item) => {
                const variants = item.brands.flatMap((b) => b.variants);
                const total = variants.reduce((s, v) => s + stockOf(v), 0);
                const outCount = variants.filter((v) => statusOf(v) === 'out').length;
                const lowCount = variants.filter((v) => statusOf(v) === 'low').length;
                return { item, variants, total, outCount, needs: outCount + lowCount };
            }),
        [paginator.data],
    );

    // "Expand all" applies to the rows on this page.
    const allOpen = rows.length > 0 && rows.every((r) => openIds.has(r.item.id));
    const toggle = (id) =>
        setOpenIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const toggleAll = () => setOpenIds(allOpen ? new Set() : new Set(rows.map((r) => r.item.id)));

    const noData = (counts?.all ?? 0) === 0;
    const emptyTitle = noData
        ? 'No items yet'
        : filters.stock === 'restock'
          ? 'Nothing needs restocking'
          : filters.stock === 'out'
            ? 'Nothing is out of stock'
            : 'No items found';
    const emptyHint = noData ? (canCreate ? 'Create your first item.' : undefined) : 'Try a different filter or search.';

    return (
        <AuthenticatedLayout header={<PageHeading title="Items" subtitle="Your catalog, with live stock levels." />}>
            <Head title="Items" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        <Link href={route('stock-in.index')}>
                            <Button variant="outline">
                                <PackagePlus />
                                Stock in
                            </Button>
                        </Link>
                        <Link href={route('stock-adjust.index')}>
                            <Button variant="outline">
                                <SlidersHorizontal />
                                Adjust stock
                            </Button>
                        </Link>
                        {/* PERMISSION: the New item button only shows for users who can create */}
                        {canCreate && (
                            <Link href={route('items.create')}>
                                <Button variant="brand">
                                    <Plus />
                                    New item
                                </Button>
                            </Link>
                        )}
                    </PageToolbar>
                }
            >
                <div className="p-5">
                    {!noData && (
                        <FilterBar>
                            <Tabs
                                label="Stock"
                                value={filters.stock}
                                onChange={(v) => setFilter('stock', v)}
                                options={[
                                    ['all', 'All', counts?.all ?? 0],
                                    ['restock', 'Needs restocking', counts?.restock ?? 0],
                                    ['out', 'Out of stock', counts?.out ?? 0],
                                ]}
                            />
                            <SearchBox
                                value={filters.search}
                                onChange={(v) => setFilter('search', v)}
                                placeholder="Search item, brand or category"
                                label="Search items"
                            />
                            <FilterSelect
                                label="Filter by category"
                                value={filters.category}
                                onChange={(v) => setFilter('category', v)}
                            >
                                <option value="">All categories</option>
                                <option value="none">Uncategorized</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.category_name}</option>
                                ))}
                            </FilterSelect>
                            <button type="button" onClick={toggleAll} className="ml-auto text-xs font-medium text-slate-700 hover:underline">
                                {allOpen ? 'Collapse all' : 'Expand all'}
                            </button>
                        </FilterBar>
                    )}

                    <ItemTable
                        rows={rows}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        openIds={openIds}
                        onToggle={toggle}
                        onDelete={setDeletingItem}
                        emptyTitle={emptyTitle}
                        emptyHint={emptyHint}
                    />

                    <Pagination paginator={paginator} onPerPageChange={(n) => setFilter('per_page', n)} />
                </div>
            </PageCard>

            {canDelete && (
                <ConfirmDelete
                    show={Boolean(deletingItem)}
                    onClose={() => setDeletingItem(null)}
                    deleteUrl={deletingItem ? route('items.destroy', deletingItem.id) : null}
                    itemLabel={deletingItem ? `"${deletingItem.item_name}" and all of its brands and variants` : 'this item'}
                    title="Delete item?"
                />
            )}
        </AuthenticatedLayout>
    );
}