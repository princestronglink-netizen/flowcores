import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import PipelineModal from '@/Components/Pipeline/PipelineModal';
import DealResultOverlay from '@/Components/Pipeline/DealResultOverlay';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import Modal from '@/Components/Modal';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';

// Fallback copy used when a transaction doesn't have a winning_message set,
// and for lost deals, which never have a message stored in the DB at all.
const DEFAULT_WIN_MESSAGE = "🎉 Great job! This deal is officially closed-won!";
const DEFAULT_LOSE_MESSAGE = "This one didn't close, but the next one will 💪";

function resolveResultMessage(transaction, status) {
    if (status === 'won') {
        return transaction.winning_message?.trim()
            ? transaction.winning_message
            : DEFAULT_WIN_MESSAGE;
    }

    return DEFAULT_LOSE_MESSAGE;
}

const stageAccents = [
    { bar: 'bg-sky-500', dot: 'bg-sky-500', badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', card: 'border-l-sky-500' },
    { bar: 'bg-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', card: 'border-l-violet-500' },
    { bar: 'bg-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', card: 'border-l-amber-500' },
    { bar: 'bg-teal-500', dot: 'bg-teal-500', badge: 'bg-teal-500/15 text-teal-700 dark:text-teal-300', card: 'border-l-teal-500' },
    { bar: 'bg-fuchsia-500', dot: 'bg-fuchsia-500', badge: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300', card: 'border-l-fuchsia-500' },
];

function currency(value) {
    if (value == null) return '—';
    return Number(value).toLocaleString(undefined, { style: 'currency', currency: 'PHP' });
}

function CardBody({ item }) {
    return (
        <>
            <p className="truncate text-sm font-medium">{item.name}</p>
            <p className="truncate text-xs text-muted-foreground">
                {item.client?.client_name ?? 'No client'}
            </p>
            <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-semibold">{currency(item.total)}</span>
                <span className="text-xs text-muted-foreground">{item.priority}</span>
            </div>
        </>
    );
}

function TransactionCard({ item, accent }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `transaction-${item.id}`,
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`touch-none cursor-grab rounded-md border border-l-4 bg-background p-3 shadow-sm active:cursor-grabbing
                        ${accent.card} ${isDragging ? 'opacity-30' : ''}`}
        >
            <CardBody item={item} />
        </div>
    );
}

function StageColumn({ stage, items = [], accent }) {
    const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}` });

    return (
        <div
            ref={setNodeRef}
            className={`flex w-[85vw] shrink-0 snap-start flex-col overflow-hidden rounded-lg border bg-muted/40 transition-colors
                        sm:w-auto sm:min-w-[16rem] sm:flex-1 sm:shrink sm:basis-0
                        ${isOver ? 'ring-2 ring-primary' : ''}`}
        >
            <div className={`h-1 shrink-0 ${accent.bar}`} />

            <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${accent.dot}`} />
                    <h3 className="truncate text-sm font-semibold">{stage.stage_name}</h3>
                </div>
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${accent.badge}`}>
                    {items.length}
                </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 [scrollbar-width:thin]">
                {items.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">No items</p>
                ) : (
                    items.map((item) => (
                        <TransactionCard key={item.id} item={item} accent={accent} />
                    ))
                )}
            </div>
        </div>
    );
}

const dropZoneStyles = {
    done: {
        label: 'Done Deal',
        Icon: CheckCircle2,
        box: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
        ring: 'ring-emerald-400',
    },
    lost: {
        label: 'Lost Deal',
        Icon: XCircle,
        box: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400',
        ring: 'ring-red-400',
    },
};

function DealDropZone({ variant, count = 0 }) {
    const { label, Icon, box, ring } = dropZoneStyles[variant];
    const { setNodeRef, isOver } = useDroppable({ id: variant });

    return (
        <div
            ref={setNodeRef}
            className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-shadow
                        ${box} ${isOver ? `ring-2 ${ring}` : ''}`}
        >
            <Icon className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{label}</p>
                <p className="truncate text-xs opacity-80">Drop transactions here</p>
            </div>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium">
                {count}
            </span>
        </div>
    );
}

