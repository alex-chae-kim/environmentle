/** Shapes of the dataset in src/data/countries.json (see pipeline/README.md). */

export interface Country {
  iso3: string
  name: string
  region: string
  subregion: string
  epi_score: number | null
  epi_rank: number | null
  co2_per_capita_t: number | null
  co2_total_mt: number | null
  renewables_share_elec_pct: number | null
  pm25_ugm3: number | null
  climate_laws_count: number | null
  net_zero_year: number | null
  net_zero_status: string
  years: DataYears
}

export interface DataYears {
  co2: number | null
  co2_per_capita: number | null
  renewables: number | null
  pm25: number | null
}

export type SourceKey = 'epi' | 'co2' | 'renewables' | 'pm25' | 'climate_laws' | 'net_zero'

export interface DatasetMeta {
  generated: string
  country_count: number
  sources: Record<SourceKey, string>
}

export interface Dataset {
  meta: DatasetMeta
  countries: Country[]
}

/** Which direction counts as "better" for the environment. Shown as a header icon. */
export type BetterWhen = 'higher' | 'lower' | 'earlier'

export interface ColumnDef {
  id: string
  /** Full header label, e.g. "CO₂ per person". */
  label: string
  /** Short label shown inside each tile on small screens. */
  short: string
  /** Plain-language explanation shown in the header tooltip. */
  tooltip: string
  source: SourceKey
  betterWhen: BetterWhen
  /**
   * Numeric key used for ranking and comparing. `null` means "no data" (gray cell).
   * Must be monotonic with the real-world quantity so arrows are meaningful.
   */
  value: (c: Country) => number | null
  /** Text shown in the tile. */
  display: (c: Country) => string
  /** Text read by screen readers, e.g. "14.5 tonnes". */
  spoken: (c: Country) => string
  /** Words for the arrow directions, e.g. { up: 'higher', down: 'lower' }. */
  directionWords: { up: string; down: string }
}

export type Tier = 'exact' | 'green' | 'yellow' | 'orange' | 'red' | 'na'

/** Direction from the guess to the answer: 'up' means the answer's value is higher. */
export type Arrow = 'up' | 'down' | null

export interface CellResult {
  columnId: string
  tier: Tier
  arrow: Arrow
  text: string
  ariaLabel: string
}

export type GameStatus = 'playing' | 'won' | 'lost'

export interface GameState {
  /** Day index since the launch date (0 = launch day). */
  day: number
  answer: string
  /** ISO3 codes, oldest first. */
  guesses: string[]
  status: GameStatus
}
