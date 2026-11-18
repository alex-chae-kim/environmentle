import { describe, expect, it } from 'vitest'
import { newGame, replayGuesses, submitGuess } from './game'

const known = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'ANS'])
const isKnown = (iso: string) => known.has(iso)

function play(guesses: string[]) {
  return replayGuesses(0, 'ANS', guesses, isKnown, 6)
}

describe('submitGuess', () => {
  it('adds a guess and keeps playing', () => {
    const out = submitGuess(newGame(0, 'ANS'), 'A', isKnown)
    expect(out).toMatchObject({ ok: true, state: { guesses: ['A'], status: 'playing' } })
  })
  it('wins on the correct country', () => {
    expect(play(['A', 'ANS']).status).toBe('won')
  })
  it('loses after the 6th wrong guess', () => {
    expect(play(['A', 'B', 'C', 'D', 'E']).status).toBe('playing')
    expect(play(['A', 'B', 'C', 'D', 'E', 'F']).status).toBe('lost')
  })
  it('a correct 6th guess still wins', () => {
    expect(play(['A', 'B', 'C', 'D', 'E', 'ANS']).status).toBe('won')
  })
  it('rejects repeats, unknown codes and guesses after the end', () => {
    const one = play(['A'])
    expect(submitGuess(one, 'A', isKnown)).toEqual({ ok: false, error: 'repeat' })
    expect(submitGuess(one, 'ZZZ', isKnown)).toEqual({ ok: false, error: 'unknown' })
    expect(submitGuess(play(['ANS']), 'B', isKnown)).toEqual({ ok: false, error: 'finished' })
  })
})

describe('replayGuesses', () => {
  it('drops invalid saved guesses', () => {
    expect(play(['A', 'A', 'ZZZ', 'B']).guesses).toEqual(['A', 'B'])
    expect(play(['ANS', 'B']).guesses).toEqual(['ANS'])
  })
})
