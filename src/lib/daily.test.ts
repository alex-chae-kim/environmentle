import { describe, expect, it } from 'vitest'
import { answerForDay, dayIndex, mulberry32, nextLocalMidnight, parseDayParam, seededShuffle } from './daily'

const ISOS = Array.from({ length: 177 }, (_, i) => `C${String(i).padStart(3, '0')}`)
const SEED = 12345

describe('mulberry32 / seededShuffle', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(1)
    const b = mulberry32(1)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const out = seededShuffle(input, 7)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
    expect([...out].sort()).toEqual(input)
  })
})

describe('dayIndex', () => {
  it('is 0 on launch day at any local time', () => {
    expect(dayIndex(new Date(2026, 10, 17, 0, 0, 1), '2026-11-17')).toBe(0)
    expect(dayIndex(new Date(2026, 10, 17, 23, 59, 59), '2026-11-17')).toBe(0)
  })
  it('counts calendar days, across month/year and DST boundaries', () => {
    expect(dayIndex(new Date(2026, 10, 18, 0, 0), '2026-11-17')).toBe(1)
    expect(dayIndex(new Date(2027, 0, 1, 12), '2026-11-17')).toBe(45)
    expect(dayIndex(new Date(2027, 2, 15, 12), '2027-03-01')).toBe(14) // spans US DST start
    expect(dayIndex(new Date(2026, 10, 16, 12), '2026-11-17')).toBe(-1)
  })
  it('rejects a malformed launch date', () => {
    expect(() => dayIndex(new Date(), '17/11/2026')).toThrow()
  })
})

describe('answerForDay', () => {
  it('picks the same country for the same day', () => {
    expect(answerForDay(42, ISOS, SEED)).toBe(answerForDay(42, ISOS, SEED))
  })
  it('same date → same answer regardless of time of day', () => {
    const morning = dayIndex(new Date(2026, 11, 3, 6), '2026-11-17')
    const night = dayIndex(new Date(2026, 11, 3, 23), '2026-11-17')
    expect(answerForDay(morning, ISOS, SEED)).toBe(answerForDay(night, ISOS, SEED))
  })
  it('does not depend on the order of the input list', () => {
    const reversed = [...ISOS].reverse()
    for (const d of [0, 1, 100, 500]) expect(answerForDay(d, reversed, SEED)).toBe(answerForDay(d, ISOS, SEED))
  })
  it('uses every country once before repeating, in every cycle', () => {
    for (const cycle of [0, 1, 2]) {
      const days = ISOS.map((_, i) => answerForDay(cycle * ISOS.length + i, ISOS, SEED))
      expect(new Set(days).size).toBe(ISOS.length)
    }
  })
  it('works for negative days', () => {
    expect(ISOS).toContain(answerForDay(-1, ISOS, SEED))
  })
  it('changes with the seed', () => {
    const a = ISOS.slice(0, 20).map((_, d) => answerForDay(d, ISOS, 1))
    const b = ISOS.slice(0, 20).map((_, d) => answerForDay(d, ISOS, 2))
    expect(a).not.toEqual(b)
  })
})

describe('parseDayParam', () => {
  it('reads ?day=N as puzzle number N', () => {
    expect(parseDayParam('?day=1')).toBe(0)
    expect(parseDayParam('?day=10')).toBe(9)
  })
  it('ignores missing or invalid values', () => {
    expect(parseDayParam('')).toBeNull()
    expect(parseDayParam('?day=abc')).toBeNull()
    expect(parseDayParam('?day=1.5')).toBeNull()
  })
})

describe('nextLocalMidnight', () => {
  it('is the start of the next local day', () => {
    expect(nextLocalMidnight(new Date(2026, 11, 31, 15))).toEqual(new Date(2027, 0, 1))
  })
})
