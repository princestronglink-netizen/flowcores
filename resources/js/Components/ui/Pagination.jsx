import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/Components/ui/kit';

const DEFAULT_OPTIONS = [10, 15, 25, 50, 100];

/**
 * Works with a Laravel paginator passed through Inertia (->paginate()->withQueryString()).
 * Pass `onPerPageChange` to show the "Rows per page" selector.
 */
export default function Pagination({ paginator, onPerPageChange, perPageOptions = DEFAULT_OPTIONS }) {
    if (!paginator || paginator.total === 0) return null;

    const { links, from, to, total, last_page, per_page } = paginator;
    const prev = links[0];
    const next = links[links.length - 1];
    const pages = links.slice(1, -1);

    const base = 'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm';

    const Item = ({ link, children, className }) =>
        link.url ? (
            <Link href={link.url} preserveScroll preserveState className={cx(base, className)}>
                {children}
            </Link>
        ) : (
            <span className={cx(base, 'cursor-not-allowed text-slate-300', link.label === '...' && 'cursor-default')}>
                {children}
            </span>
        );

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="text-xs text-slate-500">
                    Showing {from}–{to} of {total}
                </p>

                {onPerPageChange && (
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                        Rows per page
                        <select
                            value={per_page}
                            onChange={(e) => onPerPageChange(Number(e.target.value))}
                            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#667292]/20"
                        >
                            {perPageOptions.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </label>
                )}
            </div>

            {last_page > 1 && (
                <nav className="flex items-center gap-1" aria-label="Pagination">
                    <Item link={prev} className="text-slate-600 hover:bg-slate-100">
                        <ChevronLeft className="size-4" aria-label="Previous" />
                    </Item>

                    {pages.map((l, i) => (
                        <Item
                            key={i}
                            link={l}
                            className={
                                l.active
                                    ? 'bg-[#667292] font-medium text-white'
                                    : 'tabular-nums text-slate-600 hover:bg-slate-100'
                            }
                        >
                            {l.label}
                        </Item>
                    ))}

                    <Item link={next} className="text-slate-600 hover:bg-slate-100">
                        <ChevronRight className="size-4" aria-label="Next" />
                    </Item>
                </nav>
            )}
        </div>
    );
}