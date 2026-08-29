import { describe, expect, it } from 'vitest'
import type { PartialAssistant } from '@deepseek-ai/dsh-client-runtime/client'
import { reasoningWaitAppearance } from '../src/client/thermometer.ts'

const ORIGIN = 1_000
const FULL_SCALE_MS = 37_000

function waiting(overrides: Partial<PartialAssistant> = {}): PartialAssistant {
  return {
    turn: 1,
    step: 1,
    blocks: [{ kind: 'reasoning', text: 'plan' }],
    waitOrigin: ORIGIN,
    ...overrides,
  }
}

describe('reasoningWaitAppearance', () => {
  it('stays idle without a current session, without wait origin, or when reasoning is not the tail', () => {
    expect(reasoningWaitAppearance(undefined, ORIGIN)).toEqual({ phase: 'idle' })
    expect(reasoningWaitAppearance(null, ORIGIN)).toEqual({ phase: 'idle' })
    expect(reasoningWaitAppearance({ turn: 1, step: 1, blocks: [] }, ORIGIN)).toEqual({ phase: 'idle' })
    expect(reasoningWaitAppearance({
      turn: 1,
      step: 1,
      blocks: [],
      waitOrigin: ORIGIN,
    }, ORIGIN)).toEqual({ phase: 'idle' })
    expect(reasoningWaitAppearance({
      turn: 1,
      step: 1,
      blocks: [{ kind: 'text', text: 'hello' }],
      waitOrigin: ORIGIN,
    }, ORIGIN)).toEqual({ phase: 'idle' })
    expect(reasoningWaitAppearance({
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'plan' }, { kind: 'tool-call', callId: 'c', name: 'read', argsRaw: '{}' }],
      waitOrigin: ORIGIN,
    }, ORIGIN)).toEqual({ phase: 'idle' })
  })

  it('opens at minimum fill and cool metal, then remaps height while color follows unmapped t', () => {
    expect(reasoningWaitAppearance(waiting(), ORIGIN)).toEqual({
      phase: 'thermometer',
      t: 0,
      height: 0.08,
      color: '#4a4d52',
    })
    const atThird = reasoningWaitAppearance(waiting(), ORIGIN + FULL_SCALE_MS / 3)
    const atTwoThirds = reasoningWaitAppearance(waiting(), ORIGIN + (2 * FULL_SCALE_MS) / 3)
    expect(atThird).toMatchObject({ phase: 'thermometer', color: '#9a2b1f' })
    expect(atTwoThirds).toMatchObject({ phase: 'thermometer', color: '#e07020' })
    if (atThird.phase !== 'thermometer' || atTwoThirds.phase !== 'thermometer') {
      throw new Error('expected thermometer')
    }
    expect(atThird.t).toBeCloseTo(1 / 3)
    expect(atThird.height).toBeCloseTo(0.08 + 0.92 * (1 / 3))
    expect(atTwoThirds.t).toBeCloseTo(2 / 3)
    expect(atTwoThirds.height).toBeCloseTo(0.08 + 0.92 * (2 / 3))
    const mid = reasoningWaitAppearance(waiting(), ORIGIN + FULL_SCALE_MS / 2)
    expect(mid).toMatchObject({
      phase: 'thermometer',
      t: 0.5,
      height: 0.08 + 0.92 * 0.5,
    })
    if (mid.phase !== 'thermometer') throw new Error('expected thermometer')
    expect(mid.color).toMatch(/^color-mix\(in oklch, #9a2b1f, #e07020 /)
    const early = reasoningWaitAppearance(waiting(), ORIGIN + FULL_SCALE_MS / 6)
    const late = reasoningWaitAppearance(waiting(), ORIGIN + (5 * FULL_SCALE_MS) / 6)
    expect(early.phase).toBe('thermometer')
    expect(late.phase).toBe('thermometer')
    if (early.phase !== 'thermometer' || late.phase !== 'thermometer') {
      throw new Error('expected thermometer')
    }
    expect(early.t).toBeCloseTo(1 / 6)
    expect(late.t).toBeCloseTo(5 / 6)
    expect(early.color).toMatch(/^color-mix\(in oklch, #4a4d52, #9a2b1f /)
    expect(late.color).toMatch(/^color-mix\(in oklch, #e07020, #ffe28a /)
  })

  it('clamps at full scale and molten yellow-white, and resumes from wait origin rather than now', () => {
    expect(reasoningWaitAppearance(waiting(), ORIGIN + FULL_SCALE_MS)).toEqual({
      phase: 'thermometer',
      t: 1,
      height: 1,
      color: '#ffe28a',
    })
    expect(reasoningWaitAppearance(waiting(), ORIGIN + FULL_SCALE_MS * 2)).toEqual({
      phase: 'thermometer',
      t: 1,
      height: 1,
      color: '#ffe28a',
    })
    expect(reasoningWaitAppearance(waiting(), ORIGIN - 1_000)).toEqual({
      phase: 'thermometer',
      t: 0,
      height: 0.08,
      color: '#4a4d52',
    })
    expect(reasoningWaitAppearance(waiting({ waitOrigin: ORIGIN - 10_000 }), ORIGIN)).toMatchObject({
      phase: 'thermometer',
      t: 10_000 / FULL_SCALE_MS,
      height: 0.08 + 0.92 * (10_000 / FULL_SCALE_MS),
    })
  })
})
