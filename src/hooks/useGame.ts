import { useCallback, useMemo, useState } from 'react'
import { DAILY_SEED, LAUNCH_DATE, STORAGE_PREFIX } from '../config/game'
import { answerForDay, dayIndex, parseDayParam } from '../lib/daily'
import { replayGuesses, submitGuess, type GuessError } from '../lib/game'
import {
  browserStorage,
  parseSavedGame,
  parseStats,
  recordResult,
  SafeStore,
  SAVE_VERSION,
  storageKeys,
  type SavedGame,
  type Stats,
} from '../lib/storage'
import type { GameState } from '../lib/types'
import { model } from '../model'

const store = new SafeStore(browserStorage())

/** Today's day index, or the `?day=N` override in development. */
function currentDay(): { day: number; overridden: boolean } {
  if (import.meta.env.DEV) {
    const override = parseDayParam(window.location.search)
    if (override !== null) return { day: override, overridden: true }
  }
  return { day: dayIndex(new Date(), LAUNCH_DATE), overridden: false }
}

const isKnown = (iso3: string) => model.byIso3.has(iso3)

interface Session {
  day: number
  overridden: boolean
  keys: ReturnType<typeof storageKeys>
}

function startSession(): Session {
  const { day, overridden } = currentDay()
  // Dev overrides use their own keys so testing other days can't clobber real progress.
  const keys = storageKeys(overridden ? `${STORAGE_PREFIX}:dev` : STORAGE_PREFIX)
  return { day, overridden, keys }
}

export function useGame() {
  const [session] = useState(startSession)
  const { day, overridden, keys } = session
  const answer = useMemo(
    () => answerForDay(day, model.countries.map((c) => c.iso3), DAILY_SEED),
    [day],
  )

  const [state, setState] = useState<GameState>(() => {
    const saved = parseSavedGame(store.getJson(keys.game), day)
    return replayGuesses(day, answer, saved?.guesses ?? [], isKnown)
  })
  const [stats, setStats] = useState<Stats>(() => parseStats(store.getJson(keys.stats)))

  const guess = useCallback(
    (iso3: string): GuessError | null => {
      const out = submitGuess(state, iso3, isKnown)
      if (!out.ok) return out.error
      const next = out.state
      setState(next)
      const save: SavedGame = { version: SAVE_VERSION, day: next.day, guesses: next.guesses }
      store.setJson(keys.game, save)

      // recordResult is idempotent per day, so a finished game is only counted once.
      const nextStats = recordResult(stats, next.day, next.status)
      if (nextStats !== stats) {
        setStats(nextStats)
        store.setJson(keys.stats, nextStats)
      }
      return null
    },
    [state, stats, keys],
  )

  return { state, stats, guess, puzzleNumber: day + 1, overridden }
}
