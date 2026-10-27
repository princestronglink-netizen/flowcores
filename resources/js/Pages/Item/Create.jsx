import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head } from '@inertiajs/react';
import ItemForm from '@/Components/Item/ItemForm';

export default function Create({ categories, units = [] }) {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="New Item" subtitle="Create a new item with brands and variants." />}
        >
            <Head title="New Item" />
            <ItemForm categories={categories} units={units} />
        </AuthenticatedLayout>
    );
}