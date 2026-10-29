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
 * Column widths of the items table (%). They must add up to 100.
 *   NO. | DESCRIPTION | QTY | UOM | UNIT PRICE | AMOUNT
 * The vertical lines are real cell borders, and the totals box reuses these numbers,
 * so everything lines up on screen and when printing.
 */
const COLS = [8, 43, 9, 9, 15, 16];
const LABEL_W = COLS[4]; // UNIT PRICE column = totals label
const AMOUNT_W = COLS[5]; // AMOUNT column = totals amount
const TOTALS_W = LABEL_W + AMOUNT_W; // 31

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
.qt .letterhead {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 4mm;
    align-items: center;
    padding-bottom: 2.5mm;
}
.qt .letterhead .logo { display: block; height: 18mm; }
.qt .addr { font-size: 9.5px; line-height: 1.45; align-self: end; min-width: 0; overflow-wrap: anywhere; }
.qt .tel { font-size: 9.5px; line-height: 1.45; justify-self: end; align-self: start; min-width: 0; overflow-wrap: anywhere; }

/* ---------- Main box (grows to fill the page, never lets text spill outside the border) ---------- */
.qt .box {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1.5px solid #000;
    overflow: hidden;
    min-width: 0;
}

.qt .titlebar { text-align: center; border-bottom: 1.5px solid #000; padding: .8mm 0; }
.qt .titlebar h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 1px; }

/* minmax(0, 1fr) lets the column shrink below the width of a long unbroken word */
.qt .info { display: grid; grid-template-columns: minmax(0, 1fr) 70mm; }
.qt .info > div { padding: 3mm 4mm; min-width: 0; }
.qt .kv { display: grid; gap: 1.2mm 2mm; margin: 0; grid-template-columns: 20mm minmax(0, 1fr); }
.qt .meta .kv { grid-template-columns: 22mm minmax(0, 1fr); }
.qt .kv dd { margin: 0; min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
.qt .kv dd.name { font-weight: 700; font-size: 12px; }

.qt .greeting { padding: 1mm 4mm 2.5mm; overflow-wrap: anywhere; word-break: break-word; }
.qt .greeting p { margin: 0; }

/* ---------- Items ----------
   The wrapper stretches to the bottom. The table inside it is stretched too (flex default),
   and the last "fill" row absorbs the leftover height, so the real cell borders run to the bottom. */
.qt .itemsWrap {
    flex: 1;
    display: flex;
    border-top: 1.5px solid #000;
}
.qt .items { table-layout: fixed; }
.qt .items th { font-weight: 700; padding: 1.8mm 2mm; text-align: center; border-bottom: 1.5px solid #000; }
.qt .items td {
    padding: 1mm 2.5mm;
    vertical-align: top;
    overflow-wrap: anywhere;
    word-break: break-word;
}

/* Real borders between columns (same mechanism as the totals box) */
.qt .items th,
.qt .items td { border-right: 1px solid #000; }
.qt .items th:last-child,
.qt .items td:last-child { border-right: 0; }

.qt .items tr { break-inside: avoid; page-break-inside: avoid; }
.qt .items tr.fill td { height: 100%; padding: 0; }
.qt .items .c { text-align: center; }
.qt .items .r { text-align: right; font-variant-numeric: tabular-nums; }
.qt .items .nf { text-align: center; font-weight: 700; letter-spacing: 1.5px; }

/* ---------- Remarks + totals ---------- */
/* Plain percentages so the split sits exactly on the UNIT PRICE edge. */
.qt .bottom { display: grid; grid-template-columns: ${100 - TOTALS_W}% ${TOTALS_W}%; border-top: 1.5px solid #000; }
.qt .remarks { padding: 2mm 4mm; border-right: 1px solid #000; min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
.qt .remarks .label { margin-bottom: 2.5mm; }
.qt .remarks .body { text-align: center; font-style: italic; white-space: pre-line; }

/* Totals use the same two columns as UNIT PRICE | AMOUNT, drawn with exact 1px borders. */
.qt .totals { display: grid; grid-template-columns: ${LABEL_W}fr ${AMOUNT_W}fr; }
.qt .totals > div { padding: 1.5mm 2.5mm; border-bottom: 1px solid #000; min-width: 0; }
.qt .totals > div:nth-child(odd) { border-right: 1px solid #000; }
.qt .totals > div:nth-child(even) { text-align: right; font-variant-numeric: tabular-nums; }
.qt .totals > div:nth-last-child(-n+2) { border-bottom: 0; font-weight: 700; }
.qt .totals .amt { display: flex; justify-content: space-between; gap: 3mm; }

/* ---------- Prepared by ---------- */
.qt .sign { margin-top: 6mm; padding-left: 2mm; line-height: 1.5; overflow-wrap: anywhere; }
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

                    {/* Items: real cell borders; the "fill" row stretches so the lines reach the bottom */}
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
                                    <td />
                                    <td />
                                    <td />
                                    <td />
                                </tr>
                                <tr className="fill">
                                    <td />
                                    <td />
                                    <td />
                                    <td />
                                    <td />
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <section className="bottom">
                        <div className="remarks">
                            <div className="label">Remarks:</div>
                            <div className="body">{remarks}</div>
                        </div>

                        <div className="totals">
                            <div>Subtotal</div>
                            <div>{num(subtotal)}</div>

                            <div>Mark Up{markupPct > 0 ? ` (${pct(markupPct)}%)` : ''}</div>
                            <div>{num(markup)}</div>

                            <div>VAT{vatPct > 0 ? ` (${pct(vatPct)}%)` : ''}</div>
                            <div>{num(vat)}</div>

                            <div>Total Amount</div>
                            <div>
                                <div className="amt">
                                    <span>₱</span>
                                    <span>{num(total)}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="sign">
                    <div>Prepared by:</div>
                    <div className="p-1" />
                    <div>{q.prepared_by || COMPANY.preparedBy}</div>
                    <div>{q.prepared_by_position || COMPANY.position}</div>
                </section>
            </div>
        </div>
    );
}