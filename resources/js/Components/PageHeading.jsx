// Same token system as Login.jsx / AuthenticatedLayout.jsx / PageCard.jsx.
// Source hexes: #bccad6 / #8d9db6 / #667292 / #f1e3dd
const PALETTE = {
    mint: '#f1e3dd',
    teal: '#8d9db6',
    cream: '#bccad6',
    slate: '#667292',
};

export default function PageHeading({ title, subtitle, actions }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
                <h2
                    className="truncate text-lg font-semibold leading-tight tracking-tight"
                    style={{ color: '#2c3444' }}
                >
                    {title}
                </h2>
                {subtitle && (
                    <p className="truncate text-sm" style={{ color: PALETTE.slate }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    );
}