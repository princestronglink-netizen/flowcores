import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { EmptyState, Pill, RowActions } from '@/Components/Index';
import { Link } from '@inertiajs/react';
import { Pencil, Printer } from 'lucide-react';
import { currency } from '@/Components/ui/kit';

export default function QuotationTable({ rows, canPrint, canEdit, canViewAmounts, emptyTitle, emptyHint }) {
    const showActions = canPrint || canEdit;
    const colSpan = 4 + (canViewAmounts ? 1 : 0) + (showActions ? 1 : 0);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Quotation</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Prepared by</TableHead>
                    <TableHead>Stage</TableHead>
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
                                <p className="font-medium text-slate-900">{t.quotation_number}</p>
                                <p className="text-xs text-slate-500">{t.name}</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    <Pill tone={t.version > 0 ? 'amber' : 'slate'}>{t.version_label}</Pill>
                                    {t.quotation_frozen && <Pill tone="sky">Sent</Pill>}
                                </div>
                            </TableCell>
                            <TableCell>
                                <p>{t.client?.client_name ?? '—'}</p>
                                <p className="text-xs text-slate-500">{t.contact_person?.contact_person ?? ''}</p>
                            </TableCell>
                            <TableCell>
                                <p>{t.prepared_by ?? '—'}</p>
                                <p className="text-xs text-slate-500">{t.prepared_by_position ?? ''}</p>
                            </TableCell>
                            <TableCell>
                                <p>{t.stage?.stage_name ?? '—'}</p>
                                <p className="text-xs capitalize text-slate-500">{t.status}</p>
                            </TableCell>
                            {canViewAmounts && (
                                <TableCell className="text-right font-medium tabular-nums">{currency(t.amount)}</TableCell>
                            )}
                            {showActions && (
                                <TableCell>
                                    <RowActions>
                                        {canPrint && (
                                            <a href={route('transactions.quotation.print', t.id)} target="_blank" rel="noreferrer">
                                                <Button variant="outline" size="icon" aria-label="Print" title="Print">
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </a>
                                        )}
                                        {canEdit && (
                                            <Link href={route('transactions.edit', t.id)}>
                                                <Button variant="outline" size="icon" aria-label="Edit transaction" title="Edit">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
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