/** Country-name matching for the guess input. */

export interface NameEntry {
  iso3: string
  /** Canonical dataset name, shown in suggestions. */
  name: string
  /** The name or alias this entry matches on (original spelling). */
  label: string
  /** Normalized form of `label`. */
  key: string
  isAlias: boolean
}

export interface NameIndex {
  entries: NameEntry[]
  byKey: Map<string, string>
  ambiguous: Map<string, string[]>
  notInGame: Map<string, string>
}

export interface Suggestion {
  iso3: string
  name: string
  /** Set when the match came from an alternate name, e.g. "USA". */
  alias?: string
}

export type ResolveResult =
  | { kind: 'ok'; iso3: string }
  | { kind: 'ambiguous'; options: string[] }
  | { kind: 'notInGame'; name: string }
  | { kind: 'unknown' }

/**
 * Lowercase, strip accents, treat punctuation as spaces, "&" → "and",
 * "st" → "saint", and drop a leading "the".
 */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '') // "Côte d'Ivoire" → "cote divoire", "U.S." → "us"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '')
    .replace(/\bst\b/g, 'saint')
}

export function buildNameIndex(
  countries: readonly { iso3: string; name: string }[],
  aliases: Record<string, string[]>,
  ambiguous: Record<string, string[]> = {},
  notInGame: readonly string[] = [],
): NameIndex {
  const entries: NameEntry[] = []
  const byKey = new Map<string, string>()
  for (const c of countries) {
    const labels = [c.name, ...(aliases[c.iso3] ?? [])]
    labels.forEach((label, i) => {
      const key = normalize(label)
      const existing = byKey.get(key)
      if (existing && existing !== c.iso3) {
        throw new Error(`Name "${label}" matches both ${existing} and ${c.iso3}`)
      }
      byKey.set(key, c.iso3)
      entries.push({ iso3: c.iso3, name: c.name, label, key, isAlias: i > 0 })
    })
  }
  return {
    entries,
    byKey,
    ambiguous: new Map(Object.entries(ambiguous).map(([k, v]) => [normalize(k), v])),
    notInGame: new Map(notInGame.map((n) => [normalize(n), n])),
  }
}

/** Resolves free text typed by the player (e.g. pressing Enter without choosing). */
export function resolveGuess(input: string, index: NameIndex): ResolveResult {
  const key = normalize(input)
  if (!key) return { kind: 'unknown' }
  const iso3 = index.byKey.get(key)
  if (iso3) return { kind: 'ok', iso3 }
  const options = index.ambiguous.get(key)
  if (options) return { kind: 'ambiguous', options }
  const missing = index.notInGame.get(key)
  if (missing) return { kind: 'notInGame', name: missing }
  return { kind: 'unknown' }
}

/**
 * Autocomplete suggestions, best first: whole-name prefix, then word prefix,
 * then substring. Each country appears once; canonical-name matches beat aliases.
 */
export function searchNames(
  input: string,
  index: NameIndex,
  options: { limit?: number; exclude?: ReadonlySet<string> } = {},
): Suggestion[] {
  const { limit = 8, exclude } = options
  const q = normalize(input)
  if (!q) return []

  const best = new Map<string, { score: number; entry: NameEntry }>()
  for (const entry of index.entries) {
    if (exclude?.has(entry.iso3)) continue
    let score: number
    if (entry.key === q) score = 0
    else if (entry.key.startsWith(q)) score = 1
    else if (entry.key.split(' ').some((w) => w.startsWith(q))) score = 2
    else if (entry.key.includes(q)) score = 3
    else continue
    score += entry.isAlias ? 0.5 : 0
    const prev = best.get(entry.iso3)
    if (!prev || score < prev.score) best.set(entry.iso3, { score, entry })
  }

  return [...best.values()]
    .sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit)
    .map(({ entry }) => ({
      iso3: entry.iso3,
      name: entry.name,
      ...(entry.isAlias ? { alias: entry.label } : {}),
    }))
}
