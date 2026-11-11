export const TONE = { out: 'red', low: 'amber', ok: 'emerald' };
export const STATUS_LABEL = { out: 'Out of stock', low: 'Low stock', ok: 'In stock' };

/** "Pcs · S" style label for a variant. */
export const specOf = (v) => [v.unit_of_measure, v.size].filter(Boolean).join(' · ') || '—';

export const stockOf = (v) => Number(v.stock);

// Status is computed on the server from the reorder point
// (30-day average daily demand × (lead time + safety stock days)).
export const statusOf = (v) => v.stock_status ?? 'ok';
