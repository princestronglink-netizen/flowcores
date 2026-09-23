import * as React from "react"

import { cn } from "@/lib/utils"

// Same token system as AuthenticatedLayout — keep these in sync.
const PALETTE = {
    mint: '#f1e3dd',
    teal: '#8d9db6',
    cream: '#bccad6',
    slate: '#667292',
    deep: '#262b3d',
    deepEdge: '#3a4157',
};

function Table({
  className,
  ...props
}) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
      style={{
        border: `1px solid ${PALETTE.cream}`,
        boxShadow: '0 1px 3px rgba(38,43,61,0.06), 0 1px 2px rgba(38,43,61,0.04)',
      }}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props} />
    </div>
  );
}

function TableHeader({
  className,
  ...props
}) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      style={{
        background: `linear-gradient(180deg, ${PALETTE.mint}80 0%, ${PALETTE.cream}40 100%)`,
      }}
      {...props} />
  );
}

function TableBody({
  className,
  ...props
}) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props} />
  );
}

function TableFooter({
  className,
  ...props
}) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t font-medium [&>tr]:last:border-b-0", className)}
      style={{
        borderColor: PALETTE.cream,
        backgroundColor: `${PALETTE.cream}33`,
        color: PALETTE.slate,
      }}
      {...props} />
  );
}

function TableRow({
  className,
  ...props
}) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors duration-150 data-[state=selected]:bg-[var(--row-selected)]",
        className
      )}
      style={{
        borderColor: `${PALETTE.cream}99`,
        '--row-selected': `${PALETTE.teal}1f`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${PALETTE.teal}14`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      {...props} />
  );
}

function TableHead({
  className,
  ...props
}) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      style={{ color: PALETTE.slate }}
      {...props} />
  );
}

function TableCell({
  className,
  ...props
}) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-3 align-middle whitespace-nowrap text-sm [&:has([role=checkbox])]:pr-0",
        className
      )}
      style={{ color: PALETTE.deep }}
      {...props} />
  );
}

function TableCaption({
  className,
  ...props
}) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm", className)}
      style={{ color: `${PALETTE.slate}99` }}
      {...props} />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}