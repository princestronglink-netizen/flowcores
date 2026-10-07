import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import { Head, Link } from '@inertiajs/react';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/Components/ui/table";
import { Button } from '@/Components/ui/Button';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from 'react';

export default function Index({ transactions }) {
    const [deletingTransaction, setDeletingTransaction] = useState(null);

    return (
        <AuthenticatedLayout
            header={<PageHeading title="Transactions" subtitle="Overview of your Transactions." />}
        >
            <Head title="Transactions" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        <Link href={route('transactions.create')}>
                            <Button variant="brand">
                                <Plus />
                                New Transaction
                            </Button>
                        </Link>
                    </PageToolbar>
                }
            >
                <div className="p-5">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transaction Name</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Pipeline</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell>{transaction.name || '—'}</TableCell>
                                    <TableCell>{transaction.client?.client_name ?? '—'}</TableCell>
                                    <TableCell>{transaction.contact_person?.contact_person ?? '—'}</TableCell>
                                    <TableCell>{transaction.pipeline?.pipeline_name ?? '—'}</TableCell>
                                    <TableCell>{transaction.priority ?? '—'}</TableCell>
                                    <TableCell>
                                        {transaction.amount != null
                                            ? Number(transaction.amount).toLocaleString(undefined, {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                              })
                                            : '—'}
                                    </TableCell>
                                    <TableCell className="flex justify-end gap-2 text-right">
                                        <Link href={route('transactions.edit', transaction.id)}>
                                            <Button variant="outline" size="icon">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button variant="outline" size="icon" onClick={() => setDeletingTransaction(transaction)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </PageCard>

            <ConfirmDelete
                show={Boolean(deletingTransaction)}
                onClose={() => setDeletingTransaction(null)}
                deleteUrl={deletingTransaction ? route('transactions.destroy', deletingTransaction.id) : null}
                itemLabel={deletingTransaction ? `"${deletingTransaction.name || 'this transaction'}"` : 'this transaction'}
                title="Delete transaction?"
            />
        </AuthenticatedLayout>
    );
}