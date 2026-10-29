const norm = (s) => String(s ?? '').trim().toLowerCase();
const lineKey = (l) => `${norm(l.item_name)}|${norm(l.brand_name)}`;
const money = (n) => Math.round(Number(n || 0) * 100) / 100;
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '');

/** Group lines by item + brand so duplicate lines add up. */
function aggregate(lines, qtyField = 'quantity') {
    const map = new Map();
    lines.forEach((l) => {
        const k = lineKey(l);
        const row = map.get(k) ?? { name: l.item_name, qty: 0, delivered: 0, price: Number(l.unit_price ?? 0) };
        row.qty += Number(l[qtyField] ?? 0);
        row.delivered += Number(l.delivered_quantity ?? 0);
        map.set(k, row);
    });
    return map;
}

/**
 * Returns [{ id, title, ok, summary, problems: string[], links: [{label, href}] }].
 * need = which checks apply to this pipeline (based on its stage flags).
 */
export function buildCompletionChecks(tx, { needQuotation, needPo, needDelivery }) {
    const checks = [];
    const lines = tx.items ?? [];
    const cpos = (tx.client_purchase_orders ?? []).filter((c) => c.status !== 'cancelled');
    const deliveries = (tx.deliveries ?? []).filter((d) => !d.is_return);

    /* 1. Final quotation */
    if (needQuotation) {
        const problems = [];
        if (!tx.quotation_number) problems.push('No quotation number has been issued.');
        else if (!tx.quotation_frozen) problems.push('The quotation is not final yet (it has not been marked as sent).');

        checks.push({
            id: 'quotation',
            title: 'Final quotation',
            ok: problems.length === 0,
            summary: tx.quotation_number ? `${tx.quotation_number}${tx.version_label ? ` · ${tx.version_label}` : ''}` : '',
            problems,
            links: tx.quotation_number
                ? [{ label: 'View / Print', href: route('transactions.quotation.print', tx.id) }]
                : [],
        });
    }

    /* 2. Client purchase order */
    if (needPo) {
        const problems = [];
        if (cpos.length === 0) problems.push('There is no client purchase order.');
        cpos.forEach((c) => {
            if (c.status === 'draft') problems.push(`${c.cpo_number} is still a draft. Confirm it first.`);
            if (!String(c.client_po_number ?? '').trim()) problems.push(`${c.cpo_number} has no client PO number.`);
        });

        checks.push({
            id: 'po',
            title: 'Client purchase order',
            ok: problems.length === 0,
            summary: cpos.map((c) => c.cpo_number).join(', '),
            problems,
            links: [],
        });
    }

    /* 3. DR numbers + softcopies */
    if (needDelivery) {
        const problems = [];
        if (deliveries.length === 0) problems.push('No deliveries have been recorded.');
        deliveries.forEach((d) => {
            const when = fmtDate(d.delivered_at);
            if (!String(d.dr_number ?? '').trim()) problems.push(`Delivery on ${when} has no DR number.`);
            if (!d.dr_file_url) problems.push(`Delivery on ${when}${d.dr_number ? ` (DR ${d.dr_number})` : ''} has no DR softcopy.`);
        });

        checks.push({
            id: 'dr',
            title: 'DR numbers & softcopies',
            ok: problems.length === 0,
            summary: `${deliveries.length} ${deliveries.length === 1 ? 'delivery' : 'deliveries'}`,
            problems,
            links: deliveries
                .filter((d) => d.dr_file_url)
                .map((d) => ({ label: d.dr_number ? `DR ${d.dr_number}` : 'DR file', href: d.dr_file_url })),
        });
    }

    /* 4. Quotation ↔ PO ↔ Delivered must match */
    {
        const problems = [];
        const q = aggregate(lines);
        const p = needPo ? aggregate(cpos.flatMap((c) => c.items ?? [])) : null;

        q.forEach((row, key) => {
            if (p) {
                const po = p.get(key);
                if (!po) problems.push(`${row.name}: on the quotation but not on the PO.`);
                else {
                    if (po.qty !== row.qty) problems.push(`${row.name}: quotation ${row.qty} vs PO ${po.qty}.`);
                    if (money(po.price) !== money(row.price)) problems.push(`${row.name}: unit price differs (quotation ${row.price}, PO ${po.price}).`);
                }
            }
            if (needDelivery) {
                const target = p?.get(key)?.qty ?? row.qty;
                if (row.delivered !== target) {
                    problems.push(`${row.name}: ${p ? 'PO' : 'ordered'} ${target} vs delivered ${row.delivered}.`);
                }
            }
        });

        if (p) {
            p.forEach((row, key) => {
                if (!q.has(key)) problems.push(`${row.name}: on the PO but not on the quotation.`);
            });

            const poLinesTotal = cpos.reduce(
                (s, c) => s + (c.items ?? []).reduce((a, i) => a + Number(i.quantity) * Number(i.unit_price), 0),
                0
            );
            const poAmount = cpos.reduce((s, c) => s + Number(c.amount ?? 0), 0);
            if (money(poLinesTotal) !== money(poAmount)) problems.push('PO amount does not equal the total of its items.');
            if (money(poAmount) !== money(tx.subtotal)) problems.push(`PO amount (${money(poAmount)}) differs from the quotation subtotal (${money(tx.subtotal)}).`);
        }

        checks.push({
            id: 'match',
            title: [
                'Quotation',
                needPo && 'PO',
                needDelivery && 'delivered',
            ].filter(Boolean).join(' · ') + ' match',
            ok: problems.length === 0,
            summary: problems.length === 0 ? 'Items, quantities and amounts agree.' : '',
            problems,
            links: [],
        });
    }

    return checks;
}