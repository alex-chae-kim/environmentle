/**
 * App-wide singletons built once at startup: the parsed dataset with its
 * percentile tables, and the country-name index.
 */
import { COLUMNS } from './config/columns'
import { AMBIGUOUS, ALIASES, NOT_IN_GAME } from './data/aliases'
import rawDataset from './data/countries.json'
import { buildModel, parseDataset } from './lib/data'
import { buildNameIndex } from './lib/match'

export const model = buildModel(parseDataset(rawDataset), COLUMNS)

export const nameIndex = buildNameIndex(model.countries, ALIASES, AMBIGUOUS, NOT_IN_GAME)
