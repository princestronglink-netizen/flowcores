// resources/js/Components/ui/table.jsx
// shadcn/ui Table (JavaScript version). Same exports the pages already import:
//   import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@/Components/ui/table';
import * as React from 'react';
import { cx } from '@/Components/ui/kit';

const Table = React.forwardRef(({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
        <table ref={ref} className={cx('w-full caption-bottom text-sm', className)} {...props} />
    </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
    <thead ref={ref} className={cx('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
    <tbody ref={ref} className={cx('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cx('border-t bg-slate-50 font-medium [&>tr]:last:border-b-0', className)} {...props} />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
    <tr
        ref={ref}
        className={cx('border-b transition-colors hover:bg-slate-50/60 data-[state=selected]:bg-slate-100', className)}
        {...props}
    />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
    <th
        ref={ref}
        className={cx(
            'h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-slate-500 [&:has([role=checkbox])]:pr-0',
            className,
        )}
        {...props}
    />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
    <td ref={ref} className={cx('px-3 py-3 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props} />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
    <caption ref={ref} className={cx('mt-4 text-sm text-slate-500', className)} {...props} />
));
TableCaption.displayName = 'TableCaption';

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
