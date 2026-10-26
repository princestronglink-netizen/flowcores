import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import QuotationForm from '@/Components/Quotation/QuotationForm';

export default function Create({ clients, catalog }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="New Quotation" subtitle="Prepare a price offer for a client." />}
        >
            <Head title="New Quotation" />
            <QuotationForm clients={clients} catalog={catalog} />
        </AuthenticatedLayout>
    );
}