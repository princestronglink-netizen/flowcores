// Put in resources/js/Components/Item/StockBadge.jsx
const STYLES = {
    out: { label: 'Out of stock', cls: 'bg-red-100 text-red-700' },
    low: { label: 'Low stock', cls: 'bg-amber-100 text-amber-700' },
    ok: { label: 'In stock', cls: 'bg-emerald-100 text-emerald-700' },
};

/** status comes from ItemVariant::stock_status ('out' | 'low' | 'ok'). */
export default function StockBadge({ status = 'ok', stock = null, showCount = true }) {
    const { label, cls } = STYLES[status] ?? STYLES.ok;

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
            {label}
            {showCount && stock !== null && <span className="opacity-70">· {stock}</span>}
        </span>
    );
}