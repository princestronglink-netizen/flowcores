import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import QuotationForm from '@/Components/Quotation/QuotationForm';

export default function Edit({ quotation, clients, catalog }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="Edit Quotation" subtitle="Update this price offer." />}
        >
            <Head title="Edit Quotation" />
            <QuotationForm clients={clients} catalog={catalog} quotation={quotation} />
        </AuthenticatedLayout>
    );
}