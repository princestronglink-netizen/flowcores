import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import TransactionForm from '@/Components/Transaction/TransactionForm';

export default function Create({ pipelines, clients }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="New Transaction" subtitle="Create a new transaction." />}
        >
            <Head title="New Transaction" />
            <TransactionForm pipelines={pipelines} clients={clients} />
        </AuthenticatedLayout>
    );
}