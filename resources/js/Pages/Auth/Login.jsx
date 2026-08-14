import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/Components/InputError';
import { CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

const features = [
    'Submit and track business requests in real time',
    'Automated approval routing and escalations',
    'Full visibility into every workflow, end to end',
];

// Path to your saved logo file — update this if you store it elsewhere
// (e.g. import logoUrl from '@/assets/flowcore-logo.png' if it lives in resources/js/assets)
const LOGO_URL = '/images/flowcore-logo.png';

// Palette tokens — single source of truth so the page reads as one
// coherent system instead of scattered hex values.
const PALETTE = {
    mint: '#f1e3dd',
    teal: '#8d9db6',
    cream: '#bccad6',
    slate: '#667292',
    // Derived, not part of the original 4 — needed for the dark panel
    // depth and pressed-button shadow. Kept close in hue to `slate`.
    deep: '#262b3d',
    deepEdge: '#3a4157',
    action: '#667292',
    actionEdge: '#4a5474',
};

function MotionStyles() {
    return (
        <style>{`
            @keyframes bgLogoDrift {
                0%   { transform: rotateY(-9deg) rotateZ(-1.5deg); }
                50%  { transform: rotateY(9deg) rotateZ(1.5deg); }
                100% { transform: rotateY(-9deg) rotateZ(-1.5deg); }
            }
            @keyframes bgLogoFloat {
                0%   { transform: translateY(0px) rotateX(16deg) scale(1); }
                50%  { transform: translateY(-22px) rotateX(11deg) scale(1.015); }
                100% { transform: translateY(0px) rotateX(16deg) scale(1); }
            }
            @keyframes gridPan {
                0%   { background-position: 0px 0px; }
                100% { background-position: 56px 56px; }
            }
            @keyframes orbDriftA {
                0%, 100% { transform: translate(0px, 0px) scale(1); }
                50%      { transform: translate(24px, -18px) scale(1.08); }
            }
            @keyframes orbDriftB {
                0%, 100% { transform: translate(0px, 0px) scale(1); }
                50%      { transform: translate(-20px, 22px) scale(1.06); }
            }
            @keyframes haloPulse {
                0%, 100% { opacity: 0.5; }
                50%      { opacity: 0.85; }
            }
            @keyframes sheen {
                0%   { transform: translateX(-120%) skewX(-12deg); }
                100% { transform: translateX(220%) skewX(-12deg); }
            }
            @media (prefers-reduced-motion: reduce) {
                .motion-safe-anim { animation: none !important; }
            }
        `}</style>
    );
}

function BackgroundLogo() {
    return (
        <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[640px] w-[640px] pointer-events-none select-none"
            style={{ perspective: '1400px' }}
            aria-hidden="true"
        >
            <div
                className="motion-safe-anim h-full w-full"
                style={{ transformStyle: 'preserve-3d', animation: 'bgLogoDrift 16s ease-in-out infinite' }}
            >
                <div
                    className="motion-safe-anim h-full w-full"
                    style={{ transformStyle: 'preserve-3d', animation: 'bgLogoFloat 7s ease-in-out infinite' }}
                >
                    <img
                        src={LOGO_URL}
                        alt=""
                        className="h-full w-full object-contain opacity-[0.14]"
                        style={{
                            filter: `drop-shadow(0 40px 60px rgba(0,0,0,0.6)) drop-shadow(0 6px 14px ${PALETTE.teal}66) drop-shadow(0 0 40px ${PALETTE.slate}55)`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function LogoMark({ height = 32, lifted = false, tilt = null, onMouseMove, onMouseLeave }) {
    const rotateX = tilt ? tilt.x : lifted ? 14 : 0;
    const rotateY = tilt ? tilt.y : lifted ? -11 : 0;

    return (
        <div
            className="relative inline-block"
            style={{ perspective: '700px' }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            {(lifted || tilt) && (
                <div
                    className="motion-safe-anim absolute -inset-6 rounded-full blur-2xl"
                    style={{
                        animation: 'haloPulse 4s ease-in-out infinite',
                        background: `radial-gradient(circle, ${PALETTE.teal}4d 0%, ${PALETTE.mint}40 55%, transparent 80%)`,
                    }}
                    aria-hidden="true"
                />
            )}
            <div className="relative overflow-hidden rounded-full">
                <img
                    src={LOGO_URL}
                    alt="FlowCore"
                    style={{
                        height,
                        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                        transformStyle: 'preserve-3d',
                        transition: onMouseMove ? 'transform 120ms ease-out' : undefined,
                        cursor: onMouseMove ? 'default' : undefined,
                        filter:
                            lifted || tilt
                                ? `drop-shadow(0 1px 0 rgba(0,0,0,0.35)) drop-shadow(0 6px 8px rgba(0,0,0,0.3)) drop-shadow(0 22px 30px rgba(0,0,0,0.35)) drop-shadow(0 4px 18px ${PALETTE.teal}66)`
                                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
                    }}
                    className="relative z-10 w-auto object-contain"
                />
                {(lifted || tilt) && (
                    <div
                        className="motion-safe-anim absolute inset-0 z-20 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        style={{ animation: 'sheen 2.8s ease-in-out 0.4s 1' }}
                        aria-hidden="true"
                    />
                )}
            </div>
        </div>
    );
}

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [logoTilt, setLogoTilt] = useState({ x: 0, y: 0 });

    const handleLogoMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        setLogoTilt({ x: py * -22, y: px * 22 });
    };

    const handleLogoMouseLeave = () => setLogoTilt({ x: 0, y: 0 });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-5 bg-white">
            <Head title="Log in" />
            <MotionStyles />

            {/* Left: brand / feature panel */}
            <div
                className="hidden lg:flex lg:col-span-3 flex-col relative overflow-hidden text-white"
                style={{ backgroundColor: '#16233a', borderRight: `1px solid ${PALETTE.deepEdge}` }}
            >
                <div
                    className="motion-safe-anim absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:56px_56px]"
                    style={{ animation: 'gridPan 22s linear infinite' }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(to bottom, #0c1626, #16233afa, #1b2b45)` }}
                />
                <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(to right, transparent, ${PALETTE.teal}, transparent)` }}
                />

                <div
                    className="motion-safe-anim absolute top-1/4 left-1/4 h-96 w-96 rounded-full blur-3xl"
                    style={{ animation: 'orbDriftA 14s ease-in-out infinite', backgroundColor: `${PALETTE.slate}55` }}
                    aria-hidden="true"
                />
                <div
                    className="motion-safe-anim absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full blur-3xl"
                    style={{ animation: 'orbDriftB 18s ease-in-out infinite', backgroundColor: `${PALETTE.teal}66` }}
                    aria-hidden="true"
                />

                <BackgroundLogo />

                <div className="relative z-10 flex-1 flex items-center px-14">
                    <div className="max-w-lg">
                        <h2
                            className="relative text-4xl font-semibold leading-[1.15] tracking-tight"
                            style={{
                                color: PALETTE.mint,
                                textShadow: `0 0 20px ${PALETTE.teal}80, 0 0 45px ${PALETTE.slate}59, 0 0 80px ${PALETTE.deep}40`,
                            }}
                        >
                            Business Request &amp; Workflow Management Platform
                        </h2>
                        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: `${PALETTE.mint}99` }}>
                            Sign in to submit requests, manage approvals, and keep every workflow moving — all in one place.
                        </p>

                        <ul
                            className="mt-8 space-y-3.5 pt-6"
                            style={{ borderTop: `1px solid ${PALETTE.deepEdge}` }}
                        >
                            {features.map((f) => (
                                <li key={f} className="flex items-start gap-3 text-sm" style={{ color: `${PALETTE.mint}cc` }}>
                                    <CheckCircle2 className="h-4.5 w-4.5 mt-0.5 shrink-0" style={{ color: PALETTE.teal }} />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div
                    className="relative z-10 flex items-center justify-between p-14 pt-0 text-xs"
                    style={{ color: `${PALETTE.mint}66` }}
                >
                    <span>© {new Date().getFullYear()} FlowCoreS, Inc. All rights reserved.</span>
                    <div className="flex gap-4">
                        <a href="#" className="hover:opacity-80 transition-opacity">Privacy</a>
                        <a href="#" className="hover:opacity-80 transition-opacity">Terms</a>
                        <a href="#" className="hover:opacity-80 transition-opacity">Security</a>
                    </div>
                </div>
            </div>

            {/* Right: form panel */}
            <div
                className="lg:col-span-2 relative flex flex-col items-center justify-center min-h-screen p-6 sm:p-10 overflow-hidden"
                style={{ perspective: '1600px', backgroundColor: `${PALETTE.mint}4d` }}
            >
                <div
                    className="absolute inset-0 opacity-60"
                    style={{
                        backgroundImage: `radial-gradient(${PALETTE.slate}22 1px, transparent 1px)`,
                        backgroundSize: '22px 22px',
                    }}
                    aria-hidden="true"
                />
                <div
                    className="motion-safe-anim absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl"
                    style={{ animation: 'orbDriftA 15s ease-in-out infinite', backgroundColor: `${PALETTE.teal}40` }}
                    aria-hidden="true"
                />
                <div
                    className="motion-safe-anim absolute -bottom-28 -left-16 h-72 w-72 rounded-full blur-3xl"
                    style={{ animation: 'orbDriftB 19s ease-in-out infinite', backgroundColor: `${PALETTE.cream}80` }}
                    aria-hidden="true"
                />
                <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: `linear-gradient(to right, ${PALETTE.slate}, ${PALETTE.teal}, ${PALETTE.slate})` }}
                    aria-hidden="true"
                />

                <div className="relative z-10 w-full max-w-sm">
                    <div className="mb-8 flex justify-center">
                        <LogoMark
                            height={100}
                            tilt={logoTilt}
                            onMouseMove={handleLogoMouseMove}
                            onMouseLeave={handleLogoMouseLeave}
                        />
                    </div>

                    <div className="mb-7 text-center">
                        <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: PALETTE.deep }}>
                            Sign in to your account
                        </h1>
                        <p className="mt-1.5 text-sm" style={{ color: `${PALETTE.deep}99` }}>
                            Welcome back. Enter your credentials to continue.
                        </p>
                    </div>

                    {status && (
                        <div
                            className="mb-5 flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium shadow-sm"
                            style={{
                                backgroundColor: PALETTE.cream,
                                border: `1px solid ${PALETTE.slate}40`,
                                color: PALETTE.deep,
                            }}
                        >
                            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: PALETTE.action }} />
                            {status}
                        </div>
                    )}

                    <Card
                        className="transition-transform duration-300 will-change-transform hover:[transform:rotateX(1.5deg)_rotateY(-1.5deg)_translateZ(0)]"
                        style={{
                            transformStyle: 'preserve-3d',
                            backgroundColor: 'white',
                            borderColor: `${PALETTE.slate}33`,
                            boxShadow: `0 1px 2px rgba(15,23,42,0.04), 0 8px 16px -4px ${PALETTE.slate}1f, 0 24px 48px -12px ${PALETTE.slate}26`,
                        }}
                    >
                        <CardContent className="px-6 py-6">
                            <form onSubmit={submit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-sm font-medium" style={{ color: PALETTE.deep }}>
                                        Work email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        autoComplete="username"
                                        autoFocus
                                        placeholder="you@company.com"
                                        className="h-10 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]"
                                        style={{ '--tw-ring-color': PALETTE.teal }}
                                        onFocus={(e) => (e.currentTarget.style.borderColor = PALETTE.teal)}
                                        onBlur={(e) => (e.currentTarget.style.borderColor = '')}
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-sm font-medium" style={{ color: PALETTE.deep }}>
                                            Password
                                        </Label>
                                        {canResetPassword && (
                                            <Link
                                                href={route('password.request')}
                                                className="text-xs font-medium transition-colors"
                                                style={{ color: PALETTE.action }}
                                            >
                                                Forgot password?
                                            </Link>
                                        )}
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        className="h-10 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]"
                                        onChange={(e) => setData('password', e.target.value)}
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <Checkbox
                                        id="remember"
                                        checked={data.remember}
                                        onCheckedChange={(checked) => setData('remember', checked)}
                                        style={{
                                            backgroundColor: data.remember ? PALETTE.action : undefined,
                                            borderColor: data.remember ? PALETTE.action : undefined,
                                        }}
                                    />
                                    <Label
                                        htmlFor="remember"
                                        className="text-sm font-normal cursor-pointer"
                                        style={{ color: `${PALETTE.deep}b3` }}
                                    >
                                        Keep me signed in for 30 days
                                    </Label>
                                </div>

                                {/* Primary button — palette-driven, tactile press */}
                                <Button
                                    type="submit"
                                    className="w-full h-10 mt-1 font-medium text-white transition-all duration-100 active:translate-y-[3px]"
                                    style={{
                                        background: `linear-gradient(to bottom, ${PALETTE.teal}, ${PALETTE.action})`,
                                        boxShadow: `0 4px 0 0 ${PALETTE.actionEdge}, 0 6px 14px -2px ${PALETTE.action}80`,
                                    }}
                                    onMouseDown={(e) => {
                                        e.currentTarget.style.boxShadow = `0 1px 0 0 ${PALETTE.actionEdge}, 0 2px 4px -1px ${PALETTE.action}80`;
                                    }}
                                    onMouseUp={(e) => {
                                        e.currentTarget.style.boxShadow = `0 4px 0 0 ${PALETTE.actionEdge}, 0 6px 14px -2px ${PALETTE.action}80`;
                                    }}
                                    disabled={processing}
                                >
                                    {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {processing ? 'Signing in…' : 'Sign in'}
                                </Button>
                            </form>

                            <div
                                className="mt-5 flex items-center gap-1.5 justify-center text-xs"
                                style={{ color: `${PALETTE.deep}66` }}
                            >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Protected by enterprise-grade encryption
                            </div>
                        </CardContent>
                    </Card>

                    <p className="mt-6 text-center text-sm" style={{ color: `${PALETTE.deep}99` }}>
                        Don&apos;t have an account?{' '}
                        <Link
                            href={route('register')}
                            className="font-medium transition-colors"
                            style={{ color: PALETTE.action }}
                        >
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}