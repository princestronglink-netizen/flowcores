import { Head } from '@inertiajs/react';

const num = (v) =>
    Number(v ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (v) =>
    v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

// Company details printed in the header. Fill these in.
const COMPANY = {
    telefax: '',
    mobile: '',
    email: '',
    tin: '',
};

const MIN_ROWS = 22; // keeps the items table the same height as your Excel sheet

const css = `
@page { size: A4 portrait; margin: 10mm; }
.qt { font-family: Tahoma, Verdana, Arial, sans-serif; font-size: 10.5px; color: #000; width: 190mm; margin: 0 auto; background: #fff; }
.qt table { border-collapse: collapse; width: 100%; }
.qt .box { border: 1.5px solid #000; margin-top: 8px; }
.qt .title { text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 1px; padding: 2px 0; border-bottom: 1.5px solid #000; }
.qt .head td { padding: 3px 6px; }
.qt .intro { padding: 3px 6px; font-style: italic; border-top: 1.5px solid #000; }
.qt .items { border-top: 1.5px solid #000; }
.qt .items th { border-right: 1px solid #000; border-bottom: 1.5px solid #000; padding: 3px 4px; text-align: center; vertical-align: top; }
.qt .items td { border-right: 1px solid #000; padding: 2px 5px; height: 17px; vertical-align: top; }
.qt .items th:last-child, .qt .items td:last-child { border-right: 0; }
.qt .items small { display: block; font-size: 9px; margin-top: 4px; font-weight: normal; }
.qt .c { text-align: center; }
.qt .r { text-align: right; font-variant-numeric: tabular-nums; }
.qt .remarks { border-top: 1.5px solid #000; }
.qt .remarks td { vertical-align: top; padding: 3px 6px; }
.qt .sign { border: 1.5px solid #000; margin-top: 12px; height: 26mm; position: relative; }
.qt .sign td { vertical-align: top; padding: 3px 6px; }
@media print { .no-print { display: none !important; } .qt { width: 100%; } }
`;

export default function Print({ quotation: q }) {
    const items = q.items ?? [];
    const filler = Math.max(0, MIN_ROWS - items.length);
    const date = q.quotation_date ?? q.created_at;
    const terms = q.terms?.trim() ? q.terms : 'Price is Valid for 30 Days.';

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
                {/* Logo: put the file at public/images/stronglink-logo.png */}
                <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
                    <img src="/images/stronglink-logo.png" alt="Stronglink Services" style={{ height: '22mm', display: 'inline-block' }} />
                </div>

                <table>
                    <tbody>
                        <tr>
                            <td style={{ padding: '1px 4px' }}>#27 Francisco Street</td>
                            <td style={{ width: '38%', padding: '1px 4px' }}>Telefax no.: {COMPANY.telefax}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '1px 4px' }}>Brgy. Pulong Sta. Cruz, Sta. Rosa, Laguna</td>
                            <td style={{ padding: '1px 4px' }}>Mobile no.: {COMPANY.mobile}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '1px 4px' }}>Email Add.: {COMPANY.email}</td>
                            <td style={{ padding: '1px 4px' }}>VAT Reg. TIN: {COMPANY.tin}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="box">
                    <div className="title">QUOTATION</div>

                    <table className="head">
                        <tbody>
                            <tr>
                                <td style={{ width: 90 }}>To:</td>
                                <td>{q.client?.client_name}</td>
                                <td style={{ width: 60 }}>Date:</td>
                                <td style={{ width: '25%' }}>{fmtDate(date)}</td>
                            </tr>
                            <tr>
                                <td>Address:</td>
                                <td>{q.client?.address}</td>
                                <td>Ctrl no.</td>
                                <td>{q.quotation_number}</td>
                            </tr>
                            <tr><td colSpan={4} style={{ height: 8 }} /></tr>
                            <tr>
                                <td>Contact Person:</td>
                                <td colSpan={3}>{q.contact_person?.contact_person}</td>
                            </tr>
                            <tr>
                                <td>Contact Number:</td>
                                <td colSpan={3}>{q.contact_person?.contact_number}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="intro">We are pleased to submit this quotation for your requirement.</div>

                    <table className="items">
                        <colgroup>
                            <col style={{ width: '8%' }} />
                            <col />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '17%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Item no.</th>
                                <th>ITEM DESCRIPTION</th>
                                <th>QTY</th>
                                <th>UOM</th>
                                <th>UNIT PRICE<small>(VAT-EX)</small></th>
                                <th>AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((i, idx) => (
                                <tr key={i.id ?? idx}>
                                    <td className="c">{idx + 1}</td>
                                    <td>
                                        {i.item_name}
                                        {i.brand_name ? ` — ${i.brand_name}` : ''}
                                    </td>
                                    <td className="c">{i.quantity}</td>
                                    <td className="c">{i.uom ?? i.unit ?? ''}</td>
                                    <td className="r">{num(i.unit_price)}</td>
                                    <td className="r">{num(i.subtotal ?? i.quantity * i.unit_price)}</td>
                                </tr>
                            ))}
                            {Array.from({ length: filler }).map((_, k) => (
                                <tr key={`f${k}`}>
                                    <td /><td /><td /><td /><td /><td />
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <table className="remarks">
                        <tbody>
                            <tr>
                                <td>
                                    <b>REMARKS:</b>
                                    <div style={{ paddingLeft: 24, fontWeight: 'bold', whiteSpace: 'pre-line' }}>{terms}</div>
                                </td>
                                <td className="r" style={{ width: '17%', borderLeft: '1px solid #000', fontWeight: 'bold' }}>
                                    <span style={{ display: 'block', fontSize: 9, fontWeight: 'normal', textAlign: 'left' }}>
                                        TOTAL (VAT-EX)
                                    </span>
                                    {num(q.amount)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="sign">
                    <table>
                        <tbody>
                            <tr>
                                <td style={{ width: '50%' }}>Prepared by:</td>
                                <td>Approved by:</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style={{ position: 'absolute', left: 6, bottom: 3 }}>Purchasing Coordinator</div>
                </div>
            </div>
        </div>
    );
}