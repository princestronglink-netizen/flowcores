import { Search } from 'lucide-react';
import { cx, inputCls } from '@/Components/ui/kit';

export default function SearchBox({ value, onChange, placeholder = 'Search', label }) {
    return (
        <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
                type="search"
                aria-label={label ?? placeholder}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cx(inputCls, 'pl-9')}
            />
        </div>
    );
}
