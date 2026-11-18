/**
 * Percentile ranks (0–100) using the mid-rank method: tied values share the
 * average of the ranks they occupy, so ties always get identical percentiles.
 * Nulls are ignored and keep a null percentile.
 */
export function percentileRanks(values: readonly (number | null)[]): (number | null)[] {
  const present = values.filter((v): v is number => v !== null).sort((a, b) => a - b)
  const n = present.length
  if (n === 0) return values.map(() => null)

  // value → percentile, computed once per distinct value.
  const byValue = new Map<number, number>()
  let i = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && present[j + 1] === present[i]) j++
    const midRank = (i + j) / 2 // 0-based average position of the tie group
    byValue.set(present[i], n === 1 ? 50 : (midRank / (n - 1)) * 100)
    i = j + 1
  }

  return values.map((v) => (v === null ? null : (byValue.get(v) ?? null)))
}
