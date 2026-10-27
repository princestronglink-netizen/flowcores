import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import ClientPurchaseOrderForm from '@/Components/ClientPurchaseOrder/ClientPurchaseOrderForm';

export default function Edit({ clientPurchaseOrder, catalog, from = null }) {
    return (
        <AuthenticatedLayout
            header={
                <PageHeading
                    title="Client Purchase Order"
                    subtitle="Match this to the order your client actually sent."
                />
            }
        >
            <Head title="Client Purchase Order" />
            <ClientPurchaseOrderForm catalog={catalog} clientPurchaseOrder={clientPurchaseOrder} from={from} />
        </AuthenticatedLayout>
    );
}