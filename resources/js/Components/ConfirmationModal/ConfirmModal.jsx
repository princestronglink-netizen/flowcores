import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { AlertTriangle } from 'lucide-react';

const PALETTE = {
    slate: '#667292',
    cream: '#bccad6',
    deepEdge: '#3a4157',
    mist: '#eef1f5',
    danger: '#dc2626',
    dangerMist: '#fdecec',
};

export default function ConfirmModal({
    show,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    description = 'This action cannot be undone.',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    processing = false,
}) {
    const iconBg = variant === 'danger' ? PALETTE.dangerMist : PALETTE.mist;
    const iconColor = variant === 'danger' ? PALETTE.danger : PALETTE.slate;

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-start gap-3">
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: iconBg }}
                    >
                        <AlertTriangle className="h-4 w-4" style={{ color: iconColor }} />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold" style={{ color: PALETTE.deepEdge }}>
                            {title}
                        </h2>
                        <p className="mt-1 text-sm" style={{ color: PALETTE.slate }}>
                            {description}
                        </p>
                    </div>
                </div>

                <div
                    className="mt-6 flex justify-end gap-2 border-t pt-4"
                    style={{ borderColor: PALETTE.cream }}
                >
                    <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === 'danger' ? 'destructive' : 'brand'}
                        onClick={onConfirm}
                        disabled={processing}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}