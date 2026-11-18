import { describe, expect, it } from 'vitest'
import { COLUMNS } from '../config/columns'
import rawDataset from '../data/countries.json'
import { buildModel, parseDataset } from './data'
import { formatMegatonnes, formatPercent, formatSmall } from './format'

describe('real dataset', () => {
  const dataset = parseDataset(rawDataset)
  const model = buildModel(dataset, COLUMNS)

  it('parses all 177 countries with every source credit', () => {
    expect(dataset.countries).toHaveLength(177)
    expect(Object.keys(dataset.meta.sources).sort()).toEqual(
      ['climate_laws', 'co2', 'epi', 'net_zero', 'pm25', 'renewables'],
    )
  })

  it('has a percentile table for every column, 0–100', () => {
    for (const col of COLUMNS) {
      const pcts = [...(model.percentiles.get(col.id)?.values() ?? [])].filter((p) => p !== null)
      expect(pcts.length, col.id).toBeGreaterThan(170)
      expect(Math.min(...pcts)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...pcts)).toBeLessThanOrEqual(100)
    }
  })

  it("keeps Palau's missing renewables figure as null", () => {
    expect(model.percentiles.get('renewables')?.get('PLW')).toBeNull()
    expect(COLUMNS.find((c) => c.id === 'renewables')?.display(model.byIso3.get('PLW')!)).toBe('—')
  })

  it('every net-zero value is ranked (no gray cells in that column)', () => {
    const pcts = [...(model.percentiles.get('netzero')?.values() ?? [])]
    expect(pcts.every((p) => p !== null)).toBe(true)
  })

  it('rejects malformed data', () => {
    expect(() => parseDataset({})).toThrow()
    expect(() => parseDataset({ ...rawDataset, countries: [{ iso3: 'X' }] })).toThrow()
  })
})

describe('formatting', () => {
  it('formats megatonnes compactly', () => {
    expect(formatMegatonnes(0.1)).toBe('0.1 Mt')
    expect(formatMegatonnes(7.5)).toBe('7.5 Mt')
    expect(formatMegatonnes(319.9)).toBe('320 Mt')
    expect(formatMegatonnes(12417.5)).toBe('12.4 Gt')
  })
  it('formats small values and percents', () => {
    expect(formatSmall(4.6)).toBe('4.6')
    expect(formatSmall(0.04)).toBe('0.04')
    expect(formatPercent(52.0)).toBe('52%')
    expect(formatPercent(0.4)).toBe('0.4%')
    expect(formatPercent(0)).toBe('0%')
  })
})
