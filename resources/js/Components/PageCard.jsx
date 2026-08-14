// Same token system as Login.jsx / AuthenticatedLayout.jsx — keep in sync.
// Source hexes: #bccad6 / #8d9db6 / #667292 / #f1e3dd
const PALETTE = {
    mint: '#f1e3dd',
    teal: '#8d9db6',
    cream: '#bccad6',
    slate: '#667292',
};

export default function PageCard({ children, className = '', title, actions }) {
    return (
        <div
            className={`rounded-xl bg-white ${className}`}
            style={{
                border: `1px solid ${PALETTE.cream}`,
                boxShadow: `0 1px 2px rgba(15,23,42,0.04), 0 8px 16px -4px ${PALETTE.slate}1a, 0 24px 48px -12px ${PALETTE.slate}26`,
            }}
        >
            {(title || actions) && (
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: `1px solid ${PALETTE.cream}80` }}
                >
                    {title && (
                        <h3 className="text-sm font-semibold" style={{ color: PALETTE.slate }}>
                            {title}
                        </h3>
                    )}
                    {actions}
                </div>
            )}
            {children}
        </div>
    );
}