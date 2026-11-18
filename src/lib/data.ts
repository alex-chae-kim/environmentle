/**
 * Validates the raw dataset and builds the precomputed model the game uses:
 * a lookup by ISO3 and a percentile table for every column.
 */
import { percentileRanks } from './percentile'
import type { ColumnDef, Country, Dataset, DataYears, SourceKey } from './types'

/** Percentiles keyed by column id, then ISO3. */
export type PercentileTable = Map<string, Map<string, number | null>>

export interface GameModel {
  meta: Dataset['meta']
  countries: Country[]
  byIso3: Map<string, Country>
  columns: ColumnDef[]
  percentiles: PercentileTable
}

const SOURCE_KEYS: SourceKey[] = ['epi', 'co2', 'renewables', 'pm25', 'climate_laws', 'net_zero']

type Obj = Record<string, unknown>

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(o: Obj, key: string, where: string): string {
  const v = o[key]
  if (typeof v !== 'string') throw new Error(`${where}: "${key}" should be a string`)
  return v
}

function numOrNull(o: Obj, key: string, where: string): number | null {
  const v = o[key]
  if (v === null) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`${where}: "${key}" should be a number or null`)
  }
  return v
}

function parseCountry(raw: unknown, index: number): Country {
  if (!isObj(raw)) throw new Error(`countries[${index}] is not an object`)
  const where = `countries[${index}]`
  const yearsRaw = raw.years
  if (!isObj(yearsRaw)) throw new Error(`${where}: "years" should be an object`)
  const years: DataYears = {
    co2: numOrNull(yearsRaw, 'co2', where),
    co2_per_capita: numOrNull(yearsRaw, 'co2_per_capita', where),
    renewables: numOrNull(yearsRaw, 'renewables', where),
    pm25: numOrNull(yearsRaw, 'pm25', where),
  }
  return {
    iso3: str(raw, 'iso3', where),
    name: str(raw, 'name', where),
    region: str(raw, 'region', where),
    subregion: str(raw, 'subregion', where),
    epi_score: numOrNull(raw, 'epi_score', where),
    epi_rank: numOrNull(raw, 'epi_rank', where),
    co2_per_capita_t: numOrNull(raw, 'co2_per_capita_t', where),
    co2_total_mt: numOrNull(raw, 'co2_total_mt', where),
    renewables_share_elec_pct: numOrNull(raw, 'renewables_share_elec_pct', where),
    pm25_ugm3: numOrNull(raw, 'pm25_ugm3', where),
    climate_laws_count: numOrNull(raw, 'climate_laws_count', where),
    net_zero_year: numOrNull(raw, 'net_zero_year', where),
    net_zero_status: str(raw, 'net_zero_status', where),
    years,
  }
}

/** Checks the JSON's shape at runtime so the rest of the app can trust the types. */
export function parseDataset(raw: unknown): Dataset {
  if (!isObj(raw) || !isObj(raw.meta) || !Array.isArray(raw.countries)) {
    throw new Error('Dataset should look like { meta, countries[] }')
  }
  const meta = raw.meta
  const sourcesRaw = meta.sources
  if (!isObj(sourcesRaw)) throw new Error('meta.sources should be an object')
  const sources = {} as Record<SourceKey, string>
  for (const key of SOURCE_KEYS) sources[key] = str(sourcesRaw, key, 'meta.sources')

  const countries = raw.countries.map(parseCountry)
  const seen = new Set<string>()
  for (const c of countries) {
    if (seen.has(c.iso3)) throw new Error(`Duplicate iso3 ${c.iso3}`)
    seen.add(c.iso3)
  }

  return {
    meta: {
      generated: str(meta, 'generated', 'meta'),
      country_count: countries.length,
      sources,
    },
    countries,
  }
}

export function buildPercentiles(countries: Country[], columns: ColumnDef[]): PercentileTable {
  const table: PercentileTable = new Map()
  for (const col of columns) {
    const pcts = percentileRanks(countries.map(col.value))
    table.set(col.id, new Map(countries.map((c, i) => [c.iso3, pcts[i]])))
  }
  return table
}

export function buildModel(dataset: Dataset, columns: ColumnDef[]): GameModel {
  return {
    meta: dataset.meta,
    countries: dataset.countries,
    byIso3: new Map(dataset.countries.map((c) => [c.iso3, c])),
    columns,
    percentiles: buildPercentiles(dataset.countries, columns),
  }
}
