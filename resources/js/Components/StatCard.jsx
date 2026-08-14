export default function StatCard({ label, value, change, trend = 'up' }) {
    return (
        <div
            className="rounded-xl border border-slate-200 bg-white p-5"
            style={{
                boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 10px -4px rgba(15,23,42,0.06)',
            }}
        >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <div className="mt-2 flex items-end justify-between">
                <span className="text-2xl font-semibold tracking-tight text-slate-900">{value}</span>
                {change && (
                    <span
                        className={[
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            trend === 'up'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-red-50 text-red-600',
                        ].join(' ')}
                    >
                        {change}
                    </span>
                )}
            </div>
        </div>
    );
}