import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import PipelineModal from '@/Components/Pipeline/PipelineModal';
import DealResultOverlay from '@/Components/Pipeline/DealResultOverlay';
import StockToast from '@/Components/Pipeline/StockToast';
import DeliveryModal from '@/Components/Pipeline/DeliveryModal';
import MoveConfirmModal from '@/Components/Pipeline/MoveConfirmModal';
import CardDetailModal from '@/Components/Pipeline/CardDetailModal';
import BoardToolbar from '@/Components/Pipeline/BoardToolbar';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import { StageColumn, DealDropZone, OverlayCard, stageAccents, deliveryTotals, cardKey } from '@/Components/Pipeline/Board';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import { Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

const DEFAULT_WIN_MESSAGE = '🎉 Great job! This deal is officially closed-won!';
const DEFAULT_LOSE_MESSAGE = "This one didn't close, but the next one will 💪";

function resolveResultMessage(transaction, status) {
    if (status === 'won') {
        return transaction.winning_message?.trim() ? transaction.winning_message : DEFAULT_WIN_MESSAGE;
    }
    return DEFAULT_LOSE_MESSAGE;
}

// Per card kind: which routes to call, and which status word means "won" / "lost".
// Transaction cards have no `kind`; quotation and PO cards do.
// (Only transaction cards exist on the board now, so the other kinds are never hit.)
const KINDS = {
    transaction: { stage: 'transactions.updateStage', status: 'transactions.updateStatus', won: 'won', lost: 'lost' },
    purchase_order: { stage: 'purchase-orders.updateStage', status: 'purchase-orders.updateStatus', won: 'received', lost: 'cancelled' },
};
const kindOf = (t) => KINDS[t?.kind] ?? KINDS.transaction;
const isTransaction = (t) => !t?.kind;

// `pipelines` defaults to [] so the page shows "No pipeline yet" instead of crashing
// when the prop is missing (for example if another route renders this page without it).
export default function Index({ pipelines = [] }) {
    const { flash } = usePage().props;

    const [isOpen, setIsOpen] = useState(false);
    const [editingPipeline, setEditingPipeline] = useState(null);
    const [deletingPipeline, setDeletingPipeline] = useState(null);
    const [pipelineList, setPipelineList] = useState(pipelines ?? []);
    const [pendingMove, setPendingMove] = useState(null);
    const [isMoving, setIsMoving] = useState(false);

    // { id, mode: 'deliver' | 'return' | 'history' }. Transactions only. Only the id is stored so the modal reads fresh data.
    const [delivery, setDelivery] = useState(null);

    // cardKey of the card whose details are open. Only the key is stored so the modal reads fresh data.
    const [viewingKey, setViewingKey] = useState(null);

    const [resultEffect, setResultEffect] = useState(null);

    // Toasts
    const [stockMessage, setStockMessage] = useState(null);
    const [stockWarning, setStockWarning] = useState(null);
    const [stockReturned, setStockReturned] = useState(null);
    const [notice, setNotice] = useState(null); // "you can't do that" messages

    const [activeItem, setActiveItem] = useState(null);
    const [activeStageId, setActiveStageId] = useState(null);

    // Board search / filter (display only: moves still use the full, unfiltered data)
    const [query, setQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    const matchesFilter = (card) => {
        if (priorityFilter && card.priority !== priorityFilter) return false;
        const term = query.trim().toLowerCase();
        if (!term) return true;
        return [card.name, card.client?.client_name, card.contact_person?.contact_person, card.quotation_number]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term);
    };

    useEffect(() => {
        setPipelineList(pipelines ?? []);
    }, [pipelines]);

    useEffect(() => {
        if (flash?.stock) setStockMessage(flash.stock);
    }, [flash?.stock]);

    useEffect(() => {
        if (flash?.stock_warning) setStockWarning(flash.stock_warning);
    }, [flash?.stock_warning]);

    useEffect(() => {
        if (flash?.stock_returned) setStockReturned(flash.stock_returned);
    }, [flash?.stock_returned]);

    // One pipeline only.
    const selectedPipeline = pipelineList[0];

    const stages = [...(selectedPipeline?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order);

    const allCards = stages.flatMap((s) => s.transactions ?? []);
    const shownCards = allCards.filter(matchesFilter);

    // The card (and its stage) shown in the detail modal.
    const viewing = viewingKey
        ? stages
              .flatMap((s) => (s.transactions ?? []).map((card) => ({ card, stage: s })))
              .find((x) => cardKey(x.card) === viewingKey) ?? null
        : null;

    // ---- Delivery modal data (transactions only) ----
    const deliveryIndex = stages.findIndex((s) => s.deducts_stock);

    const deliveryTransaction =
        stages.flatMap((s) => s.transactions ?? []).find((t) => isTransaction(t) && t.id === delivery?.id) ?? null;

    const txStageIndex = stages.findIndex((s) =>
        (s.transactions ?? []).some((t) => isTransaction(t) && t.id === delivery?.id)
    );

    // A return only sends the card back if it is already past the delivery stage.
    const movesBackTo =
        delivery?.mode === 'return' && deliveryIndex >= 0 && txStageIndex > deliveryIndex
            ? stages[deliveryIndex].stage_name
            : null;

    // Stages can't be skipped: while dragging, only the neighbouring stages accept a drop.
    // Transactions can finish only from the final stage. Quotations and POs can finish from any stage.
    // "Lost Deal" is always allowed. Quotations and POs can't enter the delivery stage.
    const activeIndex = stages.findIndex((s) => s.id === activeStageId);
    const isAllowedStage = (index) => {
        if (activeIndex === -1) return true;
        if (Math.abs(index - activeIndex) > 1) return false;
        if (activeItem && !isTransaction(activeItem) && stages[index]?.deducts_stock) return false;
        return true;
    };
    const canFinish =
        activeIndex === -1 || activeIndex === stages.length - 1 || (activeItem && !isTransaction(activeItem));

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const findCard = (key) => {
        for (const stage of stages) {
            const found = (stage.transactions ?? []).find((t) => cardKey(t) === key);
            if (found) return { stage, card: found };
        }
        return { stage: null, card: null };
    };

    const handleDragStart = (event) => {
        const { stage, card } = findCard(String(event.active.id));
        if (card) {
            setActiveItem(card);
            setActiveStageId(stage.id);
        }
    };

    const handleDragEnd = (event) => {
        setActiveItem(null);
        setActiveStageId(null);

        if (pendingMove) return;

        const { active, over } = event;
        if (!over) return;

        const overId = String(over.id);
        const { stage: sourceStage, card: transaction } = findCard(String(active.id));
        if (!transaction) return;

        const isTx = isTransaction(transaction);
        const sourceIndex = stages.findIndex((s) => s.id === sourceStage.id);
        const { ordered, delivered } = deliveryTotals(transaction);

        // ---- Done / Lost ----
        if (overId === 'done' && isTx && sourceIndex !== stages.length - 1) return;

        if (overId === 'done' || overId === 'lost') {
            if (overId === 'done' && isTx && deliveryIndex >= 0 && delivered < ordered) {
                setNotice('Deliver every item in full before marking the deal as done.');
                return;
            }

            setPendingMove({
                type: 'status',
                transaction,
                sourceStage,
                status: overId === 'done' ? 'won' : 'lost',
                label: overId === 'done' ? 'Done Deal' : 'Lost Deal',
            });
            return;
        }

        // ---- Stage → stage ----
        const targetStageId = Number(overId.replace('stage-', ''));
        if (!targetStageId || sourceStage.id === targetStageId) return;

        const targetStage = stages.find((s) => s.id === targetStageId);
        const targetIndex = stages.findIndex((s) => s.id === targetStageId);
        if (!targetStage || Math.abs(targetIndex - sourceIndex) !== 1) return;

        if (!isTx && targetStage.deducts_stock) {
            setNotice('Only transactions can go to the delivery stage.');
            return;
        }

        // Same rules as the server, checked first so the user gets a clear message.
        if (isTx && deliveryIndex >= 0) {
            if (sourceIndex === deliveryIndex && targetIndex > sourceIndex && delivered < ordered) {
                setNotice('Deliver every item in full before moving past the delivery stage.');
                return;
            }
            if (targetIndex < deliveryIndex && delivered > 0) {
                setNotice('Return the delivered items first, then move this transaction back.');
                return;
            }
        }

        setPendingMove({ type: 'stage', transaction, sourceStage, targetStage });
    };

    // options = { restock, reason } from MoveConfirmModal; only used when a lost deal still has delivered items.
    const confirmMove = (options = {}) => {
        if (!pendingMove || isMoving) return;
        setIsMoving(true);

        if (pendingMove.type === 'status') {
            const { transaction, sourceStage, status } = pendingMove;
            const message = resolveResultMessage(transaction, status);
            const k = kindOf(transaction);
            const isTx = isTransaction(transaction);

            setPipelineList((prev) =>
                prev.map((pipeline) => {
                    if (pipeline.id !== selectedPipeline.id) return pipeline;
                    return {
                        ...pipeline,
                        stages: pipeline.stages.map((stage) =>
                            stage.id === sourceStage.id
                                ? {
                                      ...stage,
                                      transactions: stage.transactions.filter((t) => cardKey(t) !== cardKey(transaction)),
                                  }
                                : stage
                        ),
                        // the Done / Lost counters count transactions only
                        won_count: isTx && status === 'won' ? (pipeline.won_count ?? 0) + 1 : pipeline.won_count,
                        lost_count: isTx && status === 'lost' ? (pipeline.lost_count ?? 0) + 1 : pipeline.lost_count,
                    };
                })
            );

            router.patch(
                route(k.status, transaction.id),
                {
                    status: k[status], // 'won' | 'lost' -> the right word for this record type
                    restock: options.restock ?? true,
                    reason: options.reason ?? null,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setResultEffect({ type: status, message }),
                    onError: (errors) => {
                        setPipelineList(pipelines ?? []);
                        setNotice(Object.values(errors)[0]);
                    },
                    onFinish: () => {
                        setIsMoving(false);
                        setPendingMove(null);
                    },
                }
            );
            return;
        }

        const { transaction, sourceStage, targetStage } = pendingMove;

        setPipelineList((prev) =>
            prev.map((pipeline) => {
                if (pipeline.id !== selectedPipeline.id) return pipeline;
                return {
                    ...pipeline,
                    stages: pipeline.stages.map((stage) => {
                        if (stage.id === sourceStage.id) {
                            return {
                                ...stage,
                                transactions: stage.transactions.filter((t) => cardKey(t) !== cardKey(transaction)),
                            };
                        }
                        if (stage.id === targetStage.id) {
                            const withoutDuplicate = (stage.transactions ?? []).filter(
                                (t) => cardKey(t) !== cardKey(transaction)
                            );
                            return { ...stage, transactions: [transaction, ...withoutDuplicate] };
                        }
                        return stage;
                    }),
                };
            })
        );

        router.patch(
            route(kindOf(transaction).stage, transaction.id),
            { pipeline_stage_id: targetStage.id },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    if (!isTransaction(transaction)) return;

                    const movedForward =
                        stages.findIndex((s) => s.id === targetStage.id) >
                        stages.findIndex((s) => s.id === sourceStage.id);

                    if (targetStage.deducts_stock) {
                        // Moved into the delivery stage: open the delivery modal for convenience.
                        setDelivery({ id: transaction.id, mode: 'deliver' });
                    } else if (movedForward && (targetStage.creates_quotation || targetStage.creates_client_po)) {
                        // Moved forward into a quotation / client PO stage: open the card details,
                        // which already show the generated quotation and client PO (with Confirm and Edit).
                        setViewingKey(cardKey(transaction));
                    }
                },
                onError: (errors) => {
                    setPipelineList(pipelines ?? []);
                    setNotice(Object.values(errors)[0]);
                },
                onFinish: () => {
                    setIsMoving(false);
                    setPendingMove(null);
                },
            }
        );
    };

    const cancelMove = () => {
        if (isMoving) return;
        setPendingMove(null);
    };

    const openCreate = () => {
        setEditingPipeline(null);
        setIsOpen(true);
    };

    const openEdit = (pipeline) => {
        setEditingPipeline(pipeline);
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
        setEditingPipeline(null);
    };

    return (
        <AuthenticatedLayout header={<PageHeading title="Pipelines" subtitle="Manage the pipeline and its stages." />}>
            <Head title="Pipelines" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        {selectedPipeline ? (
                            <Button variant="brand" onClick={() => openEdit(selectedPipeline)}>
                                <Pencil />
                                Edit Pipeline & Stages
                            </Button>
                        ) : (
                            <Button variant="brand" onClick={openCreate}>
                                <Plus />
                                Create pipeline
                            </Button>
                        )}
                    </PageToolbar>
                }
            >
                {pipelineList.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No pipeline yet. Create it to get started.
                    </p>
                ) : (
                    <div className="flex h-[calc(100dvh-13rem)] min-h-[560px] w-full min-w-0 flex-col gap-4 sm:h-[calc(100dvh-9rem)]">
                        <BoardToolbar
                            query={query}
                            onQuery={setQuery}
                            priority={priorityFilter}
                            onPriority={setPriorityFilter}
                            shown={shownCards.length}
                            total={allCards.length}
                        />

                        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <div className="flex min-h-0 w-full min-w-0 flex-1 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-1 sm:snap-none sm:gap-4">
                                {stages.map((stage, index) => (
                                    <StageColumn
                                        key={stage.id}
                                        stage={stage}
                                        items={(stage.transactions ?? []).filter(matchesFilter)}
                                        accent={stageAccents[index % stageAccents.length]}
                                        disabled={!isAllowedStage(index)}
                                        showDelivery={deliveryIndex >= 0 && index >= deliveryIndex}
                                        onDeliveryAction={(t, mode) => setDelivery({ id: t.id, mode })}
                                        onOpen={(card) => setViewingKey(cardKey(card))}
                                    />
                                ))}
                            </div>

                            <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
                                <DealDropZone variant="done" count={selectedPipeline?.won_count ?? 0} disabled={!canFinish} />
                                <DealDropZone variant="lost" count={selectedPipeline?.lost_count ?? 0} />
                            </div>

                            <DragOverlay>{activeItem && <OverlayCard item={activeItem} />}</DragOverlay>
                        </DndContext>
                    </div>
                )}
            </PageCard>

            <PipelineModal show={isOpen} onClose={closeModal} pipeline={editingPipeline} />

            <ConfirmDelete
                show={Boolean(deletingPipeline)}
                onClose={() => setDeletingPipeline(null)}
                deleteUrl={deletingPipeline ? route('pipelines.destroy', deletingPipeline.id) : null}
                itemLabel={
                    deletingPipeline ? `"${deletingPipeline.pipeline_name}" and all of its stages` : 'this pipeline'
                }
                title="Delete pipeline?"
            />

            <MoveConfirmModal
                pendingMove={pendingMove}
                isMoving={isMoving}
                onConfirm={confirmMove}
                onCancel={cancelMove}
            />

            <CardDetailModal
                item={viewing?.card ?? null}
                stageName={viewing?.stage.stage_name}
                onClose={() => setViewingKey(null)}
            />

            <DealResultOverlay result={resultEffect} onClose={() => setResultEffect(null)} />

            <StockToast message={stockMessage} title="Done" onClose={() => setStockMessage(null)} />

            <StockToast
                message={stockWarning}
                title="Delivery not recorded"
                tone="warning"
                onClose={() => setStockWarning(null)}
            />

            <StockToast message={stockReturned} title="Stock updated" onClose={() => setStockReturned(null)} />

            <StockToast message={notice} title="Can't do that" tone="warning" onClose={() => setNotice(null)} />

            <DeliveryModal
                transaction={deliveryTransaction}
                mode={delivery?.mode}
                movesBackTo={movesBackTo}
                onClose={() => setDelivery(null)}
                onCancel={() => setDelivery(null)}
            />
        </AuthenticatedLayout>
    );
}