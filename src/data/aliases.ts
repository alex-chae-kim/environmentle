/**
 * Alternate country names accepted by the guess input. Matching ignores
 * capitalization, accents, punctuation, a leading "the" and "St"/"Saint", so
 * there's no need to list those variations.
 */

/** ISO3 → extra names. The dataset's own `name` is always accepted. */
export const ALIASES: Record<string, string[]> = {
  ARE: ['UAE', 'Emirates'],
  ATG: ['Antigua'],
  BIH: ['Bosnia', 'BiH'],
  BOL: ['Plurinational State of Bolivia'],
  BRN: ['Brunei Darussalam'],
  CAF: ['CAR'],
  CHN: ['PRC', "People's Republic of China", 'Mainland China'],
  CIV: ['Ivory Coast'],
  COD: ['DRC', 'Democratic Republic of the Congo', 'Congo-Kinshasa', 'Congo Kinshasa', 'Zaire'],
  COG: ['Republic of Congo', 'Congo Republic', 'Congo-Brazzaville', 'Congo Brazzaville'],
  CPV: ['Cape Verde'],
  CZE: ['Czech Republic', 'Czech'],
  GBR: ['UK', 'Britain', 'Great Britain', 'United Kingdom of Great Britain and Northern Ireland'],
  IRN: ['Islamic Republic of Iran', 'Persia'],
  KGZ: ['Kyrgyz Republic'],
  KNA: ['Saint Kitts', 'Saint Christopher and Nevis'],
  KOR: ['Korea', 'Republic of Korea', 'ROK'],
  LAO: ['Lao PDR', "Lao People's Democratic Republic", 'Lao'],
  MDA: ['Republic of Moldova'],
  MKD: ['Macedonia'],
  MMR: ['Burma'],
  NLD: ['Holland'],
  NZL: ['NZ', 'Aotearoa'],
  PNG: ['PNG'],
  RUS: ['Russian Federation'],
  SAU: ['KSA'],
  SLB: ['Solomons'],
  STP: ['Sao Tome'],
  SVK: ['Slovak Republic'],
  SWZ: ['Swaziland'],
  TLS: ['East Timor'],
  TTO: ['Trinidad'],
  TUR: ['Turkey'],
  TWN: ['Republic of China', 'ROC', 'Chinese Taipei'],
  TZA: ['United Republic of Tanzania'],
  USA: ['USA', 'US', 'United States of America', 'America'],
  VCT: ['Saint Vincent'],
  VNM: ['Viet Nam'],
}

/** Normalized-equivalent input that could mean several countries. */
export const AMBIGUOUS: Record<string, string[]> = {
  Congo: ['COD', 'COG'],
}

/**
 * Real countries/territories that aren't among the 2026 EPI's 177, so the input
 * can say "not in this game" instead of "unknown country".
 */
export const NOT_IN_GAME: string[] = [
  'Andorra',
  'Cuba',
  'Eritrea',
  'Greenland',
  'Hong Kong',
  'Kosovo',
  'Libya',
  'Liechtenstein',
  'Macau',
  'Marshall Islands',
  'Micronesia',
  'Monaco',
  'Nauru',
  'North Korea',
  'Palestine',
  'Puerto Rico',
  'San Marino',
  'Somalia',
  'South Sudan',
  'Syria',
  'Tuvalu',
  'Vatican City',
  'Venezuela',
  'Western Sahara',
  'Yemen',
]
