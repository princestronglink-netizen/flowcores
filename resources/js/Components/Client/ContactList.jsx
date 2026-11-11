import { Phone, Mail } from 'lucide-react';

// How many contact people show in a row before "+N more"
const VISIBLE_CONTACTS = 2;

export default function ContactList({ contacts = [] }) {
    if (contacts.length === 0) return <span className="text-slate-400">—</span>;

    const visible = contacts.slice(0, VISIBLE_CONTACTS);
    const hidden  = contacts.length - visible.length;

    return (
        <ul className="space-y-1.5">
            {visible.map((c, i) => (
                <li key={c.id ?? i}>
                    <p className="font-medium text-slate-900">{c.contact_person}</p>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        {c.contact_number && (
                            <span className="inline-flex items-center gap-1"><Phone className="size-3" />{c.contact_number}</span>
                        )}
                        {c.email && (
                            <span className="inline-flex items-center gap-1"><Mail className="size-3" />{c.email}</span>
                        )}
                    </div>
                </li>
            ))}
            {hidden > 0 && <li className="text-xs font-medium text-[#667292]">+{hidden} more</li>}
        </ul>
    );
}
