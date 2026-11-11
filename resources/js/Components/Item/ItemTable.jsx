import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { EmptyState, Pill, RowActions } from '@/Components/Index';
import ItemVariantTable from '@/Components/Item/ItemVariantTable';
import { STATUS_LABEL, TONE, specOf, statusOf, stockOf } from '@/Components/Item/itemStock';
import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Fragment } from 'react';
import { cx } from '@/Components/ui/kit';

const initials = (name) => (name || '?').trim().slice(0, 2).toUpperCase();

export default function ItemTable({ rows, canEdit, canDelete, openIds, onToggle, onDelete, emptyTitle, emptyHint }) {
    const showActions = canEdit || canDelete;
    const colSpan = 5 + (showActions ? 1 : 0);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Item</TableHead>
                    <TableHead className="hidden lg:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Sizes &amp; stock</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {showActions && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={colSpan}>
                            <EmptyState title={emptyTitle} hint={emptyHint} />
                        </TableCell>
                    </TableRow>
                )}

                {rows.map(({ item, variants, total, needs }) => {
                    const open = openIds.has(item.id);
                    const multiBrand = item.brands.length > 1;
                    const chips = item.brands.flatMap((b) =>
                        b.variants.map((v) => ({
                            id: v.id,
                            label: multiBrand ? `${b.brand_name} ${specOf(v)}` : specOf(v),
                            stock: stockOf(v),
                            status: statusOf(v),
                        })),
                    );
                    const shown = chips.slice(0, 3);
                    const totalStatus = total <= 0 ? 'out' : needs > 0 ? 'low' : 'ok';

                    return (
                        <Fragment key={item.id}>
                            <TableRow className={cx(open && 'bg-slate-50')}>
                                <TableCell className="w-10 pr-0">
                                    <button
                                        type="button"
                                        onClick={() => onToggle(item.id)}
                                        aria-expanded={open}
                                        aria-label={open ? `Hide ${item.item_name}` : `Show ${item.item_name}`}
                                        className="flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40"
                                    >
                                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                    </button>
                                </TableCell>

                                <TableCell>
                                    <button type="button" onClick={() => onToggle(item.id)} className="flex min-w-0 items-center gap-3 text-left">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                                            {initials(item.item_name)}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium text-slate-900">{item.item_name}</span>
                                            <span className="block truncate text-xs text-slate-500 lg:hidden">
                                                {item.category?.category_name ?? 'Uncategorized'}
                                            </span>
                                        </span>
                                    </button>
                                </TableCell>

                                <TableCell className="hidden lg:table-cell">
                                    <Pill>{item.category?.category_name ?? 'Uncategorized'}</Pill>
                                </TableCell>

                                <TableCell className="hidden lg:table-cell">
                                    <div className="flex flex-wrap gap-1.5">
                                        {chips.length === 0 && <span className="text-slate-400">—</span>}
                                        {shown.map((c) => (
                                            <Pill key={c.id} tone={c.status === 'ok' ? 'slate' : TONE[c.status]} className="gap-1">
                                                <b className="font-semibold">{c.label}</b>
                                                <span className="tabular-nums">{c.stock}</span>
                                            </Pill>
                                        ))}
                                        {chips.length > shown.length && (
                                            <span className="px-1 text-xs text-slate-500">+{chips.length - shown.length} more</span>
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell className="text-right">
                                    <Pill tone={TONE[totalStatus]} title={STATUS_LABEL[totalStatus]} className="font-semibold tabular-nums">
                                        {total}
                                    </Pill>
                                </TableCell>

                                {showActions && (
                                    <TableCell>
                                        <RowActions>
                                            {/* PERMISSION: Edit only shows for users who can edit items */}
                                            {canEdit && (
                                                <Link href={route('items.edit', item.id)}>
                                                    <Button variant="outline" size="icon" aria-label="Edit item" title="Edit">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label="Delete item"
                                                    title="Delete"
                                                    onClick={() => onDelete(item)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </RowActions>
                                    </TableCell>
                                )}
                            </TableRow>

                            {/* Expanded panel: the sizes of this item */}
                            {open && (
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableCell colSpan={colSpan} className="px-4 pb-4 pt-0">
                                        <ItemVariantTable item={item} variants={variants} total={total} canEdit={canEdit} />
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    );
                })}
            </TableBody>
        </Table>
    );
}