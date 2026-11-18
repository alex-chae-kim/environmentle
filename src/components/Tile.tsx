import type { CellResult, Tier } from '../lib/types'

const TIER_CLASSES: Record<Tier, string> = {
  exact: 'bg-tile-exact text-white ring-2 ring-inset ring-white/60',
  green: 'bg-tile-green text-white',
  yellow: 'bg-tile-yellow text-tile-ink-dark',
  orange: 'bg-tile-orange text-tile-ink-dark',
  red: 'bg-tile-red text-white',
  na: 'bg-tile-na text-slate-700 dark:text-slate-200',
}

const ARROWS = { up: '↑', down: '↓' } as const

interface Props {
  cell: CellResult
  shortLabel: string
  /** Position in the row, used to stagger the reveal animation. */
  index: number
  animate: boolean
}

export function Tile({ cell, shortLabel, index, animate }: Props) {
  const mark = cell.tier === 'exact' ? '✓' : cell.arrow ? ARROWS[cell.arrow] : ''
  return (
    <li
      className={`flex min-h-14 flex-col items-center justify-center rounded-md px-1 py-1.5 text-center leading-tight ${TIER_CLASSES[cell.tier]} ${animate ? 'motion-safe:animate-reveal' : ''}`}
      style={animate ? { animationDelay: `${index * 70}ms` } : undefined}
    >
      <span className="sr-only">{cell.ariaLabel}</span>
      <span aria-hidden="true" className="text-[0.65rem] font-medium uppercase tracking-wide opacity-80 sm:hidden">
        {shortLabel}
      </span>
      <span aria-hidden="true" className="text-sm font-semibold tabular-nums">
        {cell.text}
        {mark && <span className="ml-0.5">{mark}</span>}
      </span>
    </li>
  )
}
