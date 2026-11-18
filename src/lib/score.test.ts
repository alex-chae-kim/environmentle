import { describe, expect, it } from 'vitest'
import { COLUMNS } from '../config/columns'
import { buildModel } from './data'
import { ACHIEVED_KEY, NO_TARGET_KEY, netZeroDisplay, netZeroKey } from './netZero'
import { arrowFor, scoreGuess, tierFor } from './score'
import type { Country, Dataset } from './types'

const T = { green: 5, yellow: 15, orange: 30 }

describe('tierFor thresholds', () => {
  it('exact value match beats any percentile gap', () => {
    expect(tierFor(10, 10, 40, 40, T)).toBe('exact')
  })
  it.each([
    [0, 'green'],
    [5, 'green'],
    [5.01, 'yellow'],
    [15, 'yellow'],
    [15.01, 'orange'],
    [30, 'orange'],
    [30.01, 'red'],
    [100, 'red'],
  ] as const)('gap %d → %s', (gap, tier) => {
    expect(tierFor(1, 2, 0, gap, T)).toBe(tier)
    expect(tierFor(2, 1, gap, 0, T)).toBe(tier) // symmetric
  })
  it('respects custom thresholds', () => {
    expect(tierFor(1, 2, 0, 8, { green: 10, yellow: 20, orange: 40 })).toBe('green')
  })
  it('is gray when either value is null', () => {
    expect(tierFor(null, 2, null, 50, T)).toBe('na')
    expect(tierFor(2, null, 50, null, T)).toBe('na')
  })
})

describe('arrowFor', () => {
  it('points toward the answer', () => {
    expect(arrowFor(1, 5)).toBe('up')
    expect(arrowFor(5, 1)).toBe('down')
    expect(arrowFor(3, 3)).toBeNull()
    expect(arrowFor(null, 3)).toBeNull()
    expect(arrowFor(3, null)).toBeNull()
  })
})

describe('net-zero ordering', () => {
  const nz = (year: number | null, status: string) => ({ net_zero_year: year, net_zero_status: status })
  const achieved = nz(null, 'Achieved (self-declared)')
  const y2040 = nz(2040, 'In law')
  const y2050 = nz(2050, 'In policy document')
  const none = nz(null, 'No net-zero target')
  const notListed = nz(null, 'No target listed')
  const noYear = nz(null, 'In policy document') // e.g. United States

  it('orders achieved < years < no target', () => {
    const keys = [achieved, y2040, y2050, none].map(netZeroKey)
    expect(keys).toEqual([...keys].sort((a, b) => a - b))
    expect(netZeroKey(achieved)).toBe(ACHIEVED_KEY)
    expect(netZeroKey(none)).toBe(NO_TARGET_KEY)
  })
  it('treats no-target, not-listed and no-year as the same "latest" value', () => {
    expect(netZeroKey(notListed)).toBe(NO_TARGET_KEY)
    expect(netZeroKey(noYear)).toBe(NO_TARGET_KEY)
  })
  it('guess with no target vs answer with a year → answer is earlier (↓)', () => {
    expect(arrowFor(netZeroKey(none), netZeroKey(y2050))).toBe('down')
  })
  it('both without a target → exact match, no arrow', () => {
    expect(tierFor(netZeroKey(none), netZeroKey(notListed), 90, 90, T)).toBe('exact')
    expect(arrowFor(netZeroKey(none), netZeroKey(noYear))).toBeNull()
  })
  it('achieved answer vs a 2050 guess → answer is earlier', () => {
    expect(arrowFor(netZeroKey(y2050), netZeroKey(achieved))).toBe('down')
  })
  it('displays each kind distinctly', () => {
    expect([achieved, y2040, none, notListed, noYear].map(netZeroDisplay)).toEqual([
      'Achieved',
      '2040',
      'None',
      'None',
      'No year',
    ])
  })
})

function country(iso3: string, over: Partial<Country> = {}): Country {
  return {
    iso3,
    name: iso3,
    region: 'R',
    subregion: 'S',
    epi_score: 50,
    epi_rank: 1,
    co2_per_capita_t: 5,
    co2_total_mt: 100,
    renewables_share_elec_pct: 50,
    pm25_ugm3: 10,
    climate_laws_count: 10,
    net_zero_year: 2050,
    net_zero_status: 'In law',
    years: { co2: 2025, co2_per_capita: 2025, renewables: 2025, pm25: 2024 },
    ...over,
  }
}

const sources = { epi: '', co2: '', renewables: '', pm25: '', climate_laws: '', net_zero: '' }

describe('scoreGuess', () => {
  const dataset: Dataset = {
    meta: { generated: '', country_count: 3, sources },
    countries: [
      country('AAA', { co2_per_capita_t: 1, renewables_share_elec_pct: null, net_zero_year: null, net_zero_status: 'No net-zero target' }),
      country('BBB', { co2_per_capita_t: 2 }),
      country('CCC', { co2_per_capita_t: 14.5 }),
    ],
  }
  const model = buildModel(dataset, COLUMNS)

  it('returns one cell per column in config order', () => {
    expect(scoreGuess(model, 'AAA', 'BBB').map((c) => c.columnId)).toEqual(COLUMNS.map((c) => c.id))
  })

  it('shows "—" and gray for null data, with an aria label saying so', () => {
    const cell = scoreGuess(model, 'AAA', 'BBB').find((c) => c.columnId === 'renewables')
    expect(cell).toMatchObject({ tier: 'na', arrow: null, text: '—' })
    expect(cell?.ariaLabel).toContain('no data')
  })

  it('builds a descriptive aria label', () => {
    const cell = scoreGuess(model, 'CCC', 'AAA').find((c) => c.columnId === 'co2pc')
    expect(cell?.ariaLabel).toBe('CO₂ per person: 14.5 tonnes, far from the answer, answer is lower')
  })

  it('marks identical values as exact, even between different countries', () => {
    const cell = scoreGuess(model, 'BBB', 'CCC').find((c) => c.columnId === 'epi')
    expect(cell).toMatchObject({ tier: 'exact', arrow: null })
  })

  it('net-zero: no target guess vs 2050 answer → colored, ↓ "earlier"', () => {
    const cell = scoreGuess(model, 'AAA', 'BBB').find((c) => c.columnId === 'netzero')
    expect(cell?.tier).not.toBe('na')
    expect(cell?.arrow).toBe('down')
    expect(cell?.text).toBe('None')
    expect(cell?.ariaLabel).toContain('answer is earlier')
  })
})
