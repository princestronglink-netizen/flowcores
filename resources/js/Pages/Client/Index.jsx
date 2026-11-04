import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/Components/ui/table";
import { Button } from "@/Components/ui/Button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import ClientModal from '@/Components/Client/ClientModal';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import { useState } from 'react';

/**
 * PERMISSION (the server checks all of these again):
 *   create_client  client.create -> New Client button
 *   edit_client    client.edit   -> Edit button
 *   delete_client  client.delete -> Delete button
 */
export default function Index({ clients }) {
    const can = usePage().props.auth?.can ?? {};
    const canCreate = Boolean(can.create_client);
    const canEdit = Boolean(can.edit_client);
    const canDelete = Boolean(can.delete_client);
    const showActions = canEdit || canDelete;

    const [isOpen, setIsOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [deletingClient, setDeletingClient] = useState(null);

    const openCreate = () => {
        if (!canCreate) return;
        setEditingClient(null);
        setIsOpen(true);
    };

    const openEdit = (client) => {
        if (!canEdit) return;
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
                    // PERMISSION: the New Client button only shows for users who can create
                    canCreate ? (
                        <PageToolbar>
                            <Button variant="brand" onClick={openCreate}>
                                <Plus />
                                New Client
                            </Button>
                        </PageToolbar>
                    ) : undefined
                }
            >
                <div className="p-5">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client Name</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Contact Number</TableHead>
                                <TableHead>Email</TableHead>
                                {showActions && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.map((client) => (
                                <TableRow key={client.id}>
                                    <TableCell>{client.client_name}</TableCell>
                                    <TableCell className="max-w-xs truncate" title={client.address ?? ''}>
                                        {client.address || '—'}
                                    </TableCell>
                                    <TableCell>{client.contact_people?.[0]?.contact_person ?? '—'}</TableCell>
                                    <TableCell>{client.contact_people?.[0]?.contact_number ?? '—'}</TableCell>
                                    <TableCell>{client.contact_people?.[0]?.email ?? '—'}</TableCell>
                                    {showActions && (
                                        <TableCell className="flex justify-end gap-2 text-right">
                                            {canEdit && (
                                                <Button variant="outline" size="icon" aria-label="Edit client" onClick={() => openEdit(client)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button variant="outline" size="icon" aria-label="Delete client" onClick={() => setDeletingClient(client)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </PageCard>

            {/* The modal is only mounted for users who can create or edit */}
            {(canCreate || canEdit) && <ClientModal show={isOpen} onClose={closeModal} client={editingClient} />}

            {canDelete && (
                <ConfirmDelete
                    show={Boolean(deletingClient)}
                    onClose={() => setDeletingClient(null)}
                    deleteUrl={deletingClient ? route('clients.destroy', deletingClient.id) : null}
                    itemLabel={deletingClient ? `"${deletingClient.client_name}" and all of its contact people` : 'this client'}
                    title="Delete client?"
                />
            )}
        </AuthenticatedLayout>
    );
}