const norm = (s) => String(s ?? '').trim().toLowerCase();
const money = (n) => Math.round(Number(n || 0) * 100) / 100;
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '');
const peso = (n) => money(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// One key per VARIANT (item + brand + variant). Falls back to item + brand when a line has no variant id.
const lineKey = (l) => (l.item_variant_id ? `v${l.item_variant_id}` : `${norm(l.item_name)}|${norm(l.brand_name)}`);

// Variant text: quotation lines carry variant.label, client PO lines carry variant_label.
const variantText = (l) => {
    const v = l.variant_label ?? l.variant?.label ?? null;
    return v && v !== '—' ? String(v) : null;
};

// "Item · Brand · Variant" for the messages.
const lineLabel = (l) => [l.item_name, l.brand_name, variantText(l)].filter(Boolean).join(' · ');

/**
 * Group lines by item + brand + variant so duplicate lines add up.
 * `amt` is the LINE TOTAL (quantity x unit price), which is what gets compared. Not the unit price.
 */
function aggregate(lines, qtyField = 'quantity') {
    const map = new Map();
    lines.forEach((l) => {
        const k = lineKey(l);
        const row = map.get(k) ?? { name: lineLabel(l), qty: 0, delivered: 0, amt: 0 };
        row.qty += Number(l[qtyField] ?? 0);
        row.delivered += Number(l.delivered_quantity ?? 0);
        row.amt += Number(l[qtyField] ?? 0) * Number(l.unit_price ?? 0);
        map.set(k, row);
    });
    return map;
}

/**
 * Returns [{ id, title, ok, summary, problems: string[], links: [{label, href}] }].
 * needQuotation / needPo / needDelivery = which checks apply to this pipeline (based on its stage flags).
 * checkAmounts = false when the user can't see prices: total comparisons are skipped
 * (the prices are not in the data), quantity checks still run.
 * canPrint = false when the user may not open the printable quotation (auth.can.print_quotation):
 * the "View / Print" link is left out (the server checks this again).
 *
 * Lines are matched per item + brand + variant, and every message names all three.
 */
export function buildCompletionChecks(tx, { needQuotation, needPo, needDelivery, checkAmounts = true, canPrint = true }) {
    const checks = [];
    const lines = tx.items ?? [];
    const cpos = (tx.client_purchase_orders ?? []).filter((c) => c.status !== 'cancelled');
    const confirmedPos = cpos.filter((c) => c.status === 'confirmed'); // only confirmed POs are compared
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
            links:
                tx.quotation_number && checkAmounts && canPrint
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

    /* 4. Quotation ↔ PO ↔ Delivered must match (quantities and line TOTALS, per item + brand + variant) */
    {
        const problems = [];
        const q = aggregate(lines);
        const p = needPo && confirmedPos.length > 0 ? aggregate(confirmedPos.flatMap((c) => c.items ?? [])) : null;
        if (needPo && confirmedPos.length === 0) problems.push('There is no confirmed client purchase order to compare with.');

        q.forEach((row, key) => {
            if (p) {
                const po = p.get(key);
                if (!po) problems.push(`${row.name}: on the quotation but not on the PO.`);
                else {
                    if (po.qty !== row.qty) problems.push(`${row.name}: quotation ${row.qty} vs PO ${po.qty}.`);
                    if (checkAmounts && money(po.amt) !== money(row.amt)) {
                        problems.push(`${row.name}: total differs (quotation ${peso(row.amt)}, PO ${peso(po.amt)}).`);
                    }
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

            if (checkAmounts) {
                // Items total (before markup and VAT) on both sides.
                const poItemsTotal = confirmedPos.reduce(
                    (s, c) => s + (c.items ?? []).reduce((a, i) => a + Number(i.quantity) * Number(i.unit_price), 0),
                    0
                );
                if (money(poItemsTotal) !== money(tx.subtotal)) {
                    problems.push(`PO items total (${peso(poItemsTotal)}) differs from the quotation items total (${peso(tx.subtotal)}).`);
                }

                // Grand total (with markup and VAT) on both sides.
                const poGrand = confirmedPos.reduce((s, c) => s + Number(c.total ?? 0), 0);
                if (money(poGrand) !== money(tx.total)) {
                    problems.push(`PO grand total (${peso(poGrand)}) differs from the quotation grand total (${peso(tx.total)}).`);
                }
            }
        }

        checks.push({
            id: 'match',
            title: [
                'Quotation',
                needPo && 'PO',
                needDelivery && 'delivered',
            ].filter(Boolean).join(' · ') + ' match',
            ok: problems.length === 0,
            summary: problems.length === 0
                ? (checkAmounts ? 'Items, quantities and totals agree.' : 'Items and quantities agree.')
                : '',
            problems,
            links: [],
        });
    }

    return checks;
}