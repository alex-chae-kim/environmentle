/**
 * Versioned persistence in localStorage. Every access is wrapped in try/catch;
 * if storage is unavailable (private mode, blocked, quota) we fall back to an
 * in-memory map so the game still works for the session.
 */
import type { GameStatus } from './types'

export const SAVE_VERSION = 1

export interface SavedGame {
  version: typeof SAVE_VERSION
  day: number
  guesses: string[]
}

export interface Stats {
  version: typeof SAVE_VERSION
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  /** Day index of the last finished game, or null. */
  lastDay: number | null
}

/** Minimal subset of the Web Storage API, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export class SafeStore {
  private memory = new Map<string, string>()
  private readonly backing: KeyValueStore | null

  constructor(backing: KeyValueStore | null) {
    this.backing = backing
  }

  get(key: string): string | null {
    if (this.memory.has(key)) return this.memory.get(key) ?? null
    try {
      return this.backing?.getItem(key) ?? null
    } catch {
      return null
    }
  }

  set(key: string, value: string): void {
    try {
      if (!this.backing) throw new Error('no storage')
      this.backing.setItem(key, value)
      this.memory.delete(key)
    } catch {
      this.memory.set(key, value)
    }
  }

  getJson(key: string): unknown {
    const raw = this.get(key)
    if (raw === null) return null
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }

  setJson(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value))
  }
}

/** Returns window.localStorage if it exists and is usable, else null. */
export function browserStorage(): KeyValueStore | null {
  try {
    const s = globalThis.localStorage
    if (!s) return null
    const probe = '__environmentle_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

export function parseSavedGame(raw: unknown, day: number): SavedGame | null {
  if (!isObj(raw) || raw.version !== SAVE_VERSION || raw.day !== day) return null
  if (!Array.isArray(raw.guesses) || !raw.guesses.every((g) => typeof g === 'string')) return null
  return { version: SAVE_VERSION, day, guesses: raw.guesses as string[] }
}

export function emptyStats(): Stats {
  return { version: SAVE_VERSION, played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastDay: null }
}

export function parseStats(raw: unknown): Stats {
  if (!isObj(raw) || raw.version !== SAVE_VERSION) return emptyStats()
  const { played, wins, currentStreak, maxStreak, lastDay } = raw
  if (![played, wins, currentStreak, maxStreak].every(isInt)) return emptyStats()
  if (lastDay !== null && !isInt(lastDay)) return emptyStats()
  return {
    version: SAVE_VERSION,
    played: played as number,
    wins: wins as number,
    currentStreak: currentStreak as number,
    maxStreak: maxStreak as number,
    lastDay,
  }
}

/**
 * Records a finished game. Idempotent per day, so a re-render or a reload
 * can't count the same game twice. A streak continues only from the previous day.
 */
export function recordResult(stats: Stats, day: number, status: GameStatus): Stats {
  if (status === 'playing') return stats
  if (stats.lastDay !== null && day <= stats.lastDay) return stats
  const won = status === 'won'
  const continues = stats.lastDay === day - 1
  const currentStreak = won ? (continues ? stats.currentStreak : 0) + 1 : 0
  return {
    version: SAVE_VERSION,
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastDay: day,
  }
}

/** The streak to display today: it's broken if yesterday's puzzle wasn't finished. */
export function displayedStreak(stats: Stats, today: number): number {
  if (stats.lastDay === null || stats.lastDay < today - 1) return 0
  return stats.currentStreak
}

export function storageKeys(prefix: string) {
  return { game: `${prefix}:game`, stats: `${prefix}:stats` }
}
