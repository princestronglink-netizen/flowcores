import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CheckCircle2, GripVertical, History, Inbox, Truck, Undo2, XCircle } from 'lucide-react';
import { cx, priorityMeta } from '@/Components/ui/kit';

/* Visual parts of the pipeline board. Drag/drop and move logic stays in Pages/Pipeline/Index.jsx. */

// `card` is kept (empty) so older code that reads accent.card keeps working.
export const stageAccents = [
    { dot: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700', card: '' },
    { dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700', card: '' },
    { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', card: '' },
    { dot: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700', card: '' },
    { dot: 'bg-fuchsia-500', badge: 'bg-fuchsia-100 text-fuchsia-700', card: '' },
];

export const currency = (value) =>
    value == null ? '—' : Number(value).toLocaleString(undefined, { style: 'currency', currency: 'PHP' });

/** Unique key per card: a quotation and a transaction can share the same id. */
export const cardKey = (item) => `${item.kind ?? 'transaction'}-${item.id}`;

/** { ordered, delivered } across all lines of a transaction. */
export function deliveryTotals(transaction) {
    const lines = transaction?.items ?? [];
    return {
        ordered: lines.reduce((s, l) => s + Number(l.quantity ?? 0), 0),
        delivered: lines.reduce((s, l) => s + Number(l.delivered_quantity ?? 0), 0),
    };
}

const initials = (name) =>
    String(name ?? '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || '?';

/** Small coloured chip. */
function Chip({ children, className }) {
    return (
        <span className={cx('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none', className)}>
            {children}
        </span>
    );
}

/** The documents the pipeline generated, shown as tiny chips (only when they exist). */
function DocChips({ item }) {
    const cpos = item.client_purchase_orders ?? [];
    const draftPo = cpos.some((c) => c.status === 'draft');
    if (!item.quotation_number && cpos.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-1">
            {item.quotation_number && (
                <Chip className="bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200">{item.quotation_number}</Chip>
            )}
            {cpos.length > 0 && (
                <Chip
                    className={
                        draftPo
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                    }
                >
                    {draftPo ? 'PO to confirm' : 'PO confirmed'}
                </Chip>
            )}
        </div>
    );
}

/**
 * Card content: name, client + contact, amount. Used on the card and on the drag overlay.
 * Priority shows as the coloured bar on the left edge; High / Critical also get a label.
 */
export function CardBody({ item }) {
    const p = item.priority ? priorityMeta(item.priority) : null;
    const urgent = item.priority === 'High' || item.priority === 'Critical';
    const clientName = item.client?.client_name;
    const contact = item.contact_person?.contact_person;

    return (
        <>
            <span
                className={cx('absolute inset-y-0 left-0 w-1', p ? p.dot : 'bg-slate-300')}
                title={item.priority ? `${item.priority} priority` : undefined}
                aria-hidden="true"
            />

            <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{item.name}</p>
                {urgent && (
                    <Chip
                        className={
                            item.priority === 'Critical'
                                ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
                                : 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200'
                        }
                    >
                        {item.priority}
                    </Chip>
                )}
                {!p && item.kind && (
                    <Chip className="bg-slate-100 uppercase text-slate-500">{item.kind === 'quotation' ? 'Quote' : 'PO'}</Chip>
                )}
            </div>

            <div className="mt-2 flex items-center gap-2">
                <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#eef1f5] text-[10px] font-semibold text-[#667292]"
                    aria-hidden="true"
                >
                    {initials(clientName)}
                </span>
                <div className="min-w-0 leading-tight">
                    <p className="truncate text-xs font-medium text-slate-700">{clientName ?? 'No client'}</p>
                    {contact && <p className="truncate text-[11px] text-slate-400">{contact}</p>}
                </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold tabular-nums text-slate-900">{currency(item.total)}</span>
                <DocChips item={item} />
            </div>
        </>
    );
}

export function OverlayCard({ item }) {
    return (
        <div className="relative w-72 rotate-1 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 pl-4 shadow-xl ring-1 ring-black/5">
            <CardBody item={item} />
        </div>
    );
}

function DeliveryProgress({ ordered, delivered }) {
    const pct = ordered ? Math.min(100, Math.round((delivered / ordered) * 100)) : 0;
    const state =
        delivered <= 0
            ? { text: 'Not delivered', cls: 'text-slate-500', bar: 'bg-slate-300' }
            : delivered < ordered
              ? { text: 'Partially delivered', cls: 'text-amber-700', bar: 'bg-amber-500' }
              : { text: 'Delivered', cls: 'text-emerald-700', bar: 'bg-emerald-500' };

    return (
        <div className="mt-3 border-t border-slate-100 pt-2.5">
            <div className="flex items-center justify-between text-[11px]">
                <span className={cx('font-medium', state.cls)}>{state.text}</span>
                <span className="tabular-nums text-slate-500">
                    {delivered}/{ordered}
                </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                <div className={cx('h-full rounded-full transition-all', state.bar)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

/**
 * showDelivery  → show progress and actions (delivery stage and every stage after it)
 * canDeliver    → only in the delivery stage itself
 * onOpen        → click on the card (not on its buttons, not after a drag) opens the detail modal
 * Delivery UI is only for transactions; quotation and PO cards never show it.
 */
function TransactionCard({ item, showDelivery = false, canDeliver = false, onDeliveryAction, onOpen }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: cardKey(item) });
    const isTransaction = !item.kind;

    const { ordered, delivered } = deliveryTotals(item);
    const stop = (e) => e.stopPropagation(); // don't start a drag from the buttons
    const hasHistory = (item.deliveries ?? []).length > 0;

    const action =
        'flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/40';

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={(e) => {
                if (isDragging) return;
                if (e.target.closest('button')) return; // Deliver / Return / History buttons
                onOpen?.(item);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target === e.currentTarget) onOpen?.(item);
            }}
            className={cx(
                'group relative touch-none cursor-grab overflow-hidden rounded-lg border border-slate-200 bg-white p-3 pl-4 shadow-sm transition',
                'hover:-translate-y-px hover:border-slate-300 hover:shadow-md active:cursor-grabbing',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#667292]/50',
                isDragging && 'opacity-30',
            )}
        >
            <GripVertical className="pointer-events-none absolute right-1 top-1/2 size-4 -translate-y-1/2 text-slate-300 opacity-0 transition group-hover:opacity-100" />

            <CardBody item={item} />

            {showDelivery && isTransaction && (
                <>
                    <DeliveryProgress ordered={ordered} delivered={delivered} />

                    {(canDeliver || delivered > 0 || hasHistory) && (
                        <div className="mt-2.5 flex gap-2">
                            {canDeliver && delivered < ordered && (
                                <button
                                    type="button"
                                    onPointerDown={stop}
                                    onClick={() => onDeliveryAction(item, 'deliver')}
                                    className={cx(action, 'flex-1 bg-[#667292] text-white shadow-sm hover:bg-[#3a4157]')}
                                >
                                    <Truck className="size-3.5" />
                                    {delivered > 0 ? 'Deliver more' : 'Deliver'}
                                </button>
                            )}
                            {delivered > 0 && (
                                <button
                                    type="button"
                                    onPointerDown={stop}
                                    onClick={() => onDeliveryAction(item, 'return')}
                                    className={cx(action, 'flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50')}
                                >
                                    <Undo2 className="size-3.5" />
                                    Return
                                </button>
                            )}
                            {hasHistory && (
                                <button
                                    type="button"
                                    onPointerDown={stop}
                                    onClick={() => onDeliveryAction(item, 'history')}
                                    aria-label="Delivery history"
                                    title="Delivery history"
                                    className={cx(action, 'border border-slate-200 text-slate-500 hover:bg-slate-50')}
                                >
                                    <History className="size-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export function StageColumn({
    stage,
    items = [],
    accent,
    disabled = false,
    showDelivery = false,
    onDeliveryAction,
    onOpen,
    emptyText = 'No cards here',
}) {
    const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}`, disabled });
    const stageTotal = items.reduce((s, i) => s + Number(i.total ?? 0), 0);

    return (
        <div
            ref={setNodeRef}
            className={cx(
                'flex w-[85vw] shrink-0 snap-start flex-col overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200 transition',
                'sm:w-auto sm:min-w-[17rem] sm:flex-1 sm:shrink sm:basis-0',
                isOver && 'bg-[#667292]/10 ring-2 ring-[#667292]',
                disabled && 'opacity-40',
            )}
        >
            {/* thin accent line on top of every column */}
            <div className={cx('h-1 shrink-0', accent.dot)} />

            <div className="shrink-0 px-3.5 pb-2 pt-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-800">{stage.stage_name}</h3>
                        {stage.deducts_stock && (
                            <span title="Deliveries are recorded in this stage">
                                <Truck className="size-3.5 shrink-0 text-slate-400" />
                            </span>
                        )}
                    </div>
                    <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', accent.badge)}>
                        {items.length}
                    </span>
                </div>
                <p className="mt-0.5 text-xs tabular-nums text-slate-400">{items.length > 0 ? currency(stageTotal) : '—'}</p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5 [scrollbar-width:thin]">
                {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-200 py-10 text-xs text-slate-400">
                        <Inbox className="size-5" />
                        {disabled ? 'Can’t move here' : emptyText}
                    </div>
                ) : (
                    items.map((item) => (
                        <TransactionCard
                            key={cardKey(item)}
                            item={item}
                            showDelivery={showDelivery}
                            canDeliver={Boolean(stage.deducts_stock)}
                            onDeliveryAction={onDeliveryAction}
                            onOpen={onOpen}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

const dropZones = {
    done: {
        label: 'Done deal',
        hint: 'Drop here from the final stage',
        Icon: CheckCircle2,
        base: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
        over: 'border-emerald-500 bg-emerald-100 scale-[1.01]',
    },
    lost: {
        label: 'Lost deal',
        hint: 'Drop here from any stage',
        Icon: XCircle,
        base: 'border-red-200 bg-red-50/60 text-red-700',
        over: 'border-red-500 bg-red-100 scale-[1.01]',
    },
};

export function DealDropZone({ variant, count = 0, disabled = false }) {
    const { label, hint, Icon, base, over } = dropZones[variant];
    const { setNodeRef, isOver } = useDroppable({ id: variant, disabled });

    return (
        <div
            ref={setNodeRef}
            className={cx(
                'flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-2.5 transition',
                isOver ? over : base,
                disabled && 'opacity-40',
            )}
        >
            <Icon className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{label}</p>
                <p className="truncate text-xs opacity-75">{hint}</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold tabular-nums shadow-sm">{count}</span>
        </div>
    );
}