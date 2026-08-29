// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { ReasoningWaitTrack, type ReasoningWaitTrackProps } from '../src/client/ReasoningWaitTrack.tsx'

afterEach(() => {
  cleanup()
})

function props(): ReasoningWaitTrackProps {
  return {} as ReasoningWaitTrackProps
}

describe('ReasoningWaitTrack', () => {
  it('renders an idle trough hidden from the accessibility tree, with no fill', () => {
    const { container } = render(<ReasoningWaitTrack {...props()} />)
    const track = container.querySelector('[data-reasoning-wait="idle"]')
    expect(track).not.toBeNull()
    expect(track?.getAttribute('aria-hidden')).toBe('true')
    expect(track?.querySelector('[data-reasoning-wait-fill]')).toBeNull()
    expect(container.querySelector('[role]')).toBeNull()
  })
})
