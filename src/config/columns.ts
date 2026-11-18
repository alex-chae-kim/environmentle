/**
 * Column definitions for each guess row. Add, remove or reorder columns here;
 * scoring, tiles, headers and (later) the share grid all follow this list.
 */
import { formatMegatonnes, formatPercent, formatSmall, speakMegatonnes } from '../lib/format'
import { netZeroDisplay, netZeroKey, netZeroSpoken } from '../lib/netZero'
import type { ColumnDef, Country } from '../lib/types'

const NO_DATA = '—'

/** Builds display/spoken formatters for a plain numeric field, handling null. */
function numeric(
  get: (c: Country) => number | null,
  show: (v: number) => string,
  say: (v: number) => string,
): Pick<ColumnDef, 'value' | 'display' | 'spoken'> {
  return {
    value: get,
    display: (c) => {
      const v = get(c)
      return v === null ? NO_DATA : show(v)
    },
    spoken: (c) => {
      const v = get(c)
      return v === null ? 'no data' : say(v)
    },
  }
}

const HIGHER_LOWER = { up: 'higher', down: 'lower' }

export const COLUMNS: ColumnDef[] = [
  {
    id: 'epi',
    label: 'EPI score',
    short: 'EPI',
    tooltip:
      'Environmental Performance Index: an overall 0–100 score for how well a country protects environmental health and ecosystems. Source: Yale / Columbia EPI 2026.',
    source: 'epi',
    betterWhen: 'higher',
    directionWords: HIGHER_LOWER,
    ...numeric(
      (c) => c.epi_score,
      (v) => v.toFixed(1),
      (v) => `${v.toFixed(1)} out of 100`,
    ),
  },
  {
    id: 'co2pc',
    label: 'CO₂ per person',
    short: 'CO₂/person',
    tooltip:
      'Tonnes of carbon dioxide from fossil fuels and cement per resident per year. Source: Global Carbon Project via Our World in Data.',
    source: 'co2',
    betterWhen: 'lower',
    directionWords: HIGHER_LOWER,
    ...numeric(
      (c) => c.co2_per_capita_t,
      (v) => `${formatSmall(v)} t`,
      (v) => `${formatSmall(v)} tonnes`,
    ),
  },
  {
    id: 'co2total',
    label: 'CO₂ total',
    short: 'CO₂ total',
    tooltip:
      "A country's total yearly carbon dioxide emissions from fossil fuels and cement (Mt = million tonnes, Gt = billion). Source: Global Carbon Project via Our World in Data.",
    source: 'co2',
    betterWhen: 'lower',
    directionWords: HIGHER_LOWER,
    ...numeric((c) => c.co2_total_mt, formatMegatonnes, speakMegatonnes),
  },
  {
    id: 'renewables',
    label: 'Renewable electricity',
    short: 'Renewables',
    tooltip:
      'Share of electricity generated from renewable sources such as hydro, wind and solar. Source: Ember / Energy Institute via Our World in Data.',
    source: 'renewables',
    betterWhen: 'higher',
    directionWords: HIGHER_LOWER,
    ...numeric(
      (c) => c.renewables_share_elec_pct,
      formatPercent,
      (v) => `${formatPercent(v).replace('%', '')} percent`,
    ),
  },
  {
    id: 'pm25',
    label: 'Air pollution (PM2.5)',
    short: 'PM2.5',
    tooltip:
      'Average fine-particle air pollution people breathe, in micrograms per cubic metre. The WHO guideline is 5. Source: SatPM (WashU) via Our World in Data.',
    source: 'pm25',
    betterWhen: 'lower',
    directionWords: HIGHER_LOWER,
    ...numeric(
      (c) => c.pm25_ugm3,
      (v) => `${v.toFixed(1)} µg/m³`,
      (v) => `${v.toFixed(1)} micrograms per cubic metre`,
    ),
  },
  {
    id: 'laws',
    label: 'Climate laws & policies',
    short: 'Climate laws',
    tooltip:
      'Number of national climate laws and executive policies on record (a law and its amendments count once). Source: Climate Change Laws of the World.',
    source: 'climate_laws',
    betterWhen: 'higher',
    directionWords: HIGHER_LOWER,
    ...numeric(
      (c) => c.climate_laws_count,
      (v) => String(v),
      (v) => `${v} laws and policies`,
    ),
  },
  {
    id: 'netzero',
    label: 'Net-zero target',
    short: 'Net zero',
    tooltip:
      'The year a country aims to reach net-zero emissions. "Achieved" means it says it already has; "None" means no target. Source: Van Coppenolle (2025), Zenodo.',
    source: 'net_zero',
    betterWhen: 'earlier',
    directionWords: { up: 'later', down: 'earlier' },
    value: netZeroKey,
    display: netZeroDisplay,
    spoken: netZeroSpoken,
  },
]
