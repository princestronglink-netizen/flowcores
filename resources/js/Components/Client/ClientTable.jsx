import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { EmptyState, RowActions } from '@/Components/Index';
import ContactList from '@/Components/Client/ContactList';
import { Pencil, Trash2 } from 'lucide-react';

export default function ClientTable({ rows, canEdit, canDelete, onEdit, onDelete, emptyTitle, emptyHint }) {
    const showActions = canEdit || canDelete;
    const colSpan = 3 + (showActions ? 1 : 0);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact people</TableHead>
                    {showActions && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={colSpan}>
                            <EmptyState title={emptyTitle} hint={emptyHint} />
                        </TableCell>
                    </TableRow>
                ) : (
                    rows.map((c) => (
                        <TableRow key={c.id}>
                            <TableCell>
                                <p className="font-medium text-slate-900">{c.client_name}</p>
                            </TableCell>
                            <TableCell className="whitespace-pre-line">{c.address || '—'}</TableCell>
                            <TableCell>
                                <ContactList contacts={c.contact_people} />
                            </TableCell>
                            {showActions && (
                                <TableCell>
                                    <RowActions>
                                        {canEdit && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label="Edit client"
                                                title="Edit"
                                                onClick={() => onEdit(c)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label="Delete client"
                                                title="Delete"
                                                onClick={() => onDelete(c)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </RowActions>
                                </TableCell>
                            )}
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}