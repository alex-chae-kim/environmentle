import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { GuessError } from '../lib/game'
import { resolveGuess, searchNames, type NameIndex } from '../lib/match'

interface Props {
  index: NameIndex
  guessed: ReadonlySet<string>
  nameOf: (iso3: string) => string
  /** Returns an error if the guess was rejected. */
  onGuess: (iso3: string) => GuessError | null
}

export function GuessInput({ index, guessed, nameOf, onGuess }: Props) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listId = useId()
  const errorId = useId()

  const suggestions = useMemo(
    () => searchNames(text, index, { exclude: guessed, limit: 8 }),
    [text, index, guessed],
  )
  const showList = open && suggestions.length > 0

  function commit(iso3: string) {
    const err = onGuess(iso3)
    if (err === 'repeat') {
      setError(`You already guessed ${nameOf(iso3)}.`)
      return
    }
    if (err) {
      setError('That guess could not be used.')
      return
    }
    setText('')
    setError(null)
    setOpen(false)
    setActive(0)
  }

  function submitText() {
    const result = resolveGuess(text, index)
    switch (result.kind) {
      case 'ok':
        commit(result.iso3)
        return
      case 'ambiguous':
        setError(`Which one? ${result.options.map(nameOf).join(' or ')}.`)
        setOpen(true)
        return
      case 'notInGame':
        setError(`${result.name} isn't one of this game's 177 countries (it isn't ranked in the 2026 EPI).`)
        return
      case 'unknown':
        setError(text.trim() ? `"${text.trim()}" isn't a country we recognise. Pick one from the list.` : null)
        return
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (showList && suggestions[active]) commit(suggestions[active].iso3)
    else submitText()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const optionId = (i: number) => `${listId}-opt-${i}`

  return (
    <form onSubmit={onSubmit} className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Guess a country
      </label>
      <div className="flex gap-2">
        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? optionId(active) : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Guess a country…"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setActive(0)
            setOpen(true)
            setError(null)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          className="rounded-md bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          Guess
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching countries"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.iso3}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault()
                commit(s.iso3)
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? 'bg-sky-100 dark:bg-sky-900/50' : ''}`}
            >
              {s.name}
              {s.alias && (
                <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">({s.alias})</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p id={errorId} role="status" aria-live="polite" className="mt-1 min-h-5 text-sm text-red-700 dark:text-red-400">
        {error}
      </p>
    </form>
  )
}
