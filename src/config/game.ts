/** Tunable game settings. */

export const MAX_GUESSES = 6

/**
 * Percentile-gap thresholds (inclusive upper bounds) for cell colors.
 * An exact value match is always 'exact'; a gap above `orange` is red.
 */
export const THRESHOLDS = {
  green: 5,
  yellow: 15,
  orange: 30,
} as const

/** Puzzle #1 is on this local date. Format YYYY-MM-DD. */
export const LAUNCH_DATE = '2026-11-17'

/** Seed for the daily answer shuffle. Changing it changes every future answer. */
export const DAILY_SEED = 20261117

/** Prefix for localStorage keys. */
export const STORAGE_PREFIX = 'environmentle'
