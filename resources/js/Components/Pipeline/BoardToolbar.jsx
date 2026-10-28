import { Search, X } from 'lucide-react';
import { cx } from '@/Components/ui/kit';

const PRIORITIES = [
    { value: '', label: 'All' },
    { value: 'Low', label: 'Low', dot: 'bg-emerald-500' },
    { value: 'Medium', label: 'Medium', dot: 'bg-amber-500' },
    { value: 'High', label: 'High', dot: 'bg-orange-500' },
    { value: 'Critical', label: 'Critical', dot: 'bg-red-500' },
];

export default function BoardToolbar({ query, onQuery, priority, onPriority, shown, total }) {
    const filtering = query.trim() !== '' || priority !== '';

    return (
        <div className="flex shrink-0 flex-wrap items-center gap-3 px-0.5 pb-1 pt-1">
            {/* Search */}
            <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => onQuery(e.target.value)}
                    placeholder="Search name, client or contact"
                    aria-label="Search cards"
                    className="block h-10 w-full rounded-lg border border-[#bccad6] bg-white pl-9 pr-3 text-sm text-[#3a4157] shadow-sm placeholder:text-[#8d9db6] focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#8d9db6]/40"
                />
            </div>

            {/* Priority filter */}
            <div
                className="inline-flex h-10 items-center gap-1 rounded-lg bg-slate-100 p-1"
                role="group"
                aria-label="Filter by priority"
            >
                {PRIORITIES.map((p) => (
                    <button
                        key={p.value || 'all'}
                        type="button"
                        aria-pressed={priority === p.value}
                        onClick={() => onPriority(p.value)}
                        className={cx(
                            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition',
                            priority === p.value
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800',
                        )}
                    >
                        {p.dot && <span className={cx('size-2 rounded-full', p.dot)} />}
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Result count + clear */}
            {filtering && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                        {shown} of {total} {total === 1 ? 'card' : 'cards'}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            onQuery('');
                            onPriority('');
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-sm font-medium text-[#667292] transition hover:bg-[#eef1f5]"
                    >
                        <X className="size-4" /> Clear
                    </button>
                </div>
            )}
        </div>
    );
}