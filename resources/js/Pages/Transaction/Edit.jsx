import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import TransactionForm from '@/Components/Transaction/TransactionForm';

export default function Edit({ transaction, pipelines, clients }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="Edit Transaction" subtitle="Update transaction details." />}
        >
            <Head title="Edit Transaction" />
            <TransactionForm pipelines={pipelines} clients={clients} transaction={transaction} />
        </AuthenticatedLayout>
    );
}