/** Number formatting helpers for tile values. */

/** One decimal, or two for values under 1 so tiny numbers don't show as "0.0". */
export function formatSmall(v: number): string {
  return Math.abs(v) < 1 && v !== 0 ? v.toFixed(2) : v.toFixed(1)
}

/** Million tonnes → compact text: "0.3 Mt", "7.5 Mt", "320 Mt", "12.4 Gt". */
export function formatMegatonnes(mt: number): string {
  if (mt >= 1000) return `${(mt / 1000).toFixed(1)} Gt`
  if (mt >= 10) return `${Math.round(mt)} Mt`
  return `${mt.toFixed(1)} Mt`
}

/** Spoken form of formatMegatonnes. */
export function speakMegatonnes(mt: number): string {
  if (mt >= 1000) return `${(mt / 1000).toFixed(1)} billion tonnes`
  if (mt >= 10) return `${Math.round(mt)} million tonnes`
  return `${mt.toFixed(1)} million tonnes`
}

/** Percent: whole number, except a non-zero share under 1% keeps one decimal. */
export function formatPercent(v: number): string {
  if (v > 0 && v < 1) return `${v.toFixed(1)}%`
  return `${Math.round(v)}%`
}
