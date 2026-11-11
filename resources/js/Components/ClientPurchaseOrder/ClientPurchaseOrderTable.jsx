import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { EmptyState, Pill, RowActions } from '@/Components/Index';
import { Ban, Check, Trash2 } from 'lucide-react';
import { currency } from '@/Components/ui/kit';

const TONE = { draft: 'slate', confirmed: 'emerald', cancelled: 'red' };

export default function ClientPurchaseOrderTable({
    rows,
    statuses,
    canConfirm,
    canEdit,
    canDelete,
    canViewAmounts,
    showActions,
    onConfirm,
    onCancel,
    onDelete,
    emptyTitle,
    emptyHint,
}) {
    const colSpan = 4 + (canViewAmounts ? 1 : 0) + (showActions ? 1 : 0);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Client PO</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    {canViewAmounts && <TableHead className="text-right">Total</TableHead>}
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
                    rows.map((p) => (
                        <TableRow key={p.id}>
                            <TableCell>
                                <p className="font-medium text-slate-900">{p.cpo_number}</p>
                                <p className="text-xs text-slate-500">
                                    {p.client_po_number ? (
                                        <>Client ref {p.client_po_number}{p.client_po_date ? ` · ${p.client_po_date}` : ''}</>
                                    ) : (
                                        <span className="text-amber-600">Entered when you confirm</span>
                                    )}
                                </p>
                                {p.transaction && <p className="text-xs text-slate-500">For {p.transaction.name}</p>}
                            </TableCell>
                            <TableCell>
                                <p>{p.client?.client_name ?? '—'}</p>
                                <p className="text-xs text-slate-500">{p.contact_person?.contact_person ?? ''}</p>
                            </TableCell>
                            <TableCell>
                                <Pill tone={TONE[p.status] ?? 'slate'}>{statuses[p.status]}</Pill>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {p.items.reduce((s, i) => s + i.quantity, 0)}
                            </TableCell>
                            {canViewAmounts && (
                                <TableCell className="text-right font-medium tabular-nums">{currency(p.amount)}</TableCell>
                            )}
                            {showActions && (
                                <TableCell>
                                    <RowActions>
                                        {canConfirm && p.status === 'draft' && (
                                            <Button variant="brand" onClick={() => onConfirm(p)}>
                                                <Check className="size-3.5" /> Confirm
                                            </Button>
                                        )}
                                        {canEdit && p.status === 'draft' && (
                                            <Button variant="outline" size="icon" aria-label="Cancel" title="Cancel" onClick={() => onCancel(p)}>
                                                <Ban className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canDelete && ['draft', 'cancelled'].includes(p.status) && (
                                            <Button variant="outline" size="icon" aria-label="Delete" title="Delete" onClick={() => onDelete(p)}>
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