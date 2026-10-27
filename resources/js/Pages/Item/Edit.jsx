import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import ItemForm from '@/Components/Item/ItemForm';

export default function Edit({ item, categories }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="Edit Item" subtitle="Update item, brands and variants." />}
        >
            <Head title="Edit Item" />
            <ItemForm item={item} categories={categories} />
        </AuthenticatedLayout>
    );
}