/** The row of tabs / search / filters that sits above every table. */
export default function FilterBar({ children }) {
    return <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>;
}
