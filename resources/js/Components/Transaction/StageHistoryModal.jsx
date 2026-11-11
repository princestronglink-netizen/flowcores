import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { History, X } from 'lucide-react';
import StageHistory from '@/Components/Pipeline/StageHistory';

/**
 * transaction = a row of the transactions list (with stage_history loaded) or null.
 * stages      = [{id, stage_name, max_days}] so each stay can show its day limit.
 */
export default function StageHistoryModal({ transaction, stages = [], onClose }) {
    const hasHistory = (transaction?.stage_history ?? []).length > 0;

    return (
        <Modal show={Boolean(transaction)} onClose={onClose} maxWidth="2xl">
            {transaction && (
                <div className="flex max-h-[88vh] flex-col bg-[#fbfcfe]">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-[#dbe4ef] bg-white px-6 py-5">
                        <div className="flex min-w-0 items-center gap-3.5">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef3fa] text-[#1b4a7d]">
                                <History className="size-5" />
                            </span>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-[#12306b]">Stage history</h2>
                                <p className="truncate text-sm text-[#6b84a8]">{transaction.name}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="rounded-lg p-1.5 text-[#6b84a8] transition hover:bg-[#eef3fa] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b4a7d]/40"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {hasHistory ? (
                            <StageHistory history={transaction.stage_history} stages={stages} showTitle={false} />
                        ) : (
                            <p className="py-10 text-center text-sm text-slate-500">No stage history yet.</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end border-t border-[#dbe4ef] bg-white px-6 py-3">
                        <Button type="button" variant="brand" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}