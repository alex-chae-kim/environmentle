/** Progressive hints that unlock as wrong guesses pile up. */
import { HINT_SCHEDULE } from '../config/game'
import type { Country, GameState } from './types'

export type HintId = (typeof HINT_SCHEDULE)[number]['id']

export interface HintSpec {
  id: HintId
  label: string
  afterWrong: number
}

export type Hint =
  | { id: HintId; label: string; afterWrong: number; unlocked: true; value: string }
  | { id: HintId; label: string; afterWrong: number; unlocked: false; remaining: number }

/** Number of guesses that weren't the answer. */
export function wrongGuessCount(state: Pick<GameState, 'guesses' | 'answer'>): number {
  return state.guesses.filter((g) => g !== state.answer).length
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Letters only (spaces, hyphens and apostrophes don't count), plus word count. */
export function nameShape(name: string): { letters: number; words: number } {
  const plain = stripAccents(name)
  const letters = (plain.match(/\p{L}/gu) ?? []).length
  const words = plain.split(/[\s-]+/).filter((w) => /\p{L}/u.test(w)).length
  return { letters, words }
}

export function nameLengthHint(name: string): string {
  const { letters, words } = nameShape(name)
  return words > 1 ? `${letters} letters across ${words} words` : `${letters} letters`
}

export function firstLetterHint(name: string): string {
  const first = stripAccents(name).match(/\p{L}/u)
  return first ? first[0].toUpperCase() : '?'
}

export function hintValue(id: HintId, answer: Country): string {
  switch (id) {
    case 'region':
      return answer.region
    case 'subregion':
      return answer.subregion
    case 'length':
      return nameLengthHint(answer.name)
    case 'firstLetter':
      return firstLetterHint(answer.name)
  }
}

/** Every hint in schedule order, with locked ones saying how many wrong guesses remain. */
export function getHints(
  answer: Country,
  wrongGuesses: number,
  schedule: readonly HintSpec[] = HINT_SCHEDULE,
): Hint[] {
  return schedule.map(({ id, label, afterWrong }) =>
    wrongGuesses >= afterWrong
      ? { id, label, afterWrong, unlocked: true, value: hintValue(id, answer) }
      : { id, label, afterWrong, unlocked: false, remaining: afterWrong - wrongGuesses },
  )
}
