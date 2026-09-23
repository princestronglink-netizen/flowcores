// Same token system as Login.jsx / AuthenticatedLayout.jsx — keep in sync.
// Source hexes: #bccad6 / #8d9db6 / #667292 / #f1e3dd
const PALETTE = {
    mint: '#f1e3dd',
    teal: '#8d9db6',
    cream: '#bccad6',
    slate: '#667292',
};

export default function PageCard({ children, className = '', title, actions, toolbar }) {
    return (
        <section className={`flex min-h-full w-full flex-1 flex-col bg-white ${className}`}>
            {(title || actions) && (
                <header
                    className="flex shrink-0 items-center justify-between px-6 py-4"
                    style={{ borderBottom: `1px solid ${PALETTE.cream}` }}
                >
                    {title && (
                        <h3 className="text-sm font-semibold" style={{ color: PALETTE.slate }}>
                            {title}
                        </h3>
                    )}
                    {actions}
                </header>
            )}

            {/* Optional toolbar slot: sits between the header and the body.
                The toolbar draws its own bottom border. */}
            {toolbar && <div className="shrink-0">{toolbar}</div>}

            <div className="flex min-w-0 flex-1 flex-col justify-start">{children}</div>
        </section>
    );
}