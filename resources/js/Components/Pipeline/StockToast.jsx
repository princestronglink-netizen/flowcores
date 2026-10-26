import { useEffect } from 'react';
import { PackageMinus, PackagePlus, AlertTriangle, X } from 'lucide-react';

/**
 * icon: 'out' (default, stock leaves) | 'in' (stock arrives). Warnings always show the alert icon.
 */
export default function StockToast({
    message,
    onClose,
    duration = 5000,
    title = 'Stock deducted',
    tone = 'success',
    icon = 'out',
}) {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [message, duration, onClose]);

    if (!message) return null;

    const isWarning = tone === 'warning';
    const Icon = isWarning ? AlertTriangle : icon === 'in' ? PackagePlus : PackageMinus;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-lg border bg-white p-4 shadow-lg ${
                isWarning ? 'border-amber-300' : 'border-[#bccad6]'
            }`}
        >
            <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    isWarning ? 'bg-amber-100 text-amber-600' : 'bg-[#eef1f5] text-[#667292]'
                }`}
            >
                <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#3a4157]">{title}</p>
                <p className="mt-0.5 text-sm text-[#667292]">{message}</p>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss"
                className="rounded p-1 text-[#8d9db6] hover:bg-[#eef1f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8d9db6]"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}