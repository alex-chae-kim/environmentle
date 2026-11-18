/** Pure game-state transitions. */
import { MAX_GUESSES } from '../config/game'
import type { GameState } from './types'

export type GuessError = 'finished' | 'repeat' | 'unknown'

export type GuessOutcome = { ok: true; state: GameState } | { ok: false; error: GuessError }

export function newGame(day: number, answer: string): GameState {
  return { day, answer, guesses: [], status: 'playing' }
}

export function submitGuess(
  state: GameState,
  iso3: string,
  isKnown: (iso3: string) => boolean,
  maxGuesses: number = MAX_GUESSES,
): GuessOutcome {
  if (state.status !== 'playing') return { ok: false, error: 'finished' }
  if (!isKnown(iso3)) return { ok: false, error: 'unknown' }
  if (state.guesses.includes(iso3)) return { ok: false, error: 'repeat' }

  const guesses = [...state.guesses, iso3]
  const status =
    iso3 === state.answer ? 'won' : guesses.length >= maxGuesses ? 'lost' : 'playing'
  return { ok: true, state: { ...state, guesses, status } }
}

/**
 * Rebuilds a state from saved guesses, dropping anything invalid (unknown codes,
 * repeats, or guesses after the game ended).
 */
export function replayGuesses(
  day: number,
  answer: string,
  guesses: readonly string[],
  isKnown: (iso3: string) => boolean,
  maxGuesses: number = MAX_GUESSES,
): GameState {
  let state = newGame(day, answer)
  for (const g of guesses) {
    const out = submitGuess(state, g, isKnown, maxGuesses)
    if (out.ok) state = out.state
  }
  return state
}
