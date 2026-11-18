import { describe, expect, it } from 'vitest'
import { AMBIGUOUS, ALIASES, NOT_IN_GAME } from '../data/aliases'
import rawDataset from '../data/countries.json'
import { parseDataset } from './data'
import { buildNameIndex, normalize, resolveGuess, searchNames } from './match'

const countries = parseDataset(rawDataset).countries
const index = buildNameIndex(countries, ALIASES, AMBIGUOUS, NOT_IN_GAME)
const iso = (text: string) => {
  const r = resolveGuess(text, index)
  return r.kind === 'ok' ? r.iso3 : r.kind
}

describe('normalize', () => {
  it('strips accents, case, punctuation and a leading "the"', () => {
    expect(normalize('  Côte d’Ivoire ')).toBe('cote divoire')
    expect(normalize('São Tomé and Príncipe')).toBe('sao tome and principe')
    expect(normalize('U.S.A.')).toBe('usa')
    expect(normalize('The Gambia')).toBe('gambia')
    expect(normalize('Bosnia & Herzegovina')).toBe('bosnia and herzegovina')
    expect(normalize('St. Lucia')).toBe('saint lucia')
  })
})

describe('resolveGuess', () => {
  it('accepts canonical names ignoring accents and case', () => {
    expect(iso('turkiye')).toBe('TUR')
    expect(iso("COTE D'IVOIRE")).toBe('CIV')
    expect(iso('sao tome and principe')).toBe('STP')
    expect(iso('germany')).toBe('DEU')
  })

  it.each([
    ['USA', 'USA'],
    ['US', 'USA'],
    ['u.s.', 'USA'],
    ['America', 'USA'],
    ['United States of America', 'USA'],
    ['UK', 'GBR'],
    ['Britain', 'GBR'],
    ['Great Britain', 'GBR'],
    ['DRC', 'COD'],
    ['Democratic Republic of the Congo', 'COD'],
    ['Ivory Coast', 'CIV'],
    ['Czech Republic', 'CZE'],
    ['Turkey', 'TUR'],
    ['South Korea', 'KOR'],
    ['Korea', 'KOR'],
    ['Vietnam', 'VNM'],
    ['Viet Nam', 'VNM'],
    ['Laos', 'LAO'],
    ['Lao PDR', 'LAO'],
    ['Russia', 'RUS'],
    ['Russian Federation', 'RUS'],
    ['Iran', 'IRN'],
    ['Burma', 'MMR'],
    ['Cape Verde', 'CPV'],
    ['Swaziland', 'SWZ'],
    ['East Timor', 'TLS'],
    ['Holland', 'NLD'],
    ['St Lucia', 'LCA'],
    ['St. Kitts and Nevis', 'KNA'],
    ['the bahamas', 'BHS'],
  ])('%s → %s', (text, code) => {
    expect(iso(text)).toBe(code)
  })

  it('flags "Congo" as ambiguous between the two Congos', () => {
    expect(resolveGuess('Congo', index)).toEqual({ kind: 'ambiguous', options: ['COD', 'COG'] })
  })

  it('recognizes countries that are not in the game', () => {
    expect(resolveGuess('Syria', index)).toEqual({ kind: 'notInGame', name: 'Syria' })
    expect(resolveGuess('venezuela', index)).toEqual({ kind: 'notInGame', name: 'Venezuela' })
  })

  it('rejects unknown and empty input', () => {
    expect(iso('Atlantis')).toBe('unknown')
    expect(iso('   ')).toBe('unknown')
  })
})

describe('alias data integrity', () => {
  const isoSet = new Set(countries.map((c) => c.iso3))
  it('every alias points to a country in the dataset', () => {
    for (const code of [...Object.keys(ALIASES), ...Object.values(AMBIGUOUS).flat()]) {
      expect(isoSet.has(code), code).toBe(true)
    }
  })
  it('no "not in game" name is actually in the game', () => {
    for (const name of NOT_IN_GAME) expect(resolveGuess(name, index).kind, name).toBe('notInGame')
  })
})

describe('searchNames', () => {
  it('ranks prefix matches first', () => {
    expect(searchNames('ger', index)[0]).toMatchObject({ iso3: 'DEU' })
    expect(searchNames('ice', index)[0]).toMatchObject({ iso3: 'ISL' })
  })
  it('finds countries by alias and reports the alias', () => {
    expect(searchNames('ivory', index)[0]).toEqual({ iso3: 'CIV', name: "Côte d'Ivoire", alias: 'Ivory Coast' })
  })
  it('matches without accents', () => {
    expect(searchNames('turki', index)[0]).toMatchObject({ iso3: 'TUR' })
  })
  it('offers both Congos for "congo"', () => {
    const codes = searchNames('congo', index).map((s) => s.iso3)
    expect(codes).toEqual(expect.arrayContaining(['COD', 'COG']))
  })
  it('lists each country once and respects exclude and limit', () => {
    const results = searchNames('united', index)
    expect(new Set(results.map((r) => r.iso3)).size).toBe(results.length)
    expect(searchNames('united', index, { exclude: new Set(['USA']) }).map((r) => r.iso3)).not.toContain('USA')
    expect(searchNames('a', index, { limit: 3 })).toHaveLength(3)
  })
  it('returns nothing for empty input', () => {
    expect(searchNames('  ', index)).toEqual([])
  })
})
