import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { EmptyState, Pill, RowActions } from '@/Components/Index';
import { Link } from '@inertiajs/react';
import { ClipboardCheck, History, Pencil, Trash2, Truck } from 'lucide-react';
import { PriorityPill, currency } from '@/Components/ui/kit';

const TONE = { open: 'sky', won: 'emerald', lost: 'red' };

export default function TransactionTable({
    rows, canEdit, canDelete, canViewAmounts,
    onDelete, onHistory, onDeliveries,   
    emptyTitle, emptyHint,
}) {
    // The history / cross-check buttons are available to everyone, so the Actions column is always there.
    const showActions = true;
    const colSpan = 6 + (canViewAmounts ? 1 : 0) + (showActions ? 1 : 0);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Pipeline stage</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    {canViewAmounts && <TableHead className="text-right">Amount</TableHead>}
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
                    rows.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell>
                                <p className="font-medium text-slate-900">{t.name || '—'}</p>
                                <p
                                    className="max-w-xs truncate text-xs text-slate-500"
                                    title={(t.items ?? []).map((i) => `${i.item_name} — ${i.brand_name}`).join(', ')}
                                >
                                    {(t.items ?? []).map((i) => i.item_name).join(', ') || 'No items'}
                                </p>
                            </TableCell>
                            <TableCell>
                                <p>{t.client?.client_name ?? '—'}</p>
                                <p className="text-xs text-slate-500">{t.contact_person?.contact_person ?? ''}</p>
                            </TableCell>
                            <TableCell>
                                {t.stage ? <Pill tone="brand">{t.stage.stage_name}</Pill> : '—'}
                                <p className="mt-0.5 text-xs text-slate-500">{t.pipeline?.pipeline_name ?? ''}</p>
                            </TableCell>
                            <TableCell>
                                <PriorityPill value={t.priority} />
                            </TableCell>
                            <TableCell>
                                <Pill tone={TONE[t.status] ?? 'sky'} className="capitalize">{t.status}</Pill>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{t.items?.length ?? 0}</TableCell>
                            {canViewAmounts && (
                                <TableCell className="text-right font-medium tabular-nums">
                                    {t.amount != null ? currency(t.amount) : '—'}
                                </TableCell>
                            )}
                            {showActions && (
                                <TableCell>
                                    <RowActions>
                                        {/* Stage history: who moved it to which stage, and when (read-only) */}
                                        {onHistory && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label="Stage history"
                                                title="Stage history"
                                                onClick={() => onHistory(t)}
                                            >
                                                <History className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {onDeliveries && (t.delivery_history ?? []).length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label="Delivery history"
                                                title="Delivery history"
                                                onClick={() => onDeliveries(t)}
                                            >
                                                <Truck className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {/* Done deal: quotation vs client PO vs delivered vs DR files */}
                                        {t.status === 'won' && (
                                            <Link href={route('transactions.crossCheck', t.id)}>
                                                <Button variant="outline" size="icon" aria-label="Cross-check done deal" title="Cross-check">
                                                    <ClipboardCheck className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        )}
                                        {canEdit && (
                                            <Link href={route('transactions.edit', t.id)}>
                                                <Button variant="outline" size="icon" aria-label="Edit transaction" title="Edit">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <Button variant="outline" size="icon" aria-label="Delete transaction" title="Delete" onClick={() => onDelete(t)}>
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