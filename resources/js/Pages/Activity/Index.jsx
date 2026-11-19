import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import Pagination from '@/Components/ui/Pagination';
import useServerFilters from '@/Hooks/useServerFilters';
import { FilterBar, SearchBox, EmptyState } from '@/Components/Index';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

const fieldCls = 'h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700';

function Details({ properties }) {
    const [open, setOpen] = useState(false);

    if (!properties || Object.keys(properties).length === 0) {
        return <span className="text-slate-400">—</span>;
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="text-xs font-medium text-[#667292]"
            >
                {open ? 'Hide' : 'View details'}
            </button>
            {open && (
                <pre className="mt-1 max-w-md overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
                    {JSON.stringify(properties, null, 2)}
                </pre>
            )}
        </div>
    );
}

export default function Index({ logs: paginator, events, users, filters: initialFilters }) {
    const [filters, setFilter] = useServerFilters(route('activity-logs.index'), initialFilters);
    const rows = paginator.data;

    return (
        <AuthenticatedLayout
            header={<PageHeading title="Activity log" subtitle="Who did what, and when." />}
        >
            <Head title="Activity log" />

            <PageCard>
                <div className="p-5">
                    <FilterBar>
                        <SearchBox
                            value={filters.search}
                            onChange={(v) => setFilter('search', v)}
                            placeholder="Search activity"
                        />
                        <select
                            className={fieldCls}
                            value={filters.event ?? ''}
                            onChange={(e) => setFilter('event', e.target.value)}
                        >
                            <option value="">All events</option>
                            {events.map((ev) => (
                                <option key={ev} value={ev}>{ev}</option>
                            ))}
                        </select>
                        <select
                            className={fieldCls}
                            value={filters.user ?? ''}
                            onChange={(e) => setFilter('user', e.target.value)}
                        >
                            <option value="">All users</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            className={fieldCls}
                            value={filters.from ?? ''}
                            onChange={(e) => setFilter('from', e.target.value)}
                        />
                        <input
                            type="date"
                            className={fieldCls}
                            value={filters.to ?? ''}
                            onChange={(e) => setFilter('to', e.target.value)}
                        />
                    </FilterBar>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>When</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Event</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <EmptyState title="No activity found" hint="Try different filters." />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((l) => (
                                    <TableRow key={l.id}>
                                        <TableCell className="whitespace-nowrap text-xs text-slate-500">
                                            {new Date(l.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>{l.user_name ?? 'System'}</TableCell>
                                        <TableCell>
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                {l.event}
                                            </span>
                                        </TableCell>
                                        <TableCell>{l.description}</TableCell>
                                        <TableCell><Details properties={l.properties} /></TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <Pagination paginator={paginator} onPerPageChange={(n) => setFilter('per_page', n)} />
                </div>
            </PageCard>
        </AuthenticatedLayout>
    );
}