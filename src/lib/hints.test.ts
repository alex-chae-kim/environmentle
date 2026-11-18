import { describe, expect, it } from 'vitest'
import rawDataset from '../data/countries.json'
import { parseDataset } from './data'
import { firstLetterHint, getHints, nameLengthHint, nameShape, wrongGuessCount } from './hints'
import type { Country } from './types'

const countries = parseDataset(rawDataset).countries
const byIso = (iso: string): Country => {
  const c = countries.find((x) => x.iso3 === iso)
  if (!c) throw new Error(iso)
  return c
}

describe('wrongGuessCount', () => {
  it('counts guesses that are not the answer', () => {
    expect(wrongGuessCount({ answer: 'FRA', guesses: [] })).toBe(0)
    expect(wrongGuessCount({ answer: 'FRA', guesses: ['DEU', 'ITA'] })).toBe(2)
    expect(wrongGuessCount({ answer: 'FRA', guesses: ['DEU', 'FRA'] })).toBe(1)
  })
})

describe('unlock schedule', () => {
  const kenya = byIso('KEN')
  const unlocked = (wrong: number) => getHints(kenya, wrong).filter((h) => h.unlocked).map((h) => h.id)

  it.each([
    [0, []],
    [1, []],
    [2, ['region']],
    [3, ['region', 'subregion']],
    [4, ['region', 'subregion', 'length']],
    [5, ['region', 'subregion', 'length', 'firstLetter']],
    [6, ['region', 'subregion', 'length', 'firstLetter']],
  ])('%d wrong guesses → %j', (wrong, ids) => {
    expect(unlocked(wrong)).toEqual(ids)
  })

  it('locked hints report how many more wrong guesses are needed', () => {
    const hints = getHints(kenya, 1)
    expect(hints.map((h) => (h.unlocked ? 0 : h.remaining))).toEqual([1, 2, 3, 4])
  })

  it('reveals the right values', () => {
    expect(getHints(kenya, 5).map((h) => (h.unlocked ? h.value : null))).toEqual([
      kenya.region,
      kenya.subregion,
      '5 letters',
      'K',
    ])
  })

  it('follows a custom schedule', () => {
    const hints = getHints(kenya, 1, [{ id: 'firstLetter', label: 'First', afterWrong: 1 }])
    expect(hints).toEqual([{ id: 'firstLetter', label: 'First', afterWrong: 1, unlocked: true, value: 'K' }])
  })
})

describe('name hints', () => {
  it('counts letters only, ignoring spaces, hyphens, apostrophes and accents', () => {
    expect(nameShape('Türkiye')).toEqual({ letters: 7, words: 1 })
    expect(nameShape("Côte d'Ivoire")).toEqual({ letters: 11, words: 2 })
    expect(nameShape('Guinea-Bissau')).toEqual({ letters: 12, words: 2 })
    expect(nameShape('Bosnia and Herzegovina')).toEqual({ letters: 20, words: 3 })
  })
  it('phrases the length hint', () => {
    expect(nameLengthHint('Kenya')).toBe('5 letters')
    expect(nameLengthHint('United Kingdom')).toBe('13 letters across 2 words')
  })
  it('gives an unaccented capital first letter', () => {
    expect(firstLetterHint('São Tomé and Príncipe')).toBe('S')
    expect(firstLetterHint('DR Congo')).toBe('D')
    expect(firstLetterHint('Ôland')).toBe('O')
  })
  it('works for every country in the dataset', () => {
    for (const c of countries) {
      expect(nameShape(c.name).letters, c.name).toBeGreaterThan(2)
      expect(firstLetterHint(c.name), c.name).toMatch(/^[A-Z]$/)
    }
  })
})
