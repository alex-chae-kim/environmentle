import type { ColumnDef, CellResult } from '../lib/types'
import { Tile } from './Tile'

interface Props {
  name: string
  guessNumber: number
  cells: CellResult[]
  columns: ColumnDef[]
  animate: boolean
}

/** One guess: name + 7 tiles. A 4-column grid on phones, one aligned row from `sm` up. */
export function GuessCard({ name, guessNumber, cells, columns, animate }: Props) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2 sm:grid sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-2 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-1.5 flex items-baseline justify-between gap-2 px-0.5 sm:mb-0 sm:block">
        <span className="font-semibold">{name}</span>
        <span className="text-xs text-slate-500 sm:block dark:text-slate-400">Guess {guessNumber}</span>
      </h3>
      <ul className="grid grid-cols-4 gap-1 [perspective:600px] sm:grid-cols-7">
        {cells.map((cell, i) => (
          <Tile
            key={cell.columnId}
            cell={cell}
            shortLabel={columns[i].short}
            index={i}
            animate={animate}
          />
        ))}
      </ul>
    </li>
  )
}
