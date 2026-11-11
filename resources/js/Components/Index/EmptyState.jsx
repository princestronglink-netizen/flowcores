export default function EmptyState({ title, hint }) {
    return (
        <div className="py-14 text-center">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
        </div>
    );
}
