import type { GameModel } from '../lib/data'
import type { Country, GameStatus } from '../lib/types'

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

interface Props {
  status: Exclude<GameStatus, 'playing'>
  answer: Country
  guessCount: number
  maxGuesses: number
  model: GameModel
}

export function EndPanel({ status, answer, guessCount, maxGuesses, model }: Props) {
  const total = model.countries.length
  const co2Pct = model.percentiles.get('co2pc')?.get(answer.iso3) ?? null

  return (
    <section
      aria-labelledby="end-title"
      className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id="end-title" className="text-lg font-bold">
        {status === 'won'
          ? `You got it in ${guessCount}/${maxGuesses}!`
          : `Out of guesses. The answer was ${answer.name}.`}
      </h2>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        {answer.name}
        {answer.epi_rank !== null && <> ranks <strong>{ordinal(answer.epi_rank)} of {total}</strong> on the 2026 EPI</>}
        {co2Pct !== null && (
          <>
            {' '}and emits more CO₂ per person than about <strong>{Math.round(co2Pct)}%</strong> of countries
          </>
        )}
        .
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        {model.columns.map((col) => (
          <div key={col.id} className="flex justify-between gap-2 border-b border-slate-100 py-1 dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400">{col.label}</dt>
            <dd className="font-semibold tabular-nums">{col.display(answer)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
