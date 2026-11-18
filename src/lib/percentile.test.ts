import { describe, expect, it } from 'vitest'
import { percentileRanks } from './percentile'

describe('percentileRanks', () => {
  it('spreads distinct values from 0 to 100', () => {
    expect(percentileRanks([10, 30, 20, 40, 50])).toEqual([0, 50, 25, 75, 100])
  })

  it('gives tied values the same mid-rank percentile', () => {
    // sorted: 1, 2, 2, 3 → positions 0, 1, 2, 3; ties share position 1.5
    expect(percentileRanks([2, 1, 3, 2])).toEqual([50, 0, 100, 50])
  })

  it('ignores nulls and keeps them null', () => {
    expect(percentileRanks([null, 5, 10, null])).toEqual([null, 0, 100, null])
  })

  it('handles a single value and all-null input', () => {
    expect(percentileRanks([7, null])).toEqual([50, null])
    expect(percentileRanks([null, null])).toEqual([null, null])
  })

  it('handles all-equal values', () => {
    expect(percentileRanks([4, 4, 4])).toEqual([50, 50, 50])
  })
})
