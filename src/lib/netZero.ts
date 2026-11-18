/**
 * Net-zero target ordering.
 *
 * The data's `net_zero_year` is null for three different situations:
 *  - "Achieved (self-declared)": already net zero, so it sorts EARLIEST.
 *  - "No net-zero target" / "No target listed": no target, sorts LAST.
 *  - a target status with no year (e.g. the US, Indonesia): also sorts LAST,
 *    but is displayed as "No year" rather than "None".
 */
import type { Country } from './types'

export const ACHIEVED_STATUS = 'Achieved (self-declared)'
export const NO_TARGET_STATUSES: readonly string[] = ['No net-zero target', 'No target listed']

/** Ordering key for "already achieved". Lower than any real target year. */
export const ACHIEVED_KEY = 0
/** Ordering key for "no target" / "no year". Higher than any real target year. */
export const NO_TARGET_KEY = 9999

export type NetZeroKind = 'achieved' | 'year' | 'none' | 'noYear'

export function netZeroKind(c: Pick<Country, 'net_zero_year' | 'net_zero_status'>): NetZeroKind {
  if (c.net_zero_status === ACHIEVED_STATUS) return 'achieved'
  if (c.net_zero_year !== null) return 'year'
  if (NO_TARGET_STATUSES.includes(c.net_zero_status)) return 'none'
  return 'noYear'
}

export function netZeroKey(c: Pick<Country, 'net_zero_year' | 'net_zero_status'>): number {
  switch (netZeroKind(c)) {
    case 'achieved':
      return ACHIEVED_KEY
    case 'year':
      // netZeroKind guarantees the year is non-null here.
      return c.net_zero_year ?? NO_TARGET_KEY
    case 'none':
    case 'noYear':
      return NO_TARGET_KEY
  }
}

export function netZeroDisplay(c: Pick<Country, 'net_zero_year' | 'net_zero_status'>): string {
  switch (netZeroKind(c)) {
    case 'achieved':
      return 'Achieved'
    case 'year':
      return String(c.net_zero_year)
    case 'none':
      return 'None'
    case 'noYear':
      return 'No year'
  }
}

export function netZeroSpoken(c: Pick<Country, 'net_zero_year' | 'net_zero_status'>): string {
  switch (netZeroKind(c)) {
    case 'achieved':
      return 'already achieved'
    case 'year':
      return `target year ${c.net_zero_year}`
    case 'none':
      return 'no target'
    case 'noYear':
      return 'target with no year set'
  }
}
