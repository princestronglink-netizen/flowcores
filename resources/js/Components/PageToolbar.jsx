// Same token system as Login.jsx / AuthenticatedLayout.jsx / PageCard.jsx — keep in sync.
// Source hexes: #bccad6 / #8d9db6 / #667292 / #f1e3dd
const PALETTE = {
    mint: '#f1e3dd',
    teal: '#8d9db6',
    cream: '#bccad6',
    slate: '#667292',
};

/**
 * Generic toolbar for any page. Pass it to <PageCard toolbar={...} />.
 *
 *   <PageToolbar end={<ToolbarCount shown={12} total={40} singular="user" plural="users" />}>
 *       <ToolbarSearch value={q} onChange={setQ} />
 *       <ToolbarSegmented value={s} onChange={setS} options={[...]} />
 *   </PageToolbar>
 *
 * children -> left side, end -> right side. It owns no state.
 */
export default function PageToolbar({ children, end, className = '' }) {
    return (
        <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3 ${className}`}
            style={{
                backgroundColor: `${PALETTE.mint}55`,
                borderBottom: `1px solid ${PALETTE.cream}`,
            }}
        >
            {children}
            {end && <div className="ml-auto flex items-center gap-4">{end}</div>}
        </div>
    );
}

/* ---------------------------------- Search --------------------------------- */

export function ToolbarSearch({
    value = '',
    onChange,
    placeholder = 'Search',
    label,
    className = 'sm:w-64',
}) {
    return (
        <label
            className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-md bg-white px-3 text-sm transition focus-within:ring-2 focus-within:ring-[#667292]/40 ${className}`}
            style={{ border: `1px solid ${PALETTE.cream}`, color: PALETTE.teal }}
        >
            <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="h-4 w-4 shrink-0"
            >
                <circle cx="9" cy="9" r="5.5" />
                <path d="M13.5 13.5 17 17" />
            </svg>
            <input
                type="search"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
                aria-label={label ?? placeholder}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-[#8d9db6] focus:outline-none focus:ring-0"
                style={{ color: PALETTE.slate }}
            />
        </label>
    );
}

/* ------------------------- Segmented filter (few options) ------------------------ */

/** options: [{ value, label }] — use value '' for an "All" option. */
export function ToolbarSegmented({ value, onChange, options, label = 'Filter' }) {
    return (
        <div
            role="group"
            aria-label={label}
            className="flex items-center gap-1 rounded-md bg-white p-0.5"
            style={{ border: `1px solid ${PALETTE.cream}` }}
        >
            {options.map((o) => {
                const active = value === o.value;
                return (
                    <button
                        key={String(o.value) || 'all'}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange?.(o.value)}
                        className={`h-8 rounded px-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/50 ${
                            active ? '' : 'hover:bg-[#bccad6]/30'
                        }`}
                        style={
                            active
                                ? { backgroundColor: PALETTE.slate, color: '#fff' }
                                : { color: PALETTE.slate }
                        }
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* --------------------------- Select (many options) --------------------------- */

export function ToolbarSelect({ value, onChange, options, label = 'Filter' }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            aria-label={label}
            className="h-9 rounded-md border-0 bg-white py-0 pl-3 pr-8 text-sm focus:ring-2 focus:ring-[#667292]/40"
            style={{ border: `1px solid ${PALETTE.cream}`, color: PALETTE.slate }}
        >
            {options.map((o) => (
                <option key={String(o.value)} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}

/* ---------------------------------- Count ---------------------------------- */

/** Shows "40 items", or "12 of 40 items" when `shown` differs from `total`. */
export function ToolbarCount({ shown, total, singular = 'item', plural = 'items' }) {
    const noun = total === 1 ? singular : plural;
    return (
        <p aria-live="polite" className="text-sm tabular-nums" style={{ color: PALETTE.teal }}>
            {shown !== undefined && shown !== total
                ? `${shown} of ${total} ${noun}`
                : `${total} ${noun}`}
        </p>
    );
}

/* ------------------------------ Text button ------------------------------ */

/** Quiet text action, e.g. "Clear filters". For primary actions use the card's `actions`. */
export function ToolbarButton({ children, className = '', ...props }) {
    return (
        <button
            type="button"
            {...props}
            className={`rounded text-sm font-medium underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/50 ${className}`}
            style={{ color: PALETTE.slate }}
        >
            {children}
        </button>
    );
}