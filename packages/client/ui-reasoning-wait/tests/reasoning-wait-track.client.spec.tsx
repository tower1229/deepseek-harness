// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { ConversationSnapshot, PartialAssistant } from '@deepseek-ai/dsh-client-runtime/client'
import { ReasoningWaitTrack, type ReasoningWaitTrackProps } from '../src/client/ReasoningWaitTrack.tsx'
import { reasoningWaitAppearance } from '../src/client/thermometer.ts'
import { RING_FILL_TRANSFORM, ringStrokeDasharray } from '../src/client/ring-geometry.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

function meterProps(
  partial?: PartialAssistant | null,
  sessionId = 's1',
): ReasoningWaitTrackProps {
  return {
    session: {
      sessionId,
      partial: partial === undefined ? null : partial,
    } as ConversationSnapshot,
    input: {} as ReasoningWaitTrackProps['input'],
  } as ReasoningWaitTrackProps
}

function fillOf(container: HTMLElement): SVGCircleElement | null {
  return container.querySelector('[data-reasoning-wait-fill]')
}

function fillDashAt(origin: number, now: number): string {
  const snap = reasoningWaitAppearance({
    turn: 1,
    step: 1,
    blocks: [{ kind: 'reasoning', text: 'plan' }],
    waitOrigin: origin,
  }, now)
  if (snap.phase !== 'thermometer') throw new Error('expected thermometer')
  return ringStrokeDasharray(snap.height)
}

