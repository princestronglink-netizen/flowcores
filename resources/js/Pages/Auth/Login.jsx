import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/Components/InputError';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

// Path to your saved logo file. Update this if you store it elsewhere.
const LOGO_URL = '/images/flowcore-logo.png';

const SLATE = '#667292';
const SLATE_DARK = '#3a4157';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <Head title="Log in" />

            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="mb-8 flex justify-center">
                    <img src={LOGO_URL} alt="FlowCore" className="h-24 w-auto object-contain" />
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                    <h1 className="text-center text-xl font-semibold" style={{ color: SLATE_DARK }}>
                        Sign in
                    </h1>

                    {status && (
                        <div className="mt-4 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700" role="status">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                autoFocus
                                placeholder="you@company.com"
                                className="h-11"
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-xs font-medium hover:underline"
                                        style={{ color: SLATE }}
                                    >
                                        Forgot password?
                                    </Link>
                                )}
                            </div>

                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="h-11 pr-11"
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>

                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="remember"
                                checked={data.remember}
                                onCheckedChange={(checked) => setData('remember', Boolean(checked))}
                            />
                            <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-slate-600">
                                Remember me
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-11 w-full font-semibold text-white hover:brightness-110 disabled:opacity-70"
                            style={{ backgroundColor: SLATE }}
                        >
                            {processing && <Loader2 className="size-4 animate-spin" />}
                            {processing ? 'Signing in…' : 'Sign in'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}