import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { Check } from 'lucide-react';
import { Banner, Field, input } from '@/Components/ui/kit';

/**
 * Confirm a draft client PO. The client's PO number and PO date are required.
 * `cpo` = the client PO to confirm, or null when closed.
 * Once confirmed the PO is frozen (no edit screen exists).
 */
export default function ConfirmClientPoModal({ cpo, onClose }) {
    const { data, setData, post, processing, errors, clearErrors, reset } = useForm({
        client_po_number: '',
        client_po_date: '',
    });

    useEffect(() => {
        if (cpo) {
            setData({
                client_po_number: cpo.client_po_number ?? '',
                client_po_date: cpo.client_po_date ?? '',
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cpo?.id]);

    const submit = (e) => {
        e.preventDefault();
        if (processing) return;
        post(route('client-purchase-orders.confirm', cpo.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    const ready = data.client_po_number.trim() !== '' && Boolean(data.client_po_date);

    return (
        <Modal show={Boolean(cpo)} onClose={processing ? () => {} : onClose} maxWidth="md">
            {cpo && (
                <form onSubmit={submit} noValidate className="p-6">
                    <h2 className="text-base font-semibold">Confirm {cpo.cpo_number}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Enter the details from the purchase order your client sent. Once confirmed, it can't be edited.
                    </p>

                    <div className="mt-4 space-y-4">
                        {errors.status && <Banner tone="error">{errors.status}</Banner>}

                        <Field label="Client PO number" required htmlFor="cpo_client_po_number" error={errors.client_po_number}>
                            <input
                                id="cpo_client_po_number"
                                type="text"
                                maxLength={120}
                                autoFocus
                                value={data.client_po_number}
                                onChange={(e) => {
                                    setData('client_po_number', e.target.value);
                                    clearErrors('client_po_number', 'status');
                                }}
                                className={input(errors.client_po_number)}
                            />
                        </Field>

                        <Field label="Client PO date" required htmlFor="cpo_client_po_date" error={errors.client_po_date}>
                            <input
                                id="cpo_client_po_date"
                                type="date"
                                value={data.client_po_date ?? ''}
                                onChange={(e) => {
                                    setData('client_po_date', e.target.value);
                                    clearErrors('client_po_date', 'status');
                                }}
                                className={input(errors.client_po_date)}
                            />
                        </Field>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="brand" disabled={processing || !ready}>
                            <Check className="size-3.5" /> {processing ? 'Confirming…' : 'Confirm'}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}