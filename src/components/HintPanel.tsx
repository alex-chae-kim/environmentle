import type { Hint } from '../lib/hints'

function lockedText(remaining: number): string {
  return remaining === 1 ? 'Unlocks after 1 more wrong guess' : `Unlocks after ${remaining} more wrong guesses`
}

/** Progressive hints: unlocked ones show their value, locked ones show what's needed. */
export function HintPanel({ hints }: { hints: Hint[] }) {
  const latest = [...hints].reverse().find((h) => h.unlocked)
  return (
    <section aria-labelledby="hints-title">
      <h2 id="hints-title" className="sr-only">
        Hints
      </h2>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {hints.map((h) => (
          <li
            key={h.id}
            className={`rounded-md border px-2.5 py-1.5 text-sm ${
              h.unlocked
                ? 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/60'
                : 'border-dashed border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            <p className="text-[0.7rem] font-medium tracking-wide uppercase opacity-80">
              {!h.unlocked && <span aria-hidden="true">🔒 </span>}
              {h.label}
            </p>
            {h.unlocked ? (
              <p className="font-semibold">{h.value}</p>
            ) : (
              <p className="text-xs">{lockedText(h.remaining)}</p>
            )}
          </li>
        ))}
      </ul>
      {/* Announce newly unlocked hints to screen readers. */}
      <p aria-live="polite" className="sr-only">
        {latest?.unlocked ? `New hint. ${latest.label}: ${latest.value}` : ''}
      </p>
    </section>
  )
}
