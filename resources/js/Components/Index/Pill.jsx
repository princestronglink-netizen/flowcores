import { cx } from '@/Components/ui/kit';

const TONES = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    brand: 'bg-[#eef1f5] text-[#3a4157] ring-[#bccad6]',
};

/** Small rounded label used for statuses, stages, versions and stock levels. */
export default function Pill({ tone = 'slate', className, children, ...rest }) {
    return (
        <span
            className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone] ?? TONES.slate, className)}
            {...rest}
        >
            {children}
        </span>
    );
}
