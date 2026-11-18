/** Cell scoring: color tier from the percentile gap, plus the direction arrow. */
import { THRESHOLDS } from '../config/game'
import type { GameModel } from './data'
import type { Arrow, CellResult, ColumnDef, Country, Tier } from './types'

export type Thresholds = { green: number; yellow: number; orange: number }

/** Tier from the two raw values and their percentiles. */
export function tierFor(
  guessValue: number | null,
  answerValue: number | null,
  guessPct: number | null,
  answerPct: number | null,
  thresholds: Thresholds = THRESHOLDS,
): Tier {
  if (guessValue === null || answerValue === null || guessPct === null || answerPct === null) {
    return 'na'
  }
  if (guessValue === answerValue) return 'exact'
  const gap = Math.abs(guessPct - answerPct)
  if (gap <= thresholds.green) return 'green'
  if (gap <= thresholds.yellow) return 'yellow'
  if (gap <= thresholds.orange) return 'orange'
  return 'red'
}

/** 'up' when the answer's value is higher than the guess's. */
export function arrowFor(guessValue: number | null, answerValue: number | null): Arrow {
  if (guessValue === null || answerValue === null || guessValue === answerValue) return null
  return answerValue > guessValue ? 'up' : 'down'
}

export const TIER_WORDS: Record<Tier, string> = {
  exact: 'exact match',
  green: 'very close to the answer',
  yellow: 'close to the answer',
  orange: 'somewhat far from the answer',
  red: 'far from the answer',
  na: 'no data to compare',
}

export function scoreCell(
  column: ColumnDef,
  guess: Country,
  answer: Country,
  model: Pick<GameModel, 'percentiles'>,
  thresholds: Thresholds = THRESHOLDS,
): CellResult {
  const pcts = model.percentiles.get(column.id)
  const gv = column.value(guess)
  const av = column.value(answer)
  const tier = tierFor(gv, av, pcts?.get(guess.iso3) ?? null, pcts?.get(answer.iso3) ?? null, thresholds)
  const arrow = arrowFor(gv, av)

  const parts = [`${column.label}: ${column.spoken(guess)}`, TIER_WORDS[tier]]
  if (arrow) parts.push(`answer is ${column.directionWords[arrow]}`)

  return {
    columnId: column.id,
    tier,
    arrow,
    text: column.display(guess),
    ariaLabel: parts.join(', '),
  }
}

export function scoreGuess(
  model: GameModel,
  guessIso3: string,
  answerIso3: string,
  thresholds: Thresholds = THRESHOLDS,
): CellResult[] {
  const guess = model.byIso3.get(guessIso3)
  const answer = model.byIso3.get(answerIso3)
  if (!guess || !answer) throw new Error(`Unknown country ${guess ? answerIso3 : guessIso3}`)
  return model.columns.map((col) => scoreCell(col, guess, answer, model, thresholds))
}
