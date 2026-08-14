import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import StatCard from '@/Components/StatCard';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            header={<PageHeading title="Dashboard" subtitle="Overview of your workflows and requests." />}
        >
            <Head title="Dashboard" />

            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Open Requests" value="24" change="+12%" trend="up" />
                    <StatCard label="Pending Approval" value="7" change="-3%" trend="down" />
                    <StatCard label="Completed This Month" value="132" change="+8%" trend="up" />
                    <StatCard label="Avg. Turnaround" value="1.4d" />
                </div>

                <PageCard title="Recent Activity">
                    <div className="p-6 text-sm text-slate-600">
                        <p>No recent activity to display.</p>
                    </div>
                </PageCard>
            </div>
        </AuthenticatedLayout>
    );
}
