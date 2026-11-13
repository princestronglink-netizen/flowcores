import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    Layers,
    PackageCheck,
    PackageX,
    Trophy,
    Wallet,
} from 'lucide-react';

const peso = (n) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n ?? 0);

function timeAgo(iso) {
    if (!iso) return '';
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(iso).toLocaleDateString();
}

const initials = (name = '') =>
    name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

const TONES = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const PRIORITY = {
    Low: 'bg-slate-100 text-slate-600 ring-slate-200',
    Medium: 'bg-sky-50 text-sky-700 ring-sky-100',
    High: 'bg-amber-50 text-amber-700 ring-amber-100',
    Critical: 'bg-rose-50 text-rose-700 ring-rose-100',
};

const card = 'rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]';

function Pill({ className = '', children }) {
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${className}`}>
            {children}
        </span>
    );
}

function Kpi({ label, value, hint, tone = 'slate', Icon, href }) {
    const body = (
        <div className={`${card} group flex h-full items-center gap-4 p-5 transition hover:shadow-md`}>
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${TONES[tone]}`}>
                <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="truncate text-2xl font-semibold leading-tight tabular-nums text-slate-900">{value}</p>
                {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
            </div>
            {href && <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />}
        </div>
    );
    return href ? <Link href={href} className="block">{body}</Link> : body;
}

