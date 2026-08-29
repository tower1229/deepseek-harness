import { describe, expect, it } from 'vitest'
import type { PartialAssistant } from '@deepseek-ai/dsh-client-runtime/client'
import {
  advanceReasoningWait,
  reasoningWaitAppearance,
  type ReasoningWaitState,
} from '../src/client/thermometer.ts'

const ORIGIN = 1_000
const FULL_SCALE_MS = 37_000
const DRAIN_MS = 240
const SESSION = 's1'

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

describe('advanceReasoningWait', () => {
  const input = {
    partial: waiting(),
    now: ORIGIN + FULL_SCALE_MS / 2,
    reducedMotion: false,
    sessionKey: SESSION,
  }

  it('drains height over 240ms with color frozen at the last t, then idles', () => {
    const hot = advanceReasoningWait({ phase: 'idle' }, input)
    expect(hot).toMatchObject({
      phase: 'thermometer',
      sessionKey: SESSION,
      t: 0.5,
      height: 0.08 + 0.92 * 0.5,
    })
    if (hot.phase !== 'thermometer') throw new Error('expected thermometer')
    const frozen = hot.color
    expect(frozen).toMatch(/^color-mix\(in oklch, #9a2b1f, #e07020 /)

    const ended = { ...waiting(), blocks: [...waiting().blocks, { kind: 'text' as const, text: 'done' }] }
    const start = advanceReasoningWait(hot, {
      ...input,
      partial: ended,
      now: input.now,
    })
    expect(start).toEqual({
      phase: 'drain',
      sessionKey: SESSION,
      height: hot.height,
      color: frozen,
      fromHeight: hot.height,
      startedAt: input.now,
    })

    const mid = advanceReasoningWait(start, {
      ...input,
      partial: ended,
      now: input.now + DRAIN_MS / 2,
    })
    expect(mid).toEqual({
      phase: 'drain',
      sessionKey: SESSION,
      height: hot.height * 0.5,
      color: frozen,
      fromHeight: hot.height,
      startedAt: input.now,
    })

    expect(advanceReasoningWait(mid, {
      ...input,
      partial: ended,
      now: input.now + DRAIN_MS,
    })).toEqual({ phase: 'idle' })
  })

  it('preempts drain when a new wait starts, from minimum fill and cool metal', () => {
    const draining = advanceReasoningWait(
      {
        phase: 'drain',
        sessionKey: SESSION,
        height: 0.5,
        color: '#ffe28a',
        fromHeight: 1,
        startedAt: ORIGIN,
      },
      {
        partial: waiting({ waitOrigin: ORIGIN + 10_000 }),
        now: ORIGIN + 10_000,
        reducedMotion: false,
        sessionKey: SESSION,
      },
    )
    expect(draining).toEqual({
      phase: 'thermometer',
      sessionKey: SESSION,
      t: 0,
      height: 0.08,
      color: '#4a4d52',
    })
  })

  it('skips drain under reduced motion, including a drain already in progress', () => {
    const hot = advanceReasoningWait({ phase: 'idle' }, input)
    const ended = { ...waiting(), blocks: [...waiting().blocks, { kind: 'text' as const, text: 'done' }] }
    expect(advanceReasoningWait(hot, {
      ...input,
      partial: ended,
      reducedMotion: true,
    })).toEqual({ phase: 'idle' })
    expect(advanceReasoningWait({
      phase: 'drain',
      sessionKey: SESSION,
      height: 0.5,
      color: '#ffe28a',
      fromHeight: 1,
      startedAt: ORIGIN,
    }, {
      ...input,
      partial: ended,
      reducedMotion: true,
    })).toEqual({ phase: 'idle' })
  })

  it('returns the previous object when the frame does not change', () => {
    const idle: ReasoningWaitState = { phase: 'idle' }
    expect(advanceReasoningWait(idle, {
      partial: null,
      now: 0,
      reducedMotion: false,
      sessionKey: '',
    })).toBe(idle)

    const hot = advanceReasoningWait({ phase: 'idle' }, input)
    expect(advanceReasoningWait(hot, input)).toBe(hot)

    const ended = { ...waiting(), blocks: [...waiting().blocks, { kind: 'text' as const, text: 'done' }] }
    const draining = advanceReasoningWait(hot, { ...input, partial: ended })
    expect(advanceReasoningWait(draining, { ...input, partial: ended })).toBe(draining)
  })

  it('snaps to idle when switching away from a waiting session instead of draining that fill', () => {
    const hot = advanceReasoningWait({ phase: 'idle' }, input)
    expect(advanceReasoningWait(hot, {
      partial: null,
      now: input.now,
      reducedMotion: false,
      sessionKey: 's2',
    })).toEqual({ phase: 'idle' })
  })
})
