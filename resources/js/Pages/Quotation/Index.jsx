// resources/js/Pages/Quotation/Index.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import QuotationTable from '@/Components/Quotation/QuotationTable';
import Pagination from '@/Components/ui/Pagination';
import useServerFilters from '@/Hooks/useServerFilters';
import { FilterBar, SearchBox } from '@/Components/Index';
import { Head, usePage } from '@inertiajs/react';

/**
 * A quotation is a document of a transaction, so this list is the transactions that have been
 * issued a quotation number. Editing happens in the transaction.
 *
 * PERMISSION (the server checks all of these again):
 *   print_quotation  quotation.view + amounts.view  -> Print button
 *   edit_quotation   quotation.edit                 -> Edit button
 *   view_amounts     amounts.view                   -> Amount column
 */
export default function Index({ quotations: paginator, filters: initialFilters, hasAny }) {
    const can = usePage().props.auth?.can ?? {};
    const canPrint = Boolean(can.print_quotation);
    const canEdit = Boolean(can.edit_quotation);
    const canViewAmounts = Boolean(can.view_amounts);

    // Replace 'quotations.index' with the actual route name of this list.
    const [filters, setFilter] = useServerFilters(route('quotations.index'), initialFilters);

    const noData = !hasAny;

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
                    {!noData && (
                        <FilterBar>
                            <SearchBox
                                value={filters.search}
                                onChange={(v) => setFilter('search', v)}
                                placeholder="Search quotation, client or stage"
                            />
                        </FilterBar>
                    )}

                    <QuotationTable
                        rows={paginator.data}
                        canPrint={canPrint}
                        canEdit={canEdit}
                        canViewAmounts={canViewAmounts}
                        emptyTitle={noData ? 'No quotations yet' : 'No quotations found'}
                        emptyHint={
                            noData
                                ? 'They appear when a transaction reaches the quotation stage.'
                                : 'Try a different search.'
                        }
                    />

                    <Pagination paginator={paginator} onPerPageChange={(n) => setFilter('per_page', n)} />
                </div>
            </PageCard>
        </AuthenticatedLayout>
    );
}