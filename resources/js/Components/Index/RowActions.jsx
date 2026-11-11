/** The buttons in the last column of a table row. Put this inside a normal <TableCell>. */
export default function RowActions({ children }) {
    return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}
