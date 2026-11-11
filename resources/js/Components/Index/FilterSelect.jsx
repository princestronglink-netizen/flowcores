import { cx, inputCls } from '@/Components/ui/kit';

export default function FilterSelect({ value, onChange, label, children }) {
    return (
        <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'w-44')}>
            {children}
        </select>
    );
}
