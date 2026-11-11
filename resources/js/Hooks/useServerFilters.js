import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Keeps filter state locally (so typing feels instant) and syncs it to the URL
 * with a debounce. Any filter change goes back to page 1.
 *
 * `defaults` are the values the server assumes when a param is missing. Those (and empty values)
 * are left out of the URL, so URLs stay clean and an explicit non-default like status=all is kept.
 */
export default function useServerFilters(url, initial, defaults = { status: 'all' }) {
    const [filters, setFilters] = useState(initial);
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }

        const timer = setTimeout(() => {
            const query = Object.fromEntries(
                Object.entries(filters).filter(
                    ([key, v]) => v !== '' && v != null && v !== defaults[key],
                ),
            );
            router.get(url, query, { preserveState: true, preserveScroll: true, replace: true });
        }, 300);

        return () => clearTimeout(timer);
    }, [filters, url]);

    const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

    return [filters, set];
}