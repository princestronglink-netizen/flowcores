import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    Building2,
    ClipboardList,
    FileText,
    GitBranch,
    LayoutGrid,
    LogOut,
    Menu,
    Package,
    PackagePlus,
    PanelLeftClose,
    PanelLeftOpen,
    Receipt,
    ScrollText,
    ShieldCheck,
    Tags,
    User,
    Users,
    X,
} from 'lucide-react';

const LOGO_URL = '/images/flowcore-logo.png';
const STORAGE_KEY = 'flowcore:sidebar-collapsed';

// `needs`: a key of auth.can that must be true for the link to show.
const navGroups = [
    {
        label: 'Workspace',
        items: [
            { name: 'Dashboard', route: 'dashboard', icon: LayoutGrid },
            { name: 'Quotations', route: 'quotations.index', icon: FileText, needs: 'view_quotations' },
            { name: 'Client POs', route: 'client-purchase-orders.index', icon: ClipboardList, needs: 'view_client_pos' },
            { name: 'Transactions', route: 'transactions.index', icon: Receipt, needs: 'view_transactions' },
            { name: 'Pipelines', route: 'pipelines.index', icon: GitBranch, needs: 'view_pipeline' },
            { name: 'Clients', route: 'clients.index', icon: Building2, needs: 'view_clients' },
        ],
    },
    {
        label: 'Inventory',
        items: [
            { name: 'Items', route: 'items.index', icon: Package, needs: 'view_items' },
            { name: 'Categories', route: 'categories.index', icon: Tags, needs: 'view_categories' },
            { name: 'Stock in', route: 'stock-in.index', icon: PackagePlus, needs: 'stock_in' },
            { name: 'Stock ledger', route: 'stock-movements.index', icon: ScrollText, needs: 'view_stock_ledger' },
        ],
    },
    {
        label: 'Administration',
        items: [
            { name: 'Users', route: 'users.index', icon: Users, needs: 'manage_users' },
            { name: 'Roles & Permissions', route: 'roles.index', icon: ShieldCheck, needs: 'manage_roles' },
        ],
    },
];

const cx = (...a) => a.filter(Boolean).join(' ');

/** Drop the links this user may not use, then drop groups left empty. */
function visibleGroups(can) {
    const allowed = (item) => !item.needs || Boolean(can?.[item.needs]);

    return navGroups
        .map((group) => ({ ...group, items: group.items.filter(allowed) }))
        .filter((group) => group.items.length > 0);
}

function SidebarContent({ user, can, onNavigate, collapsed = false }) {
    const groups = visibleGroups(can);

    return (
        <div className="flex h-full flex-col bg-[#0f1a2e] text-slate-300">
            {/* Brand */}
            <div className={cx('flex h-14 shrink-0 items-center border-b border-white/10', collapsed ? 'justify-center' : 'px-5')}>
                <Link href={route('dashboard')} onClick={onNavigate} className="flex items-center gap-2.5 overflow-hidden">
                    <img src={LOGO_URL} alt="FlowCore" className="h-7 w-7 shrink-0 object-contain" />
                    {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-white">FlowCoreS</span>}
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 [scrollbar-width:thin]">
                {groups.map((group, gi) => (
                    <div key={group.label} className={cx(gi > 0 && 'mt-6')}>
                        {collapsed ? (
                            gi > 0 && <div className="mx-3 mb-3 h-px bg-white/10" />
                        ) : (
                            <p className="mb-1.5 px-3 text-xs font-medium text-slate-500">{group.label}</p>
                        )}
                        <ul className="space-y-0.5">
                            {group.items.map((item) => {
                                const active =
                                    route().current(item.route) || route().current(item.route.replace('.index', '.*'));
                                const Icon = item.icon;
                                return (
                                    <li key={item.name}>
                                        <Link
                                            href={route(item.route)}
                                            onClick={onNavigate}
                                            title={collapsed ? item.name : undefined}
                                            aria-label={collapsed ? item.name : undefined}
                                            aria-current={active ? 'page' : undefined}
                                            className={cx(
                                                'relative flex items-center rounded-lg text-sm font-medium transition-colors',
                                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8d9db6]',
                                                collapsed ? 'h-10 justify-center' : 'h-9 gap-3 px-3',
                                                active
                                                    ? 'bg-white/10 text-white'
                                                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
                                            )}
                                        >
                                            {active && (
                                                <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-[#8d9db6]" />
                                            )}
                                            <Icon className={cx('h-[18px] w-[18px] shrink-0', active && 'text-[#a9b8d0]')} />
                                            {!collapsed && <span className="truncate">{item.name}</span>}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* User */}
            <div className="shrink-0 border-t border-white/10 p-3">
                <div className={cx('flex items-center', collapsed ? 'flex-col gap-2' : 'gap-3 px-1')}>
                    <Link
                        href={route('profile.edit')}
                        onClick={onNavigate}
                        title={collapsed ? `${user.name} · Profile` : 'Profile'}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white/5"
                    >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#667292] text-xs font-semibold text-white">
                            {user.name?.charAt(0)?.toUpperCase() ?? <User className="h-4 w-4" />}
                        </span>
                        {!collapsed && (
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium leading-tight text-white">{user.name}</span>
                                <span className="block truncate text-xs text-slate-500">{user.email}</span>
                            </span>
                        )}
                    </Link>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        aria-label="Log out"
                        title="Log out"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                    >
                        <LogOut className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

/**
 * `fullWidth` (default true): content is edge to edge with no padding, so cards and forms control their own spacing.
 * `fullWidth={false}`: padded, centered container.
 */
export default function AuthenticatedLayout({ header, children, fullWidth = true }) {
    const { user, can } = usePage().props.auth;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === '1';
        } catch {
            return false;
        }
    });

    const toggleCollapsed = () =>
        setCollapsed((c) => {
            const next = !c;
            try {
                localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
            } catch {
                /* storage unavailable */
            }
            return next;
        });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Desktop sidebar */}
            <aside
                className={cx(
                    'fixed inset-y-0 left-0 z-40 hidden border-r border-white/5 transition-[width] duration-200 ease-in-out lg:block',
                    collapsed ? 'w-[72px]' : 'w-60',
                )}
            >
                <SidebarContent user={user} can={can} collapsed={collapsed} />
            </aside>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-72 shadow-2xl">
                        <button
                            onClick={() => setMobileOpen(false)}
                            aria-label="Close menu"
                            className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <SidebarContent user={user} can={can} onNavigate={() => setMobileOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main column */}
            <div
                className={cx(
                    'flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ease-in-out',
                    collapsed ? 'lg:pl-[72px]' : 'lg:pl-60',
                )}
            >
                <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
                    <button
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open menu"
                        className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <button
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className="hidden rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:flex"
                    >
                        {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
                    </button>
                    <div className="h-5 w-px bg-slate-200" />
                    <div className="min-w-0 flex-1">{header}</div>
                </header>

                <main className="flex min-w-0 flex-1 flex-col">
                    <div
                        className={cx(
                            'flex min-w-0 flex-1 flex-col',
                            !fullWidth && 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8',
                        )}
                    >
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}