import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    LayoutGrid,
    Menu,
    X,
    User,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    Bell,
    Search,
} from 'lucide-react';

const navItems = [
    { name: 'Dashboard', route: 'dashboard.index', icon: LayoutGrid },
    { name: 'Requests', route: 'requests.index', icon: LayoutGrid },
];

const LOGO_URL = '/images/flowcore-logo.png';

// Same token system as the login page — keep these two files in sync.
// Source hexes: #bccad6 / #8d9db6 / #667292 / #f1e3dd
// `deep`/`deepEdge` are derived (not in the original 4) for sidebar depth.
const PALETTE = {
    mint: '#f1e3dd',
    teal: '#8d9db6',
    cream: '#bccad6',
    slate: '#667292',
    deep: '#262b3d',
    deepEdge: '#3a4157',
};

function SidebarContent({ user, onNavigate, collapsed = false }) {
    return (
        <div
            className="relative flex h-full flex-col overflow-hidden"
            style={{
                // A saturated navy base (not black→gray) so PALETTE.teal/slate
                // actually punch through instead of reading as charcoal.
                background: `linear-gradient(180deg, #0c1626 0%, #16233a 45%, #1b2b45 100%)`,
                color: `${PALETTE.mint}cc`,
            }}
        >
            {/* Same ambient texture as the login page's dark panel */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:40px_40px]"
                aria-hidden="true"
            />
            {/* Large, vivid glow orbs at higher opacity — this is what makes
                the panel read as "blue" rather than "dark". */}
            <div
                className="pointer-events-none absolute -top-20 -left-24 h-80 w-80 rounded-full blur-3xl"
                style={{ backgroundColor: `${PALETTE.teal}66` }}
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute top-1/3 -right-28 h-96 w-96 rounded-full blur-3xl"
                style={{ backgroundColor: `${PALETTE.slate}55` }}
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full blur-3xl"
                style={{ backgroundColor: `${PALETTE.teal}4d` }}
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(to right, transparent, ${PALETTE.teal}, transparent)` }}
            />
            <div
                className="pointer-events-none absolute inset-y-0 right-0 w-px"
                style={{ background: `linear-gradient(180deg, transparent, ${PALETTE.teal}66, transparent)` }}
                aria-hidden="true"
            />

            {/* Brand */}
            <div
                className={[
                    'relative z-10 flex h-16 shrink-0 items-center',
                    collapsed ? 'justify-center px-3' : 'gap-2.5 px-5',
                ].join(' ')}
                style={{ borderBottom: `1px solid ${PALETTE.deepEdge}` }}
            >
                <Link href="/" className="flex items-center gap-2.5 overflow-hidden" onClick={onNavigate}>
                    <img
                        src={LOGO_URL}
                        alt="FlowCore"
                        className="h-7 w-7 shrink-0 object-contain"
                        style={{ filter: `drop-shadow(0 2px 8px ${PALETTE.teal}99)` }}
                    />
                    {!collapsed && (
                        <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight" style={{ color: PALETTE.mint }}>
                            FlowCore
                        </span>
                    )}
                </Link>
            </div>

            {/* Nav */}
            <nav className="relative z-10 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-5">
                {!collapsed && (
                    <p
                        className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-wider"
                        style={{ color: `${PALETTE.mint}59` }}
                    >
                        Main
                    </p>
                )}
                {navItems.map((item) => {
                    const active = route().current(item.route);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={route(item.route)}
                            onClick={onNavigate}
                            title={collapsed ? item.name : undefined}
                            className={[
                                'group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150',
                                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                            ].join(' ')}
                            style={{
                                backgroundColor: active ? `${PALETTE.teal}26` : 'transparent',
                                color: active ? PALETTE.mint : `${PALETTE.mint}80`,
                                boxShadow: active ? `inset 0 0 0 1px ${PALETTE.teal}40` : 'none',
                            }}
                            onMouseEnter={(e) => {
                                if (!active) {
                                    e.currentTarget.style.backgroundColor = `${PALETTE.deepEdge}66`;
                                    e.currentTarget.style.color = PALETTE.mint;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!active) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = `${PALETTE.mint}80`;
                                }
                            }}
                        >
                            {active && (
                                <span
                                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                                    style={{
                                        background: `linear-gradient(to bottom, ${PALETTE.teal}, ${PALETTE.slate})`,
                                        boxShadow: `0 0 10px ${PALETTE.teal}`,
                                    }}
                                />
                            )}
                            <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
                                style={{
                                    background: active
                                        ? `linear-gradient(to bottom right, ${PALETTE.teal}40, ${PALETTE.slate}1a)`
                                        : undefined,
                                }}
                            >
                                <Icon
                                    className="h-[17px] w-[17px] shrink-0"
                                    style={{ color: active ? PALETTE.teal : `${PALETTE.mint}66` }}
                                />
                            </span>
                            {!collapsed && <span className="truncate">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* User footer */}
            <div className="relative z-10 p-3" style={{ borderTop: `1px solid ${PALETTE.deepEdge}` }}>
                <div
                    className={[
                        'flex items-center rounded-lg py-2',
                        collapsed ? 'justify-center px-0' : 'gap-3 px-2.5',
                    ].join(' ')}
                >
                    <span
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{
                            background: `linear-gradient(to bottom right, ${PALETTE.teal}, ${PALETTE.slate})`,
                            boxShadow: `0 0 0 2px ${PALETTE.deepEdge}`,
                        }}
                    >
                        {user.name?.charAt(0)?.toUpperCase()}
                        <span
                            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: '#5fb98c', boxShadow: `0 0 0 2px ${PALETTE.deep}` }}
                        />
                    </span>
                    {!collapsed && (
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium" style={{ color: PALETTE.mint }}>
                                {user.name}
                            </span>
                            <span className="block truncate text-xs" style={{ color: `${PALETTE.mint}59` }}>
                                {user.email}
                            </span>
                        </span>
                    )}
                </div>

                {!collapsed && (
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <Link
                            href={route('profile.edit')}
                            onClick={onNavigate}
                            className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-all"
                            style={{
                                background: `linear-gradient(to bottom, ${PALETTE.teal}, ${PALETTE.slate})`,
                                boxShadow: `0 2px 0 0 ${PALETTE.deepEdge}`,
                            }}
                        >
                            <User className="h-3.5 w-3.5" />
                            Profile
                        </Link>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                            style={{ border: `1px solid ${PALETTE.deepEdge}`, color: `${PALETTE.mint}80` }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#8a4a4a';
                                e.currentTarget.style.backgroundColor = 'rgba(127,29,29,0.25)';
                                e.currentTarget.style.color = '#f3b8b8';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = PALETTE.deepEdge;
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = `${PALETTE.mint}80`;
                            }}
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Log Out
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AuthenticatedLayout({ header, children, fullWidth = true }) {
    const user = usePage().props.auth.user;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="min-h-screen" style={{ backgroundColor: `${PALETTE.cream}33` }}>
            {/* Desktop sidebar — fixed */}
            <aside
                className={[
                    'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col transition-[width] duration-200 ease-in-out',
                    collapsed ? 'lg:w-[76px]' : 'lg:w-64',
                ].join(' ')}
                style={{ borderRight: `1px solid ${PALETTE.deepEdge}` }}
            >
                <SidebarContent user={user} collapsed={collapsed} />
            </aside>

            {/* Mobile sidebar — slide-over */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="fixed inset-0 backdrop-blur-sm"
                        style={{ backgroundColor: '#0c1626e6' }}
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 w-72 shadow-2xl">
                        <div className="relative flex h-full flex-col">
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="absolute right-3 top-3 z-10 rounded-md p-1.5 transition-colors"
                                style={{ color: `${PALETTE.mint}80` }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = PALETTE.deepEdge;
                                    e.currentTarget.style.color = PALETTE.mint;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = `${PALETTE.mint}80`;
                                }}
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Main column */}
            <div
                className={collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}
                style={{ transition: 'padding-left 200ms ease-in-out' }}
            >
                {/* Gradient accent line, same one used at the top of the login form panel */}
                <div
                    className="h-[3px]"
                    style={{ background: `linear-gradient(to right, ${PALETTE.slate}, ${PALETTE.teal}, ${PALETTE.slate})` }}
                    aria-hidden="true"
                />

                {/* Top bar */}
                <div
                    className="sticky top-0 z-30 flex h-16 items-center gap-3 px-4 backdrop-blur-md sm:px-6 lg:px-8"
                    style={{
                        borderBottom: `1px solid ${PALETTE.cream}`,
                        background: `linear-gradient(180deg, ${PALETTE.mint}f2 0%, rgba(255,255,255,0.9) 100%)`,
                    }}
                >
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="rounded-md p-2 transition-colors lg:hidden"
                        style={{ color: PALETTE.slate }}
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <button
                        onClick={() => setCollapsed((c) => !c)}
                        className="hidden rounded-md p-2 transition-colors lg:flex"
                        style={{ color: `${PALETTE.slate}99` }}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `${PALETTE.cream}80`;
                            e.currentTarget.style.color = PALETTE.slate;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = `${PALETTE.slate}99`;
                        }}
                    >
                        {collapsed ? (
                            <PanelLeftOpen className="h-[18px] w-[18px]" />
                        ) : (
                            <PanelLeftClose className="h-[18px] w-[18px]" />
                        )}
                    </button>

                    <div className="h-6 w-px" style={{ backgroundColor: PALETTE.cream }} />

                    {header ? (
                        <div className="min-w-0 flex-1">{header}</div>
                    ) : (
                        <div className="flex-1" />
                    )}

                    <div className="hidden items-center gap-1 md:flex">
                        <button
                            className="rounded-lg p-2 transition-colors"
                            style={{ color: `${PALETTE.slate}99` }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${PALETTE.cream}80`;
                                e.currentTarget.style.color = PALETTE.slate;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = `${PALETTE.slate}99`;
                            }}
                        >
                            <Search className="h-[18px] w-[18px]" />
                        </button>
                        <button
                            className="relative rounded-lg p-2 transition-colors"
                            style={{ color: `${PALETTE.slate}99` }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${PALETTE.cream}80`;
                                e.currentTarget.style.color = PALETTE.slate;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = `${PALETTE.slate}99`;
                            }}
                        >
                            <Bell className="h-[18px] w-[18px]" />
                            <span
                                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: PALETTE.teal, boxShadow: '0 0 0 2px white' }}
                            />
                        </button>
                    </div>
                </div>

                {/* Page content — full-bleed, no centered max-w box eating up space.
                    On very large monitors (2xl+) it caps out so lines don't stretch
                    unreadably wide, but on normal/laptop screens it uses the full area. */}
                <main className="relative">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.5]"
                        style={{
                            backgroundImage: `radial-gradient(${PALETTE.slate}14 1px, transparent 1px)`,
                            backgroundSize: '22px 22px',
                        }}
                        aria-hidden="true"
                    />
                    <div
                        className={[
                            'relative px-4 py-6 sm:px-6 lg:px-8',
                            fullWidth ? '2xl:max-w-[1920px] 2xl:mx-auto' : 'max-w-7xl mx-auto',
                        ].join(' ')}
                    >
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}