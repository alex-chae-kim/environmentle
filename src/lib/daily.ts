/** Deterministic daily answer from the player's local date. */

const MS_PER_DAY = 86_400_000

/** mulberry32: tiny seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates shuffle with a seeded PRNG. Does not mutate the input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice()
  const rand = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Parses "YYYY-MM-DD" into a UTC midnight timestamp for that calendar date. */
function calendarUtc(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) throw new Error(`Bad date "${isoDate}", expected YYYY-MM-DD`)
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * Days between the launch date and `now`'s LOCAL calendar date.
 * Uses calendar dates (not elapsed ms), so DST changes and the time of day don't matter.
 */
export function dayIndex(now: Date, launchDate: string): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today - calendarUtc(launchDate)) / MS_PER_DAY)
}

/**
 * Answer for a day index. ISO codes are sorted first so the result doesn't depend
 * on the order of the JSON file. Each pass through the list ("cycle") uses its own
 * shuffle, so no country repeats until every country has been used.
 */
export function answerForDay(day: number, iso3s: readonly string[], seed: number): string {
  if (iso3s.length === 0) throw new Error('No countries to choose from')
  const sorted = [...iso3s].sort()
  const n = sorted.length
  const cycle = Math.floor(day / n)
  const index = day - cycle * n // always 0..n-1, also for negative days
  return seededShuffle(sorted, seed + cycle)[index]
}

/** Local midnight at the start of the next day (for the countdown). */
export function nextLocalMidnight(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
}

/**
 * Dev-only override: `?day=N` selects puzzle number N (1 = launch day).
 * Returns the day index, or null when absent or invalid. The caller gates this on
 * import.meta.env.DEV.
 */
export function parseDayParam(search: string): number | null {
  const raw = new URLSearchParams(search).get('day')
  if (raw === null || !/^-?\d+$/.test(raw)) return null
  return Number(raw) - 1
}
