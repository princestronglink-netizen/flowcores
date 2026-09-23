import AuthenticatedLayout from '@Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/Components/ui/table";
import { Button } from "@/Components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import ClientModal from '@/Components/Client/ClientModal';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import { useState } from 'react';

export default function Index({ clients }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [deletingClient, setDeletingClient] = useState(null);

    const openCreate = () => {
        setEditingClient(null);
        setIsOpen(true);
    };

    const openEdit = (client) => {
        setEditingClient(client);
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
        setEditingClient(null);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Clients" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        <Button variant="brand" onClick={openCreate}>
                            <Plus />
                            New Client
                        </Button>
                    </PageToolbar>
                }
            >
                <div className="p-5">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client Code</TableHead>
                                <TableHead>Client Name</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Contact Number</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.map((client) => (
                                <TableRow key={client.id}>
                                    <TableCell>{client.client_code}</TableCell>
                                    <TableCell>{client.client_name}</TableCell>
                                    <TableCell>{client.contact_people?.[0]?.contact_person ?? '—'}</TableCell>
                                    <TableCell>{client.contact_people?.[0]?.contact_number ?? '—'}</TableCell>
                                    <TableCell>{client.contact_people?.[0]?.email ?? '—'}</TableCell>
                                    <TableCell className="flex justify-end gap-2 text-right">
                                        <Button variant="outline" size="icon" onClick={() => openEdit(client)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => setDeletingClient(client)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </PageCard>

            <ClientModal show={isOpen} onClose={closeModal} client={editingClient} />

            <ConfirmDelete
                show={Boolean(deletingClient)}
                onClose={() => setDeletingClient(null)}
                deleteUrl={deletingClient ? route('clients.destroy', deletingClient.id) : null}
                itemLabel={deletingClient ? `"${deletingClient.client_name}" and all of its contact people` : 'this client'}
                title="Delete client?"
            />
        </AuthenticatedLayout>
    );
}