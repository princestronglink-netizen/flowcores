import { Head } from '@inertiajs/react';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// "-" for zero/empty so blank amounts look like the Excel sheet.
const num = (v) => {
    const n = Number(v ?? 0);
    if (!n) return '-';
    return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const pct = (v) => String(Number(v ?? 0)); // 10 -> "10", 12.5 -> "12.5"

const fmtDate = (v) =>
    v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

const COMPANY = {
    line1: 'RL Bldg. Francisco Street',
    line2: 'Brgy. Pulong Sta. Cruz, Sta. Rosa, Laguna',
    email: 'purchasing@stronglinkservices.net',
    telefax: '(049) 539-3215',
    mobile: '09285058436',
    // Fallbacks only: the real values come from the transaction (prepared_by / prepared_by_position).
    preparedBy: '',
    position: '',
};

/*
 * Column widths of the items table (%). The vertical lines are drawn from these numbers,
 * and the totals box reuses them, so everything lines up. They must add up to 100.
 *   NO. | DESCRIPTION | QTY | UOM | UNIT PRICE | AMOUNT
 */
const COLS = [8, 43, 9, 9, 15, 16];
const EDGES = COLS.slice(0, -1).map((_, i) => COLS.slice(0, i + 1).reduce((a, b) => a + b, 0)); // 8, 51, 60, 69, 84
const LABEL_W = COLS[4]; // UNIT PRICE column = totals label
const AMOUNT_W = COLS[5]; // AMOUNT column = totals amount
const TOTALS_W = LABEL_W + AMOUNT_W; // 31

// One thin line per column edge, drawn down the whole items area (also through the empty space).
const columnLines = EDGES.map((e) => `linear-gradient(#000, #000) calc(${e}% - 1px) 0 / 1px 100% no-repeat`).join(',\n        ');

const css = `
/* Full A4 sheet with a small margin. The page grows to fill it, so nothing is left blank at the bottom. */
@page { size: A4 portrait; margin: 8mm; }

.qt {
    font-family: 'Segoe UI', Tahoma, Verdana, Arial, sans-serif;
    font-size: 10.5px;
    line-height: 1.35;
    color: #000;
    width: 194mm;
    min-height: 279mm;
    margin: 0 auto;
    background: #fff;
    display: flex;
    flex-direction: column;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
.qt * { box-sizing: border-box; }
.qt table { border-collapse: collapse; width: 100%; }

/* ---------- Letterhead ---------- */
.qt .letterhead { display: grid; grid-template-columns: 1fr auto 1fr; gap: 4mm; align-items: center; padding-bottom: 2.5mm; }
.qt .letterhead .logo { display: block; height: 18mm; }
.qt .addr { font-size: 9.5px; line-height: 1.45; align-self: end; }
.qt .tel { font-size: 9.5px; line-height: 1.45; justify-self: end; align-self: start; }

/* ---------- Main box (grows to fill the page) ---------- */
.qt .box { flex: 1; display: flex; flex-direction: column; border: 1.5px solid #000; }

.qt .titlebar { text-align: center; border-bottom: 1.5px solid #000; padding: .8mm 0; }
.qt .titlebar h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 1px; }

.qt .info { display: grid; grid-template-columns: 1fr 70mm; }
.qt .info > div { padding: 3mm 4mm; }
.qt .kv { display: grid; gap: 1.2mm 2mm; margin: 0; grid-template-columns: 20mm 1fr; }
.qt .meta .kv { grid-template-columns: 22mm 1fr; }
.qt .kv dd { margin: 0; }
.qt .kv dd.name { font-weight: 700; font-size: 12px; }

.qt .greeting { padding: 1mm 4mm 2.5mm; }
.qt .greeting p { margin: 0; }

/* ---------- Items (this area stretches; the column lines run to the bottom) ---------- */
.qt .itemsWrap {
    flex: 1;
    border-top: 1.5px solid #000;
    background:
        ${columnLines};
}
.qt .items { table-layout: fixed; }
.qt .items th { font-weight: 700; padding: 1.8mm 2mm; text-align: center; border-bottom: 1.5px solid #000; }
.qt .items td { padding: 0 2.5mm; height: 6.2mm; vertical-align: middle; }
.qt .items .c { text-align: center; }
.qt .items .r { text-align: right; font-variant-numeric: tabular-nums; }
.qt .items .nf { text-align: center; font-weight: 700; letter-spacing: 1.5px; }

/* ---------- Remarks + totals ---------- */
.qt .bottom { display: grid; grid-template-columns: ${100 - TOTALS_W}% ${TOTALS_W}%; border-top: 1.5px solid #000; }
.qt .remarks { padding: 2mm 4mm; border-right: 1px solid #000; }
.qt .remarks .label { margin-bottom: 2.5mm; }
.qt .remarks .body { text-align: center; font-style: italic; white-space: pre-line; }
.qt .totals { table-layout: fixed; }
.qt .totals td { padding: 1.5mm 2.5mm; border: 1px solid #000; }
.qt .totals tr:first-child td { border-top: 0; }
.qt .totals td:first-child { width: ${(LABEL_W / TOTALS_W) * 100}%; border-left: 0; }
.qt .totals td:last-child { width: ${(AMOUNT_W / TOTALS_W) * 100}%; border-right: 0; text-align: right; font-variant-numeric: tabular-nums; }
.qt .totals .grand td { font-weight: 700; border-bottom: 0; }
.qt .grand .amt { display: flex; justify-content: space-between; gap: 3mm; }

/* ---------- Prepared by ---------- */
.qt .sign { margin-top: 6mm; padding-left: 2mm; line-height: 1.5; }
.qt .sign .space { height: 11mm; }

@media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    .no-print { display: none !important; }
    .qt { width: 100%; }
    .qt .items thead { display: table-header-group; }
    .qt .items tr, .qt .bottom, .qt .sign, .qt .info { break-inside: avoid; page-break-inside: avoid; }
}
`;

export default function Print({ quotation: q }) {
    const items = q.items ?? [];
    const date = q.quotation_date ?? q.created_at;

    // Old versions stored remarks under "note".
    const remarks = (q.remarks ?? q.note ?? '').trim();

    // ---- Totals: subtotal -> markup -> VAT -> total amount ----
    const lineAmount = (i) => i.subtotal ?? Number(i.quantity ?? 0) * Number(i.unit_price ?? 0);
    const markupPct = Number(q.markup_percent ?? 0);
    const vatPct = Number(q.vat_percent ?? 0);

    const subtotal = round2(items.reduce((s, i) => s + Number(lineAmount(i) || 0), 0));
    const markup = round2(subtotal * (markupPct / 100));
    const net = round2(subtotal + markup);
    const vat = round2(net * (vatPct / 100));
    const total = round2(net + vat);

    const contact = q.contact_person?.contact_person;
    const site = q.site ?? q.client?.site;
    const uom = (i) => i.uom ?? i.unit ?? i.variant?.unit_of_measure ?? '';

    return (
        <div className="bg-white p-4 print:p-0">
            <Head title={q.quotation_number} />
            <style>{css}</style>

            <div className="no-print mb-4 text-center">
                <button onClick={() => window.print()} className="rounded-md bg-[#667292] px-4 py-2 text-white">
                    Print / Save as PDF
                </button>
            </div>

            <div className="qt">
                {/* Logo file: public/images/stronglink-logo.png */}
                <header className="letterhead">
                    <div className="addr">
                        <div>{COMPANY.line1}</div>
                        <div>{COMPANY.line2}</div>
                        <div>Email Add.: {COMPANY.email}</div>
                    </div>
                    <img className="logo" src="/images/stronglink-logo.png" alt="Stronglink Services" />
                    <div className="tel">
                        <div>Telefax no.: {COMPANY.telefax}</div>
                        <div>Mobile no.: {COMPANY.mobile}</div>
                    </div>
                </header>

                <div className="box">
                    <div className="titlebar">
                        <h1>QUOTATION</h1>
                    </div>

                    <section className="info">
                        <div className="to">
                            <dl className="kv">
                                <dt>To:</dt>
                                <dd className="name">{q.client?.client_name}</dd>
                                <dt>Address:</dt>
                                <dd>{q.client?.address || '—'}</dd>
                                {site && (
                                    <>
                                        <dt>Site:</dt>
                                        <dd>{site}</dd>
                                    </>
                                )}
                                <dt>Attn.:</dt>
                                <dd>{contact || '—'}</dd>
                            </dl>
                        </div>
                        <div className="meta">
                            <dl className="kv">
                                <dt>Date:</dt>
                                <dd>{fmtDate(date)}</dd>
                                <dt>Ctrl No.:</dt>
                                <dd>{q.quotation_number}</dd>
                            </dl>
                        </div>
                    </section>

                    <div className="greeting">
                        {contact && <p>Dear {contact},</p>}
                        <p>We are pleased to submit our best offer for your requirement.</p>
                    </div>

                    {/* Items: the wrapper stretches to the bottom, the column lines are its background */}
                    <div className="itemsWrap">
                        <table className="items">
                            <colgroup>
                                {COLS.map((w, i) => (
                                    <col key={i} style={{ width: `${w}%` }} />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>NO.</th>
                                    <th>DESCRIPTION</th>
                                    <th>QTY</th>
                                    <th>UOM</th>
                                    <th>UNIT PRICE</th>
                                    <th>AMOUNT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((i, idx) => (
                                    <tr key={i.id ?? idx}>
                                        <td className="c">{idx + 1}</td>
                                        <td>
                                            {i.item_name}
                                            {i.brand_name ? ` | ${i.brand_name}` : ''}
                                        </td>
                                        <td className="c">{i.quantity}</td>
                                        <td className="c">{uom(i)}</td>
                                        <td className="r">{num(i.unit_price)}</td>
                                        <td className="r">{num(lineAmount(i))}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td />
                                    <td className="nf">NOTHING FOLLOWS</td>
                                    <td /><td /><td /><td />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <section className="bottom">
                        <div className="remarks">
                            <div className="label">Remarks:</div>
                            <div className="body">{remarks}</div>
                        </div>
                        <table className="totals">
                            <tbody>
                                <tr>
                                    <td>Subtotal</td>
                                    <td>{num(subtotal)}</td>
                                </tr>
                                <tr>
                                    <td>Mark Up{markupPct > 0 ? ` (${pct(markupPct)}%)` : ''}</td>
                                    <td>{num(markup)}</td>
                                </tr>
                                <tr>
                                    <td>VAT{vatPct > 0 ? ` (${pct(vatPct)}%)` : ''}</td>
                                    <td>{num(vat)}</td>
                                </tr>
                                <tr className="grand">
                                    <td>Total Amount</td>
                                    <td>
                                        <div className="amt">
                                            <span>₱</span>
                                            <span>{num(total)}</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </div>

                <section className="sign">
                    <div>Prepared by:</div>
                    <div className="space" />
                    <div>{q.prepared_by || COMPANY.preparedBy}</div>
                    <div>{q.prepared_by_position || COMPANY.position}</div>
                </section>
            </div>
        </div>
    );
}