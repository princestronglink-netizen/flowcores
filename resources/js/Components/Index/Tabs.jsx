import { cx } from '@/Components/ui/kit';

/** options = [[value, label, count?], ...] */
export default function Tabs({ value, onChange, options, label = 'Filter' }) {
    return (
        <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label={label}>
            {options.map(([v, text, count]) => (
                <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={value === v}
                    onClick={() => onChange(v)}
                    className={cx(
                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
                        value === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                    )}
                >
                    {text}
                    {count != null && <span className="text-xs tabular-nums text-slate-400">{count}</span>}
                </button>
            ))}
        </div>
    );
}
