import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import TransactionForm from '@/Components/Transaction/TransactionForm';

export default function Create({ clients, catalog }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="New Transaction" subtitle="Create a new transaction." />}
        >
            <Head title="New Transaction" />
            <TransactionForm clients={clients} catalog={catalog} />
        </AuthenticatedLayout>
    );
}