export default function Index({ pipelines }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingPipeline, setEditingPipeline] = useState(null);
    const [deletingPipeline, setDeletingPipeline] = useState(null);
    const [selectedPipelineId, setSelectedPipelineId] = useState(pipelines[0]?.id ?? null);
    const [pipelineList, setPipelineList] = useState(pipelines);
    const [pendingMove, setPendingMove] = useState(null);
    const [isMoving, setIsMoving] = useState(false);

    // Drives the confetti/shake overlay shown right after a won/lost status update lands.
    const [resultEffect, setResultEffect] = useState(null);

    const [activeItem, setActiveItem] = useState(null);
    const [activeAccent, setActiveAccent] = useState(null);

    useEffect(() => {
        setPipelineList(pipelines);
    }, [pipelines]);

    const selectedPipeline =
        pipelineList.find((p) => p.id === selectedPipelineId) ?? pipelineList[0];

    const stages = [...(selectedPipeline?.stages ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
    );

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragStart = (event) => {
        const transactionId = Number(String(event.active.id).replace('transaction-', ''));

        for (let i = 0; i < stages.length; i++) {
            const found = (stages[i].transactions ?? []).find((t) => t.id === transactionId);
            if (found) {
                setActiveItem(found);
                setActiveAccent(stageAccents[i % stageAccents.length]);
                break;
            }
        }
    };

    const handleDragEnd = (event) => {
        setActiveItem(null);
        setActiveAccent(null);

        if (pendingMove) return;

        const { active, over } = event;
        if (!over) return;

        const transactionId = Number(String(active.id).replace('transaction-', ''));
        const overId = String(over.id);

        let sourceStage = null;
        let transaction = null;

        for (const stage of stages) {
            const found = (stage.transactions ?? []).find((t) => t.id === transactionId);
            if (found) {
                sourceStage = stage;
                transaction = found;
                break;
            }
        }
        if (!transaction) return;

        if (overId === 'done' || overId === 'lost') {
            setPendingMove({
                type: 'status',
                transaction,
                sourceStage,
                status: overId === 'done' ? 'won' : 'lost',
                label: overId === 'done' ? 'Done Deal' : 'Lost Deal',
            });
            return;
        }

        const targetStageId = Number(overId.replace('stage-', ''));
        if (!targetStageId || sourceStage.id === targetStageId) return;

        const targetStage = stages.find((s) => s.id === targetStageId);

        setPendingMove({ type: 'stage', transaction, sourceStage, targetStage });
    };

    const confirmMove = () => {
        if (!pendingMove || isMoving) return;
        setIsMoving(true);

        if (pendingMove.type === 'status') {
            const { transaction, sourceStage, status } = pendingMove;
            const message = resolveResultMessage(transaction, status);

            setPipelineList((prev) =>
                prev.map((pipeline) => {
                    if (pipeline.id !== selectedPipeline.id) return pipeline;
                    return {
                        ...pipeline,
                        stages: pipeline.stages.map((stage) =>
                            stage.id === sourceStage.id
                                ? { ...stage, transactions: stage.transactions.filter((t) => t.id !== transaction.id) }
                                : stage
                        ),
                        won_count: status === 'won' ? (pipeline.won_count ?? 0) + 1 : pipeline.won_count,
                        lost_count: status === 'lost' ? (pipeline.lost_count ?? 0) + 1 : pipeline.lost_count,
                    };
                })
            );

            router.patch(
                route('transactions.updateStatus', transaction.id),
                { status },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setResultEffect({ type: status, message }),
                    onError: () => setPipelineList(pipelines),
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
                            return { ...stage, transactions: stage.transactions.filter((t) => t.id !== transaction.id) };
                        }
                        if (stage.id === targetStage.id) {
                            const withoutDuplicate = (stage.transactions ?? []).filter((t) => t.id !== transaction.id);
                            return { ...stage, transactions: [transaction, ...withoutDuplicate] };
                        }
                        return stage;
                    }),
                };
            })
        );

        router.patch(
            route('transactions.updateStage', transaction.id),
            { pipeline_stage_id: targetStage.id },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setPipelineList(pipelines),
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
        <AuthenticatedLayout
            header={<PageHeading title="Pipelines" subtitle="Manage pipelines and their stages." />}
        >
            <Head title="Pipelines" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        <div className="flex w-full flex-wrap items-center gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
                                <Select
                                    value={selectedPipeline ? String(selectedPipeline.id) : ''}
                                    onValueChange={(value) => setSelectedPipelineId(Number(value))}
                                    disabled={pipelineList.length === 0}
                                >
                                    <SelectTrigger className="w-full sm:w-56">
                                        <SelectValue placeholder="Select pipeline" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pipelineList.map((pipeline) => (
                                            <SelectItem key={pipeline.id} value={String(pipeline.id)}>
                                                {pipeline.pipeline_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedPipeline && (
                                    <>
                                        <Button variant="outline" size="icon" className="shrink-0" onClick={() => openEdit(selectedPipeline)}>
                                            <Pencil />
                                        </Button>
                                        <Button variant="outline" size="icon" className="shrink-0" onClick={() => setDeletingPipeline(selectedPipeline)}>
                                            <Trash2 />
                                        </Button>
                                    </>
                                )}
                            </div>

                            <Button variant="brand" className="w-full sm:ml-auto sm:w-auto" onClick={openCreate}>
                                <Plus />
                                New Pipeline
                            </Button>
                        </div>
                    </PageToolbar>
                }
            >
                {pipelineList.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No pipelines yet. Create one to get started.
                    </p>
                ) : (
                    <div className="flex h-[calc(100dvh-13rem)] min-h-[500px] w-full min-w-0 flex-col gap-3 sm:h-[calc(100dvh-9rem)]">
                        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <div className="flex min-h-0 w-full min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto sm:snap-none sm:gap-4">
                                {stages.map((stage, index) => (
                                    <StageColumn
                                        key={stage.id}
                                        stage={stage}
                                        items={stage.transactions ?? []}
                                        accent={stageAccents[index % stageAccents.length]}
                                    />
                                ))}
                            </div>

                            <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
                                <DealDropZone variant="done" count={selectedPipeline?.won_count ?? 0} />
                                <DealDropZone variant="lost" count={selectedPipeline?.lost_count ?? 0} />
                            </div>

                            <DragOverlay>
                                {activeItem && activeAccent && (
                                    <div
                                        className={`w-64 rounded-md border border-l-4 bg-background p-3 shadow-lg ${activeAccent.card}`}
                                    >
                                        <CardBody item={activeItem} />
                                    </div>
                                )}
                            </DragOverlay>
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
                    deletingPipeline
                        ? `"${deletingPipeline.pipeline_name}" and all of its stages`
                        : 'this pipeline'
                }
                title="Delete pipeline?"
            />

            <Modal show={Boolean(pendingMove)} onClose={cancelMove} maxWidth="sm">
                {pendingMove && (
                    <div className="p-6">
                        {pendingMove.type === 'status' ? (
                            <>
                                <h2 className="text-base font-semibold">Mark as {pendingMove.label}?</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Move <span className="font-medium text-foreground">{pendingMove.transaction.name}</span> to{' '}
                                    <span className="font-medium text-foreground">{pendingMove.label}</span>? It will leave the board.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-base font-semibold">Move transaction?</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Move <span className="font-medium text-foreground">{pendingMove.transaction.name}</span> from{' '}
                                    <span className="font-medium text-foreground">{pendingMove.sourceStage.stage_name}</span> to{' '}
                                    <span className="font-medium text-foreground">{pendingMove.targetStage.stage_name}</span>?
                                </p>
                            </>
                        )}

                        <div className="mt-6 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={cancelMove} disabled={isMoving}>
                                Cancel
                            </Button>
                            <Button type="button" variant="brand" onClick={confirmMove} disabled={isMoving}>
                                {isMoving ? 'Moving…' : 'Move'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <DealResultOverlay result={resultEffect} onClose={() => setResultEffect(null)} />
        </AuthenticatedLayout>
    );
}