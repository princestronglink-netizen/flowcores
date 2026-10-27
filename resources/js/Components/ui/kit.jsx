import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

/*
 * One place for the look of forms and panels.
 * Brand color is #667292 (slate blue). To re-theme, change BRAND below.
 */
export const BRAND = '#667292';
export const BRAND_DARK = '#3a4157';

/** Joins class names and resolves Tailwind conflicts: the LAST conflicting class wins (e.g. w-full vs w-48). */
export const cx = (...a) => twMerge(clsx(a));

export const currency = (n) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---------- Inputs ---------- */

export const inputCls =
    'block h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm transition ' +
    'placeholder:text-slate-400 focus:border-[#667292] focus:outline-none focus:ring-[3px] focus:ring-[#667292]/20 ' +
    'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ' +
    '[&>option]:bg-white [&>option]:text-slate-900';
const inputErr = 'border-red-400 focus:border-red-500 focus:ring-red-500/20';
/** input(hasError) -> class string */
export const input = (hasError) => cx(inputCls, hasError && inputErr);
export const textareaCls = (hasError) =>
    cx(inputCls, 'h-auto min-h-[84px] resize-y py-2', hasError && inputErr);

export function Field({ label, required, error, hint, action, htmlFor, className, children }) {
    return (
        <div className={cx('min-w-0', className)}>
            {(label || action) && (
                <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
                    {label ? (
                        <label htmlFor={htmlFor} className="truncate text-[13px] font-medium text-slate-700">
                            {label}
                            {required && <span className="ml-0.5 text-red-500">*</span>}
                        </label>
                    ) : (
                        <span />
                    )}
                    {action}
                </div>
            )}
            {children}
            {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

/** Small text button for "+ New", "+ Add item" etc. */
export function LinkButton({ icon: Icon, children, className, ...props }) {
    return (
        <button
            type="button"
            className={cx(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#667292] transition',
                'hover:bg-slate-100 hover:text-[#3a4157] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40',
                className,
            )}
            {...props}
        >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {children}
        </button>
    );
}

export function IconButton({ icon: Icon, label, danger = false, className, ...props }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={cx(
                'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40',
                danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-700',
                className,
            )}
            {...props}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

/* ---------- Containers ---------- */

export function Panel({ title, description, icon: Icon, actions, children, className, bodyClass = 'p-5' }) {
    return (
        <section className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
            {(title || actions) && (
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        {Icon && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#667292]">
                                <Icon className="h-4 w-4" />
                            </span>
                        )}
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
                            {description && <p className="text-xs text-slate-500">{description}</p>}
                        </div>
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className={bodyClass}>{children}</div>
        </section>
    );
}

/* ---------- Status ---------- */

const pillTones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
};
export function Pill({ tone = 'slate', dot, children, className }) {
    return (
        <span
            className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                pillTones[tone],
                className,
            )}
        >
            {dot && <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />}
            {children}
        </span>
    );
}

export const PRIORITIES = [
    { value: 'Low', dot: 'bg-emerald-500', tone: 'green' },
    { value: 'Medium', dot: 'bg-amber-500', tone: 'amber' },
    { value: 'High', dot: 'bg-orange-500', tone: 'orange' },
    { value: 'Critical', dot: 'bg-red-500', tone: 'red' },
];
export const priorityMeta = (value) => PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[1];

export function PriorityPill({ value }) {
    const p = priorityMeta(value);
    return (
        <Pill tone={p.tone} dot={p.dot}>
            {value ?? 'Medium'}
        </Pill>
    );
}

const bannerTones = {
    info: ['border-sky-200 bg-sky-50 text-sky-900', Info],
    warning: ['border-amber-200 bg-amber-50 text-amber-900', AlertTriangle],
    success: ['border-emerald-200 bg-emerald-50 text-emerald-900', CheckCircle2],
    error: ['border-red-200 bg-red-50 text-red-900', XCircle],
};
export function Banner({ tone = 'info', icon, title, children, className }) {
    const [cls, DefaultIcon] = bannerTones[tone];
    const Icon = icon ?? DefaultIcon;
    return (
        <div role="note" className={cx('flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm', cls, className)}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className={cx('text-[13px]', title && 'mt-0.5 opacity-90')}>{children}</div>}
            </div>
        </div>
    );
}

/** Pick one of a few options, shown side by side. */
export function Segmented({ options, value, onChange, label }) {
    return (
        <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-lg bg-slate-100 p-1">
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(o.value)}
                        className={cx(
                            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40',
                            active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                        )}
                    >
                        {o.dot && <span className={cx('h-2 w-2 rounded-full', o.dot)} />}
                        {o.label ?? o.value}
                    </button>
                );
            })}
        </div>
    );
}

/** Label / value line for summary panels. */
export function SummaryLine({ label, children }) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-slate-900">{children}</dd>
        </div>
    );
}