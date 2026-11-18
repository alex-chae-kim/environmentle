import { useMemo, useState } from 'react'
import { ColumnLegend } from './components/ColumnLegend'
import { EndPanel } from './components/EndPanel'
import { GuessCard } from './components/GuessCard'
import { GuessInput } from './components/GuessInput'
import { MAX_GUESSES } from './config/game'
import { useGame } from './hooks/useGame'
import { scoreGuess } from './lib/score'
import { model, nameIndex } from './model'

const nameOf = (iso3: string) => model.byIso3.get(iso3)?.name ?? iso3

function App() {
  const { state, guess, puzzleNumber, overridden } = useGame()
  // Only animate guesses made in this session, not ones restored from storage.
  const [restoredCount] = useState(state.guesses.length)

  const guessed = useMemo(() => new Set(state.guesses), [state.guesses])
  const rows = useMemo(
    () =>
      state.guesses
        .map((iso3, i) => ({ iso3, number: i + 1, cells: scoreGuess(model, iso3, state.answer) }))
        .reverse(),
    [state.guesses, state.answer],
  )
  const answer = model.byIso3.get(state.answer)

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-6">
      <header className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Environmentle</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          #{puzzleNumber}
          {overridden && ' (dev)'} · Guess {Math.min(state.guesses.length + 1, MAX_GUESSES)} of {MAX_GUESSES}
        </p>
      </header>

      {state.status === 'playing' ? (
        <GuessInput index={nameIndex} guessed={guessed} nameOf={nameOf} onGuess={guess} />
      ) : (
        answer && (
          <EndPanel
            status={state.status}
            answer={answer}
            guessCount={state.guesses.length}
            maxGuesses={MAX_GUESSES}
            model={model}
          />
        )
      )}

      <section aria-label="Your guesses" className="flex flex-col gap-2">
        <ColumnLegend columns={model.columns} />
        {rows.length === 0 ? (
          <p className="py-6 text-center text-slate-500 dark:text-slate-400">
            Guess a country to see how its environmental figures compare with today&rsquo;s answer.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((row) => (
              <GuessCard
                key={row.iso3}
                name={nameOf(row.iso3)}
                guessNumber={row.number}
                cells={row.cells}
                columns={model.columns}
                animate={row.number > restoredCount}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

export default App
