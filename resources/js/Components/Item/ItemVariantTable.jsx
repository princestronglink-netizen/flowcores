import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { Pill, RowActions } from '@/Components/Index';
import { Link } from '@inertiajs/react';
import { SlidersHorizontal } from 'lucide-react';
import { Fragment } from 'react';
import { STATUS_LABEL, TONE, specOf, statusOf, stockOf } from '@/Components/Item/itemStock';

/** The sizes of one item (shown when its row is expanded). */
export default function ItemVariantTable({ item, variants, total, canEdit }) {
    const multiBrand = item.brands.length > 1;

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <p className="px-4 py-2 text-xs text-slate-500">
                {variants.length} {variants.length === 1 ? 'size' : 'sizes'} · {total} in stock
            </p>

            {item.brands.length === 0 ? (
                <p className="border-t border-slate-100 px-4 py-4 text-xs text-slate-500">
                    No brands or sizes yet.{canEdit ? ' Use Edit to add them.' : ''}
                </p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Size</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead title="Reorder when stock reaches this level. Based on 30-day average demand × (lead time + safety days)">
                                Reorder point
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {item.brands.map((b) => (
                            <Fragment key={b.id}>
                                {multiBrand && (
                                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                                        <TableCell colSpan={4} className="py-1.5 text-xs font-semibold text-slate-600">
                                            {b.brand_name}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {b.variants.map((v) => {
                                    const st = statusOf(v);
                                    return (
                                        <TableRow key={v.id}>
                                            <TableCell>
                                                <Pill>{specOf(v)}</Pill>
                                            </TableCell>
                                            <TableCell>
                                                <span className="flex items-center gap-2">
                                                    <Pill tone={TONE[st]} className="font-semibold tabular-nums">
                                                        {stockOf(v)}
                                                    </Pill>
                                                    {st !== 'ok' && <span className="text-xs text-slate-500">{STATUS_LABEL[st]}</span>}
                                                </span>
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                {Number(v.reorder_point) > 0 ? v.reorder_point : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <RowActions>
                                                    <Link href={route('stock-adjust.index', { variant: v.id })}>
                                                        <Button variant="outline" size="icon" aria-label="Adjust stock" title="Adjust stock">
                                                            <SlidersHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </RowActions>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
