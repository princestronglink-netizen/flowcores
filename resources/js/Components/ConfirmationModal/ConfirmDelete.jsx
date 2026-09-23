import { useState } from 'react';
import { router } from '@inertiajs/react';
import ConfirmModal from '@/Components/ConfirmationModal/ConfirmModal';

export default function ConfirmDelete({
    show,
    onClose,
    deleteUrl,
    itemLabel = 'this item',
    title = 'Delete item?',
    description,
    onSuccess,
}) {
    const [processing, setProcessing] = useState(false);

    const close = () => {
        if (processing) return;
        onClose();
    };

    const handleDelete = () => {
        if (!deleteUrl) return;

        setProcessing(true);
        router.delete(deleteUrl, {
            preserveScroll: true,
            onSuccess: () => {
                onSuccess?.();
            },
            onFinish: () => {
                setProcessing(false);
                onClose();
            },
        });
    };

    return (
        <ConfirmModal
            show={show}
            onClose={close}
            onConfirm={handleDelete}
            processing={processing}
            title={title}
            description={
                description ?? `This will permanently delete ${itemLabel}. This cannot be undone.`
            }
            confirmLabel="Delete"
            variant="danger"
        />
    );
}