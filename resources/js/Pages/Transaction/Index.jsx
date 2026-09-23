import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import { Head } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import TransactionModal from '@/Components/Transaction/TransactionModal';
import { Plus } from "lucide-react";

export default function Index({ transactions }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <AuthenticatedLayout
            header={<PageHeading title="Transactions" subtitle="Overview of your Transactions." />}
        >
            <Head title="Transactions" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        <Button variant="brand" onClick={() => setIsOpen(true)}>
                            <Plus />
                            New Transaction
                        </Button>
                    </PageToolbar>
                }
            >
            </PageCard>

            <TransactionModal show={isOpen} onClose={() => setIsOpen(false)} />
        </AuthenticatedLayout>
    );
}