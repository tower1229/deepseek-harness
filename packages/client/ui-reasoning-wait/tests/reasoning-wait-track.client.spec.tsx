// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { PartialAssistant } from '@deepseek-ai/dsh-client-runtime/client'
import { ReasoningWaitTrack, type ReasoningWaitTrackProps } from '../src/client/ReasoningWaitTrack.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

function overlayProps(partial?: PartialAssistant | null): ReasoningWaitTrackProps {
  return {
    useSession: (select: (session: { partial: PartialAssistant | null }) => unknown) => {
      if (partial === undefined) return undefined
      return select({ partial })
    },
  } as ReasoningWaitTrackProps
}

function fillOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-reasoning-wait-fill]')
}

describe('ReasoningWaitTrack', () => {
  it('renders an idle trough hidden from the accessibility tree, with no fill', () => {
    const { container } = render(<ReasoningWaitTrack {...overlayProps()} />)
    const track = container.querySelector('[data-reasoning-wait="idle"]')
    expect(track).not.toBeNull()
    expect(track?.getAttribute('aria-hidden')).toBe('true')
    expect(fillOf(container)).toBeNull()
    expect(container.querySelector('[role]')).toBeNull()
  })

  it('stays idle for a current session with no reasoning-wait tail', () => {
    const { container } = render(<ReasoningWaitTrack {...overlayProps(null)} />)
    expect(container.querySelector('[data-reasoning-wait="idle"]')).not.toBeNull()
    expect(fillOf(container)).toBeNull()
  })

  it('fills from the bottom at minimum height and cool metal when wait starts', () => {
    const origin = 5_000
    vi.spyOn(Date, 'now').mockReturnValue(origin)
    const { container } = render(<ReasoningWaitTrack {...overlayProps({
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: '' }],
      waitOrigin: origin,
    })} />)
    const fill = fillOf(container)
    expect(container.querySelector('[data-reasoning-wait="thermometer"]')).not.toBeNull()
    expect(fill).not.toBeNull()
    expect(fill?.style.getPropertyValue('--dsh-reasoning-wait-height')).toBe('8%')
    expect(fill?.style.getPropertyValue('--dsh-reasoning-wait-color')).toBe('#4a4d52')
  })

  it('clamps a wait past full scale and snaps back to idle when reasoning leaves the tail', () => {
    const origin = 1_000
    vi.spyOn(Date, 'now').mockReturnValue(origin + 80_000)
    const waiting: PartialAssistant = {
      turn: 2,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'plan' }],
      waitOrigin: origin,
    }
    const { container, rerender } = render(<ReasoningWaitTrack {...overlayProps(waiting)} />)
    const fill = fillOf(container)
    expect(fill?.style.getPropertyValue('--dsh-reasoning-wait-height')).toBe('100%')
    expect(fill?.style.getPropertyValue('--dsh-reasoning-wait-color')).toBe('#ffe28a')

    rerender(<ReasoningWaitTrack {...overlayProps({
      ...waiting,
      blocks: [...waiting.blocks, { kind: 'text', text: 'done' }],
    })} />)
    expect(container.querySelector('[data-reasoning-wait="idle"]')).not.toBeNull()
    expect(fillOf(container)).toBeNull()
  })

  it('advances fill height from the injected clock while wait continues', () => {
    const origin = 2_000
    let now = origin
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { container } = render(<ReasoningWaitTrack {...overlayProps({
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'plan' }],
      waitOrigin: origin,
    })} />)
    now = origin + 18_500
    act(() => {
      frames[0]?.(0)
    })
    expect(fillOf(container)?.style.getPropertyValue('--dsh-reasoning-wait-height')).toBe('54%')
  })
})
