import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import StatCard from '@/Components/StatCard';
import { Head } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';

export default function Request() {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="Requests" subtitle="Overview of your requests." />}
        >
            <Head title="Requests" />
            <PageHeading>Requests</PageHeading>
            <PageCard>
                <div className="flex items-center justify-end">
                    <Button variant="brand" className="">
                        New Request
                    </Button>

                </div>
            </PageCard>
        </AuthenticatedLayout>
    )
}