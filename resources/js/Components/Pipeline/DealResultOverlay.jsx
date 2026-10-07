import { useEffect, useState } from 'react';
import { PartyPopper, Frown, X } from 'lucide-react';

const WIN_COLORS = ['#22c55e', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa'];
const LOSE_COLORS = ['#94a3b8', '#cbd5e1', '#818cf8', '#64748b'];

const SHOW_MS = 4200;

/** A single falling confetti piece — mixed shapes + a gentle side-to-side wobble. */
function ConfettiPiece({ index }) {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 2.6 + Math.random() * 1.6;
    const color = WIN_COLORS[index % WIN_COLORS.length];
    const size = 6 + Math.random() * 7;
    const isCircle = index % 3 === 0;
    const drift = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 40);
    const spins = 2 + Math.random() * 3;

    return (
        <span
            className="absolute top-[-5%]"
            style={{
                left: `${left}%`,
                width: size,
                height: isCircle ? size : size * 1.7,
                backgroundColor: color,
                borderRadius: isCircle ? '9999px' : '2px',
                boxShadow: `0 0 6px ${color}55`,
                '--drift': `${drift}px`,
                '--spins': spins,
                animation: `confetti-fall ${duration}s cubic-bezier(.25,.46,.45,.94) ${delay}s forwards`,
            }}
        />
    );
}

/** A slow, muted falling drop used for the "lost" state — far calmer than confetti. */
function DriftPiece({ index }) {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const duration = 3.5 + Math.random() * 2;
    const color = LOSE_COLORS[index % LOSE_COLORS.length];
    const size = 3 + Math.random() * 3;

    return (
        <span
            className="absolute top-[-5%] rounded-full opacity-60"
            style={{
                left: `${left}%`,
                width: size,
                height: size,
                backgroundColor: color,
                animation: `drift-fall ${duration}s ease-in ${delay}s forwards`,
            }}
        />
    );
}

function Sparkle({ style }) {
    return (
        <span
            className="absolute text-amber-300"
            style={{ animation: 'sparkle-twinkle 1.6s ease-in-out infinite', ...style }}
        >
            ✦
        </span>
    );
}

/**
 * Full-screen result effect shown after a transaction is marked won/lost.
 *
 * `result` shape: { type: 'won' | 'lost', message: string } | null
 * - Won message: transaction.winning_message from the DB, falling back to a default.
 * - Lost message: always a default (there is no lose_message column).
 */
export default function DealResultOverlay({ result, onClose }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!result) return;

        setVisible(true);
        const timer = setTimeout(onClose, SHOW_MS);
        return () => clearTimeout(timer);
    }, [result]);

    if (!result) return null;

    const isWon = result.type === 'won';

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300
                        ${visible ? 'opacity-100' : 'opacity-0'}
                        ${isWon ? 'bg-emerald-950/50' : 'bg-slate-950/50'} backdrop-blur-sm`}
            onClick={onClose}
        >
            {/* Particle layer */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {isWon
                    ? Array.from({ length: 90 }).map((_, i) => <ConfettiPiece key={i} index={i} />)
                    : Array.from({ length: 22 }).map((_, i) => <DriftPiece key={i} index={i} />)}
            </div>

            <div
                onClick={(e) => e.stopPropagation()}
                className={`relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-2xl border p-8 text-center shadow-2xl
                            transition-all duration-500 ease-out
                            ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-90 opacity-0'}
                            ${isWon
                                ? 'border-emerald-400/30 bg-gradient-to-b from-emerald-500/10 via-background to-background'
                                : 'border-slate-400/20 bg-gradient-to-b from-slate-500/10 via-background to-background'}`}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                >
                    <X className="size-4" />
                </button>

                {isWon && (
                    <>
                        <Sparkle style={{ top: '10%', left: '14%', animationDelay: '0.2s' }} />
                        <Sparkle style={{ top: '20%', right: '12%', animationDelay: '0.8s' }} />
                        <Sparkle style={{ bottom: '22%', left: '10%', animationDelay: '1.2s' }} />
                    </>
                )}

                {/* Icon with glow ring */}
                <div className="relative mb-4 flex items-center justify-center">
                    <span
                        className={`absolute inline-flex size-20 rounded-full ${
                            isWon ? 'bg-emerald-400/25' : 'bg-slate-400/20'
                        } ${visible ? 'animate-[glow-pulse_2s_ease-in-out_infinite]' : ''}`}
                    />
                    <div
                        className={`relative flex size-16 items-center justify-center rounded-full shadow-lg
                                    ${visible ? 'animate-[icon-pop_0.6s_cubic-bezier(.34,1.56,.64,1)_forwards]' : 'scale-0'}
                                    ${isWon
                                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                                        : 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'}`}
                    >
                        {isWon ? <PartyPopper className="size-8" /> : <Frown className="size-8" />}
                    </div>
                </div>

                <h3
                    className={`bg-clip-text text-xl font-bold tracking-tight text-transparent
                                ${isWon
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                    : 'bg-gradient-to-r from-slate-500 to-slate-400'}`}
                >
                    {isWon ? 'Deal Won! 🎉' : 'Deal Lost'}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.message}</p>

                <button
                    type="button"
                    onClick={onClose}
                    className={`mt-5 rounded-full px-6 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105
                                ${isWon
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/30'
                                    : 'bg-gradient-to-r from-slate-500 to-slate-600 hover:shadow-slate-500/30'}`}
                >
                    {isWon ? 'Awesome!' : 'Got it'}
                </button>

                {/* Auto-dismiss progress indicator */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-muted/50">
                    <div
                        className={`h-full ${isWon ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        style={{
                            animation: visible ? `progress-shrink ${SHOW_MS}ms linear forwards` : 'none',
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes confetti-fall {
                    0%   { transform: translate(0, -10px) rotate(0deg); opacity: 1; }
                    100% { transform: translate(var(--drift), 100vh) rotate(calc(var(--spins) * 360deg)); opacity: 0; }
                }
                @keyframes drift-fall {
                    0%   { transform: translateY(-10px); opacity: 0.6; }
                    100% { transform: translateY(100vh); opacity: 0; }
                }
                @keyframes sparkle-twinkle {
                    0%, 100% { opacity: 0; transform: scale(0.5); }
                    50%      { opacity: 1; transform: scale(1.2); }
                }
                @keyframes icon-pop {
                    0%   { transform: scale(0); }
                    100% { transform: scale(1); }
                }
                @keyframes glow-pulse {
                    0%, 100% { transform: scale(1);   opacity: 0.6; }
                    50%      { transform: scale(1.15); opacity: 0.3; }
                }
                @keyframes progress-shrink {
                    0%   { width: 100%; }
                    100% { width: 0%; }
                }
            `}</style>
        </div>
    );
}