function Panel({ title, subtitle, Icon, badge, action, children, className = '' }) {
    return (
        <section className={`${card} flex flex-col overflow-hidden ${className}`}>
            <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                {Icon && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon className="h-4 w-4" />
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        {title}
                        {badge > 0 && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">
                                {badge}
                            </span>
                        )}
                    </h3>
                    {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
                </div>
                {action}
            </header>
            <div className="min-h-0 flex-1">{children}</div>
        </section>
    );
}

function Empty({ icon: Icon = CheckCircle2, children }) {
    return (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-slate-500">
            <Icon className="h-8 w-8 text-slate-300" />
            {children}
        </div>
    );
}

function ViewAll({ href, children = 'View all' }) {
    return (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            {children} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
    );
}

export default function Dashboard({ can = {}, deals = null, stock = null, activity = [] }) {
    const user = usePage().props.auth?.user;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const today = new Date().toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const stockAlerts = stock ? stock.out_count + stock.low_count : 0;
    const stages = deals?.stages ?? [];
    const maxStage = Math.max(1, ...stages.map((s) => s.count));
    const showActivity = can.deals;
    const hasSide = Boolean(deals) || showActivity;
    const hasMain = Boolean(deals) || Boolean(stock);

    return (
        <AuthenticatedLayout
            header={
                <PageHeading
                    title={`${greeting}${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
                    subtitle={`${today} · Here's what needs your attention.`}
                />
            }
        >
            <Head title="Dashboard" />

            <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
                {/* ---------- Row 1: KPIs ---------- */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {deals && (
                        <Kpi
                            label="Open deals"
                            value={deals.open_count}
                            hint={deals.overdue_count > 0 ? `${deals.overdue_count} overdue` : 'None overdue'}
                            tone={deals.overdue_count > 0 ? 'amber' : 'indigo'}
                            Icon={Layers}
                            href={route('pipelines.index')}
                        />
                    )}
                    {deals && can.amounts && (
                        <Kpi label="Pipeline value" value={peso(deals.pipeline_value)} hint="Total of open deals" Icon={Wallet} />
                    )}
                    {deals && (
                        <Kpi
                            label="Won this month"
                            value={deals.won_count}
                            hint={can.amounts ? `${peso(deals.won_value)} · ${deals.lost_count} lost` : `${deals.lost_count} lost`}
                            tone="emerald"
                            Icon={Trophy}
                            href={route('transactions.index', { status: 'won' })}
                        />
                    )}
                    {stock && (
                        <Kpi
                            label="Stock alerts"
                            value={stockAlerts}
                            hint={`${stock.out_count} out · ${stock.low_count} low`}
                            tone={stock.out_count > 0 ? 'rose' : stockAlerts > 0 ? 'amber' : 'emerald'}
                            Icon={stockAlerts > 0 ? PackageX : PackageCheck}
                            href={route('items.index', { stock: 'restock' })}
                        />
                    )}
                </div>

                {/* ---------- Row 2: main (left) + action feed (right) ---------- */}
                {(hasMain || hasSide) && (
                    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
                        {/* Main column */}
                        <div className="space-y-6 xl:col-span-2">
                            {deals && (
                                <Panel
                                    Icon={Layers}
                                    title="Deals by stage"
                                    subtitle="Where your open deals are right now"
                                    action={<ViewAll href={route('pipelines.index')}>Open board</ViewAll>}
                                >
                                    {stages.length === 0 ? (
                                        <Empty icon={Layers}>No pipeline stages yet.</Empty>
                                    ) : (
                                        <div className="px-5 py-4">
                                            <div className="mb-2 grid grid-cols-[110px_1fr_88px_36px] items-center gap-4 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                <span>Stage</span>
                                                <span>Share</span>
                                                <span className="text-right">Overdue</span>
                                                <span className="text-right">Deals</span>
                                            </div>
                                            <ul className="divide-y divide-slate-100">
                                                {stages.map((s) => (
                                                    <li key={s.id} className="grid grid-cols-[110px_1fr_88px_36px] items-center gap-4 py-3 text-sm">
                                                        <span className="truncate font-medium text-slate-700">{s.name}</span>
                                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                            <div
                                                                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                                                style={{ width: `${s.count > 0 ? Math.max(4, (s.count / maxStage) * 100) : 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-right">
                                                            {s.overdue > 0 ? (
                                                                <Pill className="bg-amber-50 text-amber-700 ring-amber-100">{s.overdue} overdue</Pill>
                                                            ) : (
                                                                <span className="text-xs text-slate-300">—</span>
                                                            )}
                                                        </span>
                                                        <span className="text-right font-semibold tabular-nums text-slate-900">{s.count}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </Panel>
                            )}

                            {stock && (
                                <Panel
                                    Icon={PackageX}
                                    title="Items to restock"
                                    badge={stockAlerts}
                                    subtitle="Based on the last 30 days of demand"
                                    action={<ViewAll href={route('items.index', { stock: 'restock' })} />}
                                >
                                    {stock.restock.length === 0 ? (
                                        <Empty icon={PackageCheck}>Every item has enough stock.</Empty>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                                                    <tr>
                                                        <th className="px-5 py-2.5 font-medium">Item</th>
                                                        <th className="px-3 py-2.5 font-medium">Stock level</th>
                                                        <th className="px-5 py-2.5 text-right font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {stock.restock.map((v) => {
                                                        const out = v.status === 'out';
                                                        const pct = v.reorder_point > 0 ? Math.min(100, (v.stock / v.reorder_point) * 100) : 0;
                                                        return (
                                                            <tr key={v.id} className="transition hover:bg-slate-50">
                                                                <td className="px-5 py-3">
                                                                    <p className="font-medium text-slate-900">{v.item}</p>
                                                                    <p className="text-xs text-slate-500">{v.brand} · {v.label}</p>
                                                                </td>
                                                                <td className="px-3 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                                                                            <div
                                                                                className={`h-full rounded-full ${out ? 'bg-rose-500' : 'bg-amber-500'}`}
                                                                                style={{ width: `${pct}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="text-xs tabular-nums text-slate-500">
                                                                            <b className="font-semibold text-slate-900">{v.stock}</b> / {v.reorder_point}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-3 text-right">
                                                                    <Pill className={out ? 'bg-rose-50 text-rose-700 ring-rose-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}>
                                                                        {out ? 'Out of stock' : 'Low'}
                                                                    </Pill>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Panel>
                            )}
                        </div>

                        {/* Side column: things to act on */}
                        {hasSide && (
                            <div className="space-y-6">
                                {deals && (
                                    <Panel
                                        Icon={AlertTriangle}
                                        title="Needs attention"
                                        badge={deals.overdue_count}
                                        subtitle="Stayed too long in a stage"
                                    >
                                        {deals.overdue.length === 0 ? (
                                            <Empty>Nothing is overdue. Great job!</Empty>
                                        ) : (
                                            <ul className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto">
                                                {deals.overdue.map((d) => (
                                                    <li key={d.id}>
                                                        <Link href={route('pipelines.index')} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-medium text-slate-900">{d.name}</p>
                                                                <p className="truncate text-xs text-slate-500">{d.client ?? 'No client'} · {d.stage}</p>
                                                            </div>
                                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                                                                    <Clock className="h-3 w-3" /> {d.days_over}d over
                                                                </span>
                                                                {d.priority && <Pill className={PRIORITY[d.priority] ?? PRIORITY.Low}>{d.priority}</Pill>}
                                                            </div>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </Panel>
                                )}

                                {showActivity && (
                                    <Panel
                                        Icon={Activity}
                                        title="Recent activity"
                                        subtitle="Latest changes across your deals"
                                        action={<ViewAll href={route('transactions.index')} />}
                                    >
                                        {activity.length === 0 ? (
                                            <Empty icon={Clock}>No recent activity.</Empty>
                                        ) : (
                                            <ul className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto">
                                                {activity.map((a) => (
                                                    <li key={a.id} className="flex gap-3 px-5 py-3">
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-600">
                                                            {initials(a.by ?? '')}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm text-slate-900">
                                                                <span className="font-medium">{a.transaction ?? 'Deleted deal'}</span>
                                                                {a.stage && <span className="text-slate-500"> · {a.stage}</span>}
                                                            </p>
                                                            {a.note && <p className="line-clamp-2 text-xs text-slate-500">{a.note}</p>}
                                                        </div>
                                                        <p className="shrink-0 text-xs text-slate-400">{timeAgo(a.at)}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </Panel>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {!deals && !stock && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                        Welcome! Your account doesn't have access to any dashboard sections yet.
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}