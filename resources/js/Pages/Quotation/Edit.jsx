import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import TransactionForm from '@/Components/Transaction/TransactionForm';

export default function Edit({ transaction, clients, catalog, itemsLocked = false, quotationAvailable = false }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="Edit Transaction" subtitle="Update transaction details." />}
        >
            <Head title="Edit Transaction" />
            <TransactionForm
                clients={clients}
                catalog={catalog}
                transaction={transaction}
                itemsLocked={itemsLocked}
                quotationAvailable={quotationAvailable}
            />
        </AuthenticatedLayout>
    );
}