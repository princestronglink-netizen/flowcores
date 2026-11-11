import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { KeyRound, Loader2 } from 'lucide-react';

export default function ResetPasswordModal({ open, onClose, onConfirm, loading, userName, userEmail }) {
    return (
        <Modal show={open} onClose={loading ? () => {} : onClose} maxWidth="md">
            <div className="p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <KeyRound className="h-5 w-5 text-amber-600" strokeWidth={1.75} />
                </div>
                <h2 className="text-base font-semibold text-slate-900">Reset password</h2>
                <p className="mt-2 text-sm text-slate-500">
                    A new password will be generated and emailed to{' '}
                    <span className="font-medium text-slate-700">{userName}</span>
                    {userEmail && (
                        <> at <span className="font-medium text-blue-600">{userEmail}</span></>
                    )}
                    . Their old password will stop working.
                </p>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="bg-amber-500 text-white hover:bg-amber-600"
                    >
                        {loading
                            ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                            : <KeyRound className="h-4 w-4" strokeWidth={1.75} />}
                        Reset &amp; send
                    </Button>
                </div>
            </div>
        </Modal>
    );
}