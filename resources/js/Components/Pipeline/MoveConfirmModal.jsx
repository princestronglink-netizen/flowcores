import { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, XCircle, MoveRight } from 'lucide-react';
import { RETURN_REASONS } from './returnReasons';

const tone = {
    won: { Icon: CheckCircle2, wrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' },
    lost: { Icon: XCircle, wrap: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400' },
    stage: { Icon: MoveRight, wrap: 'bg-[#eef1f5] text-[#667292]' },
};

/**
 * onConfirm receives { restock, reason }. Both only matter when a lost deal still has
 * delivered items: the user decides whether they go back on the shelf or are written off.
 *
 * pendingMove.checks (Done deals only) = result of buildCompletionChecks().
 * The confirm button stays disabled while any check fails.
 */
export default function MoveConfirmModal({ pendingMove, isMoving, onConfirm, onCancel }) {
    const [restock, setRestock] = useState(true);
    const [reason, setReason] = useState('');

    useEffect(() => {
        setRestock(true);
        setReason('');
    }, [pendingMove]);

    const isStatus = pendingMove?.type === 'status';
    const key = isStatus ? pendingMove.status : 'stage';
    const { Icon, wrap } = tone[key] ?? tone.stage;

    const delivered = isStatus
        ? (pendingMove.transaction.items ?? []).reduce((s, l) => s + Number(l.delivered_quantity ?? 0), 0)
        : 0;
    const needsChoice = isStatus && pendingMove.status === 'lost' && delivered > 0;

    const checks = isStatus ? pendingMove.checks ?? null : null;
    const failedChecks = checks ? checks.filter((c) => !c.ok) : [];
    const blocked = (needsChoice && !restock && !reason) || failedChecks.length > 0;

    const choiceClass = (active) =>
        `flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition ${
            active ? 'border-[#667292] bg-[#eef1f5]' : 'border-[#bccad6] hover:bg-[#eef1f5]/60'
        }`;

    return (
        <Modal show={Boolean(pendingMove)} onClose={onCancel} maxWidth={checks ? 'lg' : 'sm'}>
            {pendingMove && (
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${wrap}`}>
                            <Icon className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold">
                                {isStatus ? `Mark as ${pendingMove.label}?` : 'Move transaction?'}
                            </h2>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{pendingMove.transaction.name}</p>
                        </div>
                    </div>

                    {isStatus ? (
                        checks ? (
                            <div className="mt-4 space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Checking the quotation, purchase order and deliveries before this deal is completed.
                                </p>

                                {checks.map((c) => (
                                    <div
                                        key={c.id}
                                        className={`rounded-md border px-3 py-2.5 ${
                                            c.ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-300 bg-amber-50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {c.ok ? (
                                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                            ) : (
                                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium">{c.title}</p>
                                                {c.summary && (
                                                    <p className="truncate text-xs text-muted-foreground">{c.summary}</p>
                                                )}

                                                {c.problems.length > 0 && (
                                                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-800">
                                                        {c.problems.map((p, i) => (
                                                            <li key={i}>{p}</li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {c.links.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                                        {c.links.map((l, i) => (
                                                            <a
                                                                key={i}
                                                                href={l.href}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs font-medium text-[#667292] hover:underline"
                                                            >
                                                                <ExternalLink className="size-3" /> {l.label}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {failedChecks.length > 0 && (
                                    <p className="text-xs font-medium text-amber-700">
                                        Fix {failedChecks.length === 1 ? 'this' : 'these'} first. The deal can't be completed until
                                        every check passes.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-muted-foreground">
                                It will leave the board and count toward {pendingMove.label}.
                            </p>
                        )
                    ) : (
                        <div className="mt-4 flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
                            <span className="min-w-0 flex-1 truncate text-center font-medium">
                                {pendingMove.sourceStage.stage_name}
                            </span>
                            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-center font-medium">
                                {pendingMove.targetStage.stage_name}
                            </span>
                        </div>
                    )}

                    {needsChoice && (
                        <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium">
                                {delivered} delivered {delivered === 1 ? 'unit' : 'units'} to take back. What happens to them?
                            </p>

                            <label className={choiceClass(restock)}>
                                <input
                                    type="radio"
                                    name="lost_restock"
                                    checked={restock}
                                    onChange={() => setRestock(true)}
                                    className="mt-0.5 accent-[#667292]"
                                />
                                <span>
                                    <span className="block text-sm font-medium">Put back into stock</span>
                                    <span className="block text-xs text-muted-foreground">The goods are in good condition.</span>
                                </span>
                            </label>

                            <label className={choiceClass(!restock)}>
                                <input
                                    type="radio"
                                    name="lost_restock"
                                    checked={!restock}
                                    onChange={() => setRestock(false)}
                                    className="mt-0.5 accent-[#667292]"
                                />
                                <span>
                                    <span className="block text-sm font-medium">Do not restock</span>
                                    <span className="block text-xs text-muted-foreground">
                                        Damaged, used or gone. Stock stays as it is and it is logged as a write-off.
                                    </span>
                                </span>
                            </label>

                            {!restock && (
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    aria-label="Reason for not restocking"
                                    className="block w-full rounded-md border border-[#bccad6] px-3 py-2 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#8d9db6]/40"
                                >
                                    <option value="" disabled>Select a reason</option>
                                    {RETURN_REASONS.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isMoving}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant={key === 'lost' ? 'destructive' : 'brand'}
                            onClick={() => onConfirm({ restock, reason: restock ? null : reason })}
                            disabled={isMoving || blocked}
                        >
                            {isMoving ? 'Moving…' : isStatus ? `Mark as ${pendingMove.label}` : 'Move'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}