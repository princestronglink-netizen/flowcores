/** True when `term` appears somewhere in `values`. An empty term matches everything. */
export const matches = (term, values) => {
    const t = term.trim().toLowerCase();
    if (!t) return true;
    return values.filter(Boolean).join(' ').toLowerCase().includes(t);
};
