import { describe, expect, it } from 'vitest'
import {
  displayedStreak,
  emptyStats,
  parseSavedGame,
  parseStats,
  recordResult,
  SafeStore,
  type KeyValueStore,
} from './storage'

class FakeStorage implements KeyValueStore {
  data = new Map<string, string>()
  getItem(k: string) {
    return this.data.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.data.set(k, v)
  }
}

const throwing: KeyValueStore = {
  getItem() {
    throw new Error('SecurityError')
  },
  setItem() {
    throw new Error('QuotaExceededError')
  },
}

describe('SafeStore', () => {
  it('round-trips JSON through the backing store', () => {
    const backing = new FakeStorage()
    const s = new SafeStore(backing)
    s.setJson('k', { a: 1 })
    expect(backing.data.get('k')).toBe('{"a":1}')
    expect(s.getJson('k')).toEqual({ a: 1 })
  })
  it('falls back to memory when storage throws', () => {
    const s = new SafeStore(throwing)
    expect(s.get('k')).toBeNull()
    s.setJson('k', [1, 2])
    expect(s.getJson('k')).toEqual([1, 2])
  })
  it('works with no storage at all', () => {
    const s = new SafeStore(null)
    s.set('k', 'v')
    expect(s.get('k')).toBe('v')
  })
  it('returns null for corrupt JSON', () => {
    const backing = new FakeStorage()
    backing.setItem('k', '{not json')
    expect(new SafeStore(backing).getJson('k')).toBeNull()
  })
})

describe('parseSavedGame', () => {
  it('accepts a valid save for the same day', () => {
    expect(parseSavedGame({ version: 1, day: 3, guesses: ['FRA'] }, 3)).toEqual({ version: 1, day: 3, guesses: ['FRA'] })
  })
  it('ignores other days, other versions and malformed data', () => {
    expect(parseSavedGame({ version: 1, day: 2, guesses: [] }, 3)).toBeNull()
    expect(parseSavedGame({ version: 2, day: 3, guesses: [] }, 3)).toBeNull()
    expect(parseSavedGame({ version: 1, day: 3, guesses: [1] }, 3)).toBeNull()
    expect(parseSavedGame(null, 3)).toBeNull()
  })
})

describe('stats', () => {
  it('parseStats falls back to empty on bad data', () => {
    expect(parseStats(null)).toEqual(emptyStats())
    expect(parseStats({ version: 1, played: 'x' })).toEqual(emptyStats())
    expect(parseStats({ version: 0, played: 1, wins: 1, currentStreak: 1, maxStreak: 1, lastDay: 0 })).toEqual(emptyStats())
  })

  it('counts wins and builds a streak on consecutive days', () => {
    let s = emptyStats()
    s = recordResult(s, 0, 'won')
    s = recordResult(s, 1, 'won')
    s = recordResult(s, 2, 'won')
    expect(s).toMatchObject({ played: 3, wins: 3, currentStreak: 3, maxStreak: 3, lastDay: 2 })
  })

  it('resets the streak on a loss or a skipped day, keeping the max', () => {
    let s = emptyStats()
    s = recordResult(s, 0, 'won')
    s = recordResult(s, 1, 'won')
    s = recordResult(s, 2, 'lost')
    expect(s).toMatchObject({ played: 3, wins: 2, currentStreak: 0, maxStreak: 2 })
    s = recordResult(s, 3, 'won')
    s = recordResult(s, 5, 'won') // skipped day 4
    expect(s).toMatchObject({ currentStreak: 1, maxStreak: 2 })
  })

  it('is idempotent for the same day and ignores unfinished games', () => {
    const once = recordResult(emptyStats(), 4, 'won')
    expect(recordResult(once, 4, 'won')).toBe(once)
    expect(recordResult(once, 5, 'playing')).toBe(once)
  })

  it('shows a broken streak if yesterday was missed', () => {
    const s = recordResult(emptyStats(), 4, 'won')
    expect(displayedStreak(s, 5)).toBe(1)
    expect(displayedStreak(s, 6)).toBe(0)
  })
})
