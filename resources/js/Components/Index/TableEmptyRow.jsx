import { TableRow, TableCell } from '@/Components/ui/table';
import EmptyState from './EmptyState';

export default function TableEmptyRow({ colSpan, title, hint }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan}>
                <EmptyState title={title} hint={hint} />
            </TableCell>
        </TableRow>
    );
}