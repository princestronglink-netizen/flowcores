import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CheckCircle2, History, Package, Truck, Undo2, XCircle } from 'lucide-react';
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

/** Name, client, priority and amount. Used on the card and on the drag overlay. */
export function CardBody({ item }) {
    // Quotation and PO cards have no priority: they show a small kind tag instead.
    const p = item.priority ? priorityMeta(item.priority) : null;
    const lines = item.items?.length ?? 0;
    return (
        <>
            <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{item.name}</p>
                {p ? (
                    <span className="mt-1 flex shrink-0 items-center gap-1.5 text-xs text-slate-500" title={`${item.priority} priority`}>
                        <span className={cx('h-2 w-2 rounded-full', p.dot)} />
                        {item.priority}
                    </span>
                ) : (
                    item.kind && (
                        <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                            {item.kind === 'quotation' ? 'Quote' : 'PO'}
                        </span>
                    )
                )}
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">{item.client?.client_name ?? 'No client'}</p>
            <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold tabular-nums text-slate-900">{currency(item.total)}</span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Package className="h-3.5 w-3.5" />
                    {lines} {lines === 1 ? 'item' : 'items'}
                </span>
            </div>
        </>
    );
}

export function OverlayCard({ item }) {
    return (
        <div className="w-72 rotate-1 rounded-lg border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5">
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
        <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
                <span className={cx('font-medium', state.cls)}>{state.text}</span>
                <span className="tabular-nums text-slate-500">
                    {delivered}/{ordered}
                </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
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
            className={cx(
                'touch-none cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition',
                'hover:border-slate-300 hover:shadow active:cursor-grabbing',
                isDragging && 'opacity-30',
            )}
        >
            <CardBody item={item} />

            {showDelivery && isTransaction && (
                <>
                    <DeliveryProgress ordered={ordered} delivered={delivered} />

                    {(canDeliver || delivered > 0 || hasHistory) && (
                        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                            {canDeliver && delivered < ordered && (
                                <button
                                    type="button"
                                    onPointerDown={stop}
                                    onClick={() => onDeliveryAction(item, 'deliver')}
                                    className={cx(action, 'flex-1 bg-[#667292] text-white hover:bg-[#3a4157]')}
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
}) {
    const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}`, disabled });

    return (
        <div
            ref={setNodeRef}
            className={cx(
                'flex w-[85vw] shrink-0 snap-start flex-col overflow-hidden rounded-xl bg-slate-100/80 ring-1 ring-slate-200 transition',
                'sm:w-auto sm:min-w-[17rem] sm:flex-1 sm:shrink sm:basis-0',
                isOver && 'bg-[#667292]/10 ring-2 ring-[#667292]',
                disabled && 'opacity-40',
            )}
        >
            <div className="flex shrink-0 items-center justify-between px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={cx('size-2.5 shrink-0 rounded-full', accent.dot)} />
                    <h3 className="truncate text-sm font-semibold text-slate-800">{stage.stage_name}</h3>
                    {stage.deducts_stock && (
                        <span title="Deliveries are recorded in this stage">
                            <Truck className="size-3.5 shrink-0 text-slate-400" />
                        </span>
                    )}
                </div>
                <span className={cx('ml-2 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', accent.badge)}>
                    {items.length}
                </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pb-2.5 [scrollbar-width:thin]">
                {items.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-8 text-xs text-slate-400">
                        {disabled ? 'Can’t move here' : 'No cards'}
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
        hint: 'Drag here from the final stage',
        Icon: CheckCircle2,
        base: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
        over: 'border-emerald-500 bg-emerald-100',
    },
    lost: {
        label: 'Lost deal',
        hint: 'Drag here from any stage',
        Icon: XCircle,
        base: 'border-red-200 bg-red-50/60 text-red-700',
        over: 'border-red-500 bg-red-100',
    },
};

export function DealDropZone({ variant, count = 0, disabled = false }) {
    const { label, hint, Icon, base, over } = dropZones[variant];
    const { setNodeRef, isOver } = useDroppable({ id: variant, disabled });

    return (
        <div
            ref={setNodeRef}
            className={cx(
                'flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition',
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