describe('ReasoningWaitTrack', () => {
  it('renders an idle ring hidden from the accessibility tree, with no fill arc', () => {
    const { container } = render(<ReasoningWaitTrack {...meterProps()} />)
    const track = container.querySelector('[data-reasoning-wait="idle"]')
    expect(track).not.toBeNull()
    expect(track?.getAttribute('aria-hidden')).toBe('true')
    expect(fillOf(container)).toBeNull()
    expect(container.querySelector('[role]')).toBeNull()
  })

  it('stays idle for a current session with no reasoning-wait tail', () => {
    const { container } = render(<ReasoningWaitTrack {...meterProps(null)} />)
    expect(container.querySelector('[data-reasoning-wait="idle"]')).not.toBeNull()
    expect(fillOf(container)).toBeNull()
  })

  it('fills counterclockwise from the bottom at minimum arc and cool metal when wait starts', () => {
    const origin = 5_000
    vi.spyOn(Date, 'now').mockReturnValue(origin)
    const { container } = render(<ReasoningWaitTrack {...meterProps({
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: '' }],
      waitOrigin: origin,
    })} />)
    const fill = fillOf(container)
    expect(container.querySelector('[data-reasoning-wait="thermometer"]')).not.toBeNull()
    expect(fill).not.toBeNull()
    expect(fill?.getAttribute('stroke')).toBe('#4a4d52')
    expect(fill?.getAttribute('transform')).toBe(RING_FILL_TRANSFORM)
    expect(fill?.getAttribute('stroke-dasharray')).toBe(ringStrokeDasharray(0.08))
    expect(fill?.getAttribute('stroke-dasharray')?.startsWith('-')).toBe(true)
  })

  it('drains arc with frozen color when reasoning leaves the tail, then idles', () => {
    const origin = 1_000
    let now = origin + 80_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    let frame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const waiting: PartialAssistant = {
      turn: 2,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'plan' }],
      waitOrigin: origin,
    }
    const ended = {
      ...waiting,
      blocks: [...waiting.blocks, { kind: 'text' as const, text: 'done' }],
    }
    const { container, rerender } = render(<ReasoningWaitTrack {...meterProps(waiting)} />)
    const fill = fillOf(container)
    expect(fill?.getAttribute('stroke-dasharray')).toBe(ringStrokeDasharray(1))
    expect(fill?.getAttribute('stroke')).toBe('#ffe28a')

    rerender(<ReasoningWaitTrack {...meterProps(ended)} />)
    expect(container.querySelector('[data-reasoning-wait="drain"]')).not.toBeNull()
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).toBe(ringStrokeDasharray(1))
    expect(fillOf(container)?.getAttribute('stroke')).toBe('#ffe28a')

    now = origin + 80_000 + 120
    act(() => {
      frame?.(0)
    })
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).toBe(ringStrokeDasharray(0.5))
    expect(fillOf(container)?.getAttribute('stroke')).toBe('#ffe28a')

    now = origin + 80_000 + 240
    act(() => {
      frame?.(0)
    })
    expect(container.querySelector('[data-reasoning-wait="idle"]')).not.toBeNull()
    expect(fillOf(container)).toBeNull()
  })

  it('extrapolates from streamTime when wall clock is ahead of session log', () => {
    const origin = 1_000
    let wallNow = origin + 60_000
    vi.spyOn(Date, 'now').mockImplementation(() => wallNow)
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    const partial: PartialAssistant = {
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'plan' }],
      waitOrigin: origin,
      streamTime: origin,
    }
    const { container, rerender } = render(<ReasoningWaitTrack {...meterProps(partial)} />)
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).toBe(ringStrokeDasharray(0.08))

    wallNow = origin + 65_000
    rerender(<ReasoningWaitTrack {...meterProps(partial)} />)
    act(() => {
      frames[0]?.(0)
    })
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).not.toBe(ringStrokeDasharray(1))
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).toBe(fillDashAt(origin, origin + 5_000))
  })

  it('advances fill arc from the injected clock while wait continues', () => {
    const origin = 2_000
    let now = origin
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { container } = render(<ReasoningWaitTrack {...meterProps({
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'plan' }],
      waitOrigin: origin,
    })} />)
    now = origin + 10_000
    act(() => {
      frames[0]?.(0)
    })
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).toBe(fillDashAt(origin, origin + 10_000))
  })

  it('idles when switching to a session that is not waiting, then resumes from wait origin', () => {
    const origin = 10_000
    vi.spyOn(Date, 'now').mockReturnValue(origin + 10_000)
    const waiting: PartialAssistant = {
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'plan' }],
      waitOrigin: origin,
    }
    const { container, rerender } = render(<ReasoningWaitTrack {...meterProps(waiting)} />)
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).toBe(fillDashAt(origin, origin + 10_000))

    rerender(<ReasoningWaitTrack {...meterProps(null, 's2')} />)
    expect(container.querySelector('[data-reasoning-wait="idle"]')).not.toBeNull()
    expect(fillOf(container)).toBeNull()

    rerender(<ReasoningWaitTrack {...meterProps(waiting)} />)
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).toBe(fillDashAt(origin, origin + 10_000))
    expect(fillOf(container)?.getAttribute('stroke')).not.toBe('#4a4d52')
  })

  it('preempts drain when a new wait starts, from minimum arc and cool metal', () => {
    const origin = 1_000
    let now = origin + 10_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const waiting: PartialAssistant = {
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'plan' }],
      waitOrigin: origin,
    }
    const { container, rerender } = render(<ReasoningWaitTrack {...meterProps(waiting)} />)
    rerender(<ReasoningWaitTrack {...meterProps({
      ...waiting,
      blocks: [...waiting.blocks, { kind: 'text', text: 'done' }],
    })} />)
    expect(container.querySelector('[data-reasoning-wait="drain"]')).not.toBeNull()

    const nextOrigin = origin + 20_000
    now = nextOrigin
    rerender(<ReasoningWaitTrack {...meterProps({
      turn: 1,
      step: 2,
      blocks: [{ kind: 'reasoning', text: 'again' }],
      waitOrigin: nextOrigin,
    })} />)
    expect(container.querySelector('[data-reasoning-wait="thermometer"]')).not.toBeNull()
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).toBe(ringStrokeDasharray(0.08))
    expect(fillOf(container)?.getAttribute('stroke')).toBe('#4a4d52')
  })

  it('snaps to idle under reduced motion when wait ends, without draining', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }) as MediaQueryList))
    const origin = 1_000
    vi.spyOn(Date, 'now').mockReturnValue(origin + 10_000)
    const waiting: PartialAssistant = {
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'plan' }],
      waitOrigin: origin,
    }
    const { container, rerender } = render(<ReasoningWaitTrack {...meterProps(waiting)} />)
    expect(fillOf(container)?.getAttribute('stroke-dasharray')).toBe(fillDashAt(origin, origin + 10_000))
    rerender(<ReasoningWaitTrack {...meterProps({
      ...waiting,
      blocks: [...waiting.blocks, { kind: 'text', text: 'done' }],
    })} />)
    expect(container.querySelector('[data-reasoning-wait="idle"]')).not.toBeNull()
    expect(fillOf(container)).toBeNull()
  })
})
