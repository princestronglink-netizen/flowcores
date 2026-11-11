import { ArrowRightLeft, CalendarDays, Check, Flag, Layers, MapPin, User } from 'lucide-react';
import { cx } from '@/Components/ui/kit';

/* ------------------------------ helpers ------------------------------ */

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Same rule as the board: the first day counts as day 1.
const daysBetween = (a, b) => Math.max(1, Math.round((dayStart(b) - dayStart(a)) / 86400000) + 1);

const fmtDate = (v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = (v) => new Date(v).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// The `changedBy` relation serializes as `changed_by` (it replaces the user-id column when loaded).
const whoOf = (h) => (h?.changed_by && typeof h.changed_by === 'object' ? h.changed_by.name : null);

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Turn the raw history rows into one "visit" per stay in a stage.
 * Rows that belong to the same stage in a row (e.g. "Quotation issued") become notes of that visit.
 */
function buildVisits(history) {
    const asc = [...history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id);
    const visits = [];

    asc.forEach((h) => {
        const last = visits[visits.length - 1];
        if (last && last.stageId === h.pipeline_stage_id) {
            last.events.push(h);
        } else {
            visits.push({ id: h.id, stageId: h.pipeline_stage_id, name: h.stage?.stage_name ?? 'Stage', entry: h, events: [] });
        }
    });

    visits.forEach((v, i) => {
        const next = visits[i + 1];
        v.start = new Date(v.entry.created_at);
        v.days = daysBetween(v.start, next ? new Date(next.entry.created_at) : new Date());
        v.current = !next;
        v.first = i === 0;
    });

    return visits;
}

/* ------------------------------- parts ------------------------------- */

function Stat({ icon: Icon, label, children }) {
    return (
        <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-[#f4f7fb] px-3 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-[#1b4a7d] shadow-sm ring-1 ring-[#dbe4ef]">
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b84a8]">{label}</p>
                <p className="truncate text-sm font-semibold text-[#12306b]">{children}</p>
            </div>
        </div>
    );
}

/** "2 / 3 days": green inside the limit, red over it, plain grey when the stage has no limit. */
function DaysChip({ days, limit, current }) {
    const over = limit && days > limit;

    const tone = over
        ? 'bg-red-50 text-red-700 ring-red-200'
        : limit
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-slate-50 text-slate-600 ring-slate-200';

    return (
        <span
            className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1', tone)}
            title={limit ? `${plural(limit, 'day')} allowed in this stage` : 'No day limit for this stage'}
        >
            {limit ? `${days} / ${plural(limit, 'day')}` : plural(days, 'day')}
            {over && ' · overdue'}
            {!over && current && ' · so far'}
        </span>
    );
}

function Visit({ v, limit, last }) {
    const who = whoOf(v.entry);
    const Icon = v.first ? Flag : v.current ? MapPin : Check;

    return (
        <li className="relative flex gap-4 pb-5 last:pb-0">
            {/* timeline line */}
            {!last && <span className="absolute bottom-0 left-4 top-9 w-px bg-[#dbe4ef]" aria-hidden="true" />}

            {/* marker */}
            <span
                className={cx(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full',
                    v.current ? 'bg-[#1b4a7d] text-white ring-4 ring-[#1b4a7d]/15' : 'bg-white text-[#6b84a8] ring-1 ring-[#c9d6e5]',
                )}
            >
                <Icon className="size-4" />
            </span>

            {/* card */}
            <div
                className={cx(
                    'min-w-0 flex-1 rounded-xl border bg-white px-4 py-3',
                    v.current ? 'border-[#1b4a7d]/30 shadow-sm' : 'border-[#e3eaf3]',
                )}
            >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                        <h4 className="truncate text-sm font-semibold text-[#12306b]">{v.name}</h4>
                        {v.current && (
                            <span className="rounded-full bg-[#1b4a7d] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                Current
                            </span>
                        )}
                    </div>
                    <DaysChip days={v.days} limit={limit} current={v.current} />
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <User className="size-3.5 text-[#6b84a8]" />
                        <span className="font-medium text-slate-700">{who ?? 'System'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 text-[#6b84a8]" />
                        {fmtDate(v.entry.created_at)} · {fmtTime(v.entry.created_at)}
                    </span>
                </div>

                {(v.entry.note || v.events.length > 0) && (
                    <ul className="mt-2.5 space-y-1 border-t border-[#eef3fa] pt-2.5 text-xs text-slate-600">
                        {v.entry.note && (
                            <li className="flex gap-2">
                                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#c9d6e5]" />
                                <span>{v.entry.note}</span>
                            </li>
                        )}
                        {v.events.map((e) => (
                            <li key={e.id} className="flex gap-2">
                                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#c9d6e5]" />
                                <span className="min-w-0 flex-1">
                                    {e.note || 'Updated'}
                                    <span className="ml-1.5 text-slate-400">
                                        {fmtDate(e.created_at)} · {fmtTime(e.created_at)}
                                        {whoOf(e) ? ` · ${whoOf(e)}` : ''}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </li>
    );
}

/* ------------------------------ component ------------------------------ */

/**
 * Who put the transaction in which stage, and when. Newest first.
 *
 * history   = transaction.stage_history (rows with stage + changed_by loaded)
 * stages    = [{ id, max_days }] so each stay can show "2 / 3 days"
 * showTitle = false when the parent (e.g. a modal) already has a heading
 * showStats = false to hide the summary strip
 */
export default function StageHistory({ history = [], stages = [], className, showTitle = true, showStats = true }) {
    if (!history || history.length === 0) return null;

    const limits = Object.fromEntries((stages ?? []).map((s) => [s.id, s.max_days]));
    const visits = buildVisits(history);
    const current = visits[visits.length - 1];
    const newestFirst = [...visits].reverse();

    const totalDays = daysBetween(visits[0].start, new Date());
    const moves = Math.max(0, visits.length - 1);

    return (
        <div className={cx('space-y-4', className)}>
            {showTitle && (
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#12306b]">Stage history</h3>
            )}

            {showStats && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Stat icon={MapPin} label="Current stage">{current.name}</Stat>
                    <Stat icon={CalendarDays} label="Open for">{plural(totalDays, 'day')}</Stat>
                    <Stat icon={moves === 0 ? Layers : ArrowRightLeft} label="Stage changes">{moves}</Stat>
                </div>
            )}

            <ol>
                {newestFirst.map((v, i) => (
                    <Visit key={v.id} v={v} limit={limits[v.stageId]} last={i === newestFirst.length - 1} />
                ))}
            </ol>
        </div>
    );
}