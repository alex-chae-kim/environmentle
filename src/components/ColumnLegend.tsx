import { useId, useState } from 'react'
import type { BetterWhen, ColumnDef } from '../lib/types'

const BETTER: Record<BetterWhen, { icon: string; text: string }> = {
  higher: { icon: '▲', text: 'Higher is better' },
  lower: { icon: '▼', text: 'Lower is better' },
  earlier: { icon: '◀', text: 'Earlier is better' },
}

function HeaderCell({ column }: { column: ColumnDef }) {
  const [open, setOpen] = useState(false)
  const tipId = useId()
  const better = BETTER[column.betterWhen]
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={tipId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className="flex h-full w-full flex-col items-center justify-center rounded-md px-1 py-1 text-center text-[0.7rem] leading-tight font-medium text-slate-600 hover:bg-slate-200/70 focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span className="sm:hidden">{column.short}</span>
        <span className="hidden sm:inline">{column.label}</span>
        <span className="mt-0.5 text-[0.6rem] text-slate-500 dark:text-slate-400" title={better.text}>
          <span aria-hidden="true">{better.icon}</span> <span className="sr-only">{better.text}</span>
          <span aria-hidden="true">better</span>
        </span>
      </button>
      <div
        id={tipId}
        role="tooltip"
        className={`absolute top-full left-1/2 z-20 mt-1 w-56 -translate-x-1/2 rounded-md bg-slate-900 p-2 text-left text-xs leading-snug text-white shadow-lg dark:bg-slate-100 dark:text-slate-900 ${open ? '' : 'hidden'}`}
      >
        <p className="mb-1 font-semibold">
          {column.label} · {better.text.toLowerCase()}
        </p>
        <p>{column.tooltip}</p>
      </div>
    </div>
  )
}

/** Column headers with "better" icons and tooltips, aligned with the tile grid. */
export function ColumnLegend({ columns }: { columns: ColumnDef[] }) {
  return (
    <div className="sm:grid sm:grid-cols-[8.5rem_1fr] sm:gap-2 sm:px-2">
      <div className="hidden sm:block" />
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
        {columns.map((c) => (
          <HeaderCell key={c.id} column={c} />
        ))}
      </div>
    </div>
  )
}
