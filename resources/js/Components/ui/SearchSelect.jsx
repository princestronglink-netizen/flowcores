// resources/js/Components/ui/SearchSelect.jsx
import { ChevronDown } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A dropdown you can type into to search.
 *
 *   <SearchSelect
 *       options={[{ value: 1, label: 'Acme Corp', hint: 'ACM-01', searchText: 'ACM-01' }]}
 *       value={clientId}
 *       onChange={(value) => ...}        // value is always a string
 *       placeholder="Select a client"
 *       inputClassName={input(error)}    // reuse your normal input styling
 *   />
 *
 * - Every word typed must match the label, hint or searchText (any order), e.g. "holcim 40".
 * - Arrow keys + Enter, or click, to choose. Esc or clicking outside closes it.
 * - Options can set `disabled: true` (shown greyed out, cannot be picked).
 * - The list is rendered in a portal, so it is never clipped by a card or table with overflow-hidden.
 */
export default function SearchSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Select…',
    searchPlaceholder = 'Type to search',
    emptyText = 'No matches',
    disabled = false,
    id,
    ariaLabel,
    inputClassName = '',
}) {
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [pos, setPos] = useState(null);

    const selected = options.find((o) => String(o.value) === String(value));

    const results = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (words.length === 0) return options;
        return options.filter((o) => {
            const text = `${o.label ?? ''} ${o.hint ?? ''} ${o.searchText ?? ''}`.toLowerCase();
            return words.every((w) => text.includes(w));
        });
    }, [options, query]);

    const close = () => {
        setOpen(false);
        setQuery('');
    };

    const choose = (o) => {
        if (o.disabled) return;
        onChange(String(o.value));
        close();
    };

    // place the list under the input (or above it when there is no room below)
    const place = () => {
        const el = inputRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - r.bottom;
        const openUp = spaceBelow < 260 && r.top > spaceBelow;
        setPos({
            left: r.left,
            width: r.width,
            top: openUp ? undefined : r.bottom + 4,
            bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
            maxHeight: Math.max(160, Math.min(288, (openUp ? r.top : spaceBelow) - 16)),
        });
    };

    useLayoutEffect(() => {
        if (!open) return;
        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [open]);

    // close when clicking anywhere outside the input and the list
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (inputRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
            close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // keep the highlighted row visible while using the arrow keys
    useEffect(() => {
        if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
    }, [active, open]);

    // a disabled field can never stay open
    useEffect(() => {
        if (disabled && open) close();
    }, [disabled]);

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) setOpen(true);
            else setActive((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && open) {
            e.preventDefault(); // never submit the whole form from the search box
            if (results[active]) choose(results[active]);
        } else if (e.key === 'Escape' && open) {
            e.preventDefault();
            close();
        } else if (e.key === 'Tab') {
            close();
        }
    };

    return (
        <div className="relative">
            <input
                ref={inputRef}
                id={id}
                type="text"
                role="combobox"
                aria-label={ariaLabel}
                aria-expanded={open}
                aria-autocomplete="list"
                autoComplete="off"
                disabled={disabled}
                placeholder={open ? searchPlaceholder : selected ? '' : placeholder}
                value={open ? query : selected?.label ?? ''}
                onFocus={() => {
                    setOpen(true);
                    setActive(0);
                }}
                onClick={() => !open && !disabled && setOpen(true)}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    setActive(0);
                }}
                onKeyDown={onKeyDown}
                className={inputClassName}
                style={{ paddingRight: 32, textOverflow: 'ellipsis' }}
            />
            <ChevronDown
                className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${
                    open ? 'rotate-180' : ''
                }`}
            />

            {open &&
                pos &&
                createPortal(
                    <ul
                        ref={listRef}
                        role="listbox"
                        style={{
                            position: 'fixed',
                            left: pos.left,
                            width: pos.width,
                            top: pos.top,
                            bottom: pos.bottom,
                            maxHeight: pos.maxHeight,
                            zIndex: 1000,
                        }}
                        className="overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                    >
                        {results.length === 0 ? (
                            <li className="px-3 py-2.5 text-sm text-slate-500">
                                {emptyText}
                                {query ? ` for “${query}”` : ''}
                            </li>
                        ) : (
                            results.map((o, i) => (
                                <li
                                    key={o.value}
                                    role="option"
                                    aria-selected={String(o.value) === String(value)}
                                    aria-disabled={o.disabled || undefined}
                                    // mousedown (not click) keeps focus in the input so the list doesn't flicker
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        choose(o);
                                    }}
                                    onMouseEnter={() => setActive(i)}
                                    className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                                        o.disabled ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer text-slate-800'
                                    } ${i === active && !o.disabled ? 'bg-slate-100' : ''} ${
                                        String(o.value) === String(value) ? 'font-semibold' : ''
                                    }`}
                                >
                                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                                    {o.hint && <span className="shrink-0 text-xs text-slate-500">{o.hint}</span>}
                                </li>
                            ))
                        )}
                    </ul>,
                    document.body,
                )}
        </div>
    );
}