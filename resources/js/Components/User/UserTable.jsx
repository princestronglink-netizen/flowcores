import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { EmptyState, RowActions } from '@/Components/Index';
import { cx } from '@/Components/ui/kit';
import { Pencil, ShieldCheck, Trash2 } from 'lucide-react';

// Same role always gets the same color.
const BADGES = [
    'bg-sky-50 text-sky-700 ring-sky-200',
    'bg-violet-50 text-violet-700 ring-violet-200',
    'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'bg-rose-50 text-rose-700 ring-rose-200',
    'bg-teal-50 text-teal-700 ring-teal-200',
    'bg-orange-50 text-orange-700 ring-orange-200',
];
const AVATARS = ['bg-[#667292]', 'bg-sky-600', 'bg-violet-600', 'bg-emerald-600', 'bg-rose-500', 'bg-teal-600', 'bg-orange-500'];

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const badgeFor = (role) => (role === 'admin' ? 'bg-[#3a4157] text-white ring-[#3a4157]' : BADGES[hash(role) % BADGES.length]);
const avatarFor = (name) => AVATARS[hash(name) % AVATARS.length];

function RoleBadge({ role }) {
    if (!role) {
        return (
            <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-200">
                No role
            </span>
        );
    }
    return (
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', badgeFor(role))}>
            {role === 'admin' && <ShieldCheck className="h-3 w-3" />}
            {role}
        </span>
    );
}

export default function UserTable({ rows, currentId, canEditUser, onEdit, onDelete, emptyTitle, emptyHint }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5}>
                            <EmptyState title={emptyTitle} hint={emptyHint} />
                        </TableCell>
                    </TableRow>
                ) : (
                    rows.map((u) => (
                        <TableRow key={u.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <span
                                        className={cx(
                                            'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                                            avatarFor(u.name),
                                        )}
                                    >
                                        {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                                    </span>
                                    <p className="truncate font-medium text-slate-900">
                                        {u.name}
                                        {u.id === currentId && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">You</span>
                                        )}
                                    </p>
                                </div>
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                                <RoleBadge role={u.role} />
                            </TableCell>
                            <TableCell>{u.created_at}</TableCell>
                            <TableCell>
                                <RowActions>
                                    {canEditUser(u) ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={`Edit ${u.name}`}
                                                title="Edit"
                                                onClick={() => onEdit(u)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {u.id !== currentId && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label={`Delete ${u.name}`}
                                                    title="Delete"
                                                    onClick={() => onDelete(u)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-xs text-slate-400">Admin only</span>
                                    )}
                                </RowActions>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}