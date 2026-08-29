// @vitest-environment jsdom
/**
 * Assembled conversation + reasoning-wait: the real overlay entry mounts in
 * the column HUD, including when details occupies the sibling column.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotTestRuntime, usePinnedBrowserLanguages, stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyConversation, inject as conversationInject } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply, inject } from '../src/client/index.ts'

usePinnedBrowserLanguages('zh-CN')

/** jsdom has no ResizeObserver; the composer seat publishes its height through one. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

type AppRootProps = PropsRenderSlots<'conversation' | 'details'>

function TwoColumnRoot({ renderSlot }: AppRootProps) {
  return (
    <div>
      <div data-testid="conversation-column">{renderSlot('conversation', {})}</div>
      <div data-testid="details-column">{renderSlot('details', {})}</div>
    </div>
  )
}

const LAYOUT_CHILDREN = {
  conversation: { kind: 'single', scope: 'session-maybe' },
  details: { kind: 'single', scope: 'session' },
} as const

describe('assembled reasoning-wait overlay', () => {
  it('mounts the idle track in the conversation HUD, not in details', async () => {
    const runtime = await SlotTestRuntime.create()
    runtime.provide('connection', { api: { settings: {} }, isLoopback: false })
    // The plugin injects both; these specs exercise no settings path.
    runtime.provide('remote', { $on: () => () => {} })
    runtime.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
    runtime.provide('layout', { openDetails: vi.fn(), closeDetails: vi.fn() })
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.provide('locale', locale)
    runtime.slots.installLocale(locale)
    await runtime.root.declare(LAYOUT_CHILDREN, TwoColumnRoot)
    await runtime.mount({ inject: [...conversationInject], apply: applyConversation })
    await runtime.mount({ inject: [...inject], apply })
    const view = runtime.renderRoot()
    const track = view.container.querySelector('[data-reasoning-wait="idle"]')
    const conversation = view.getByTestId('conversation-column')
    const details = view.getByTestId('details-column')
    const overlay = view.container.querySelector('[data-conversation-overlay]')
    const scroller = view.container.querySelector('[data-conversation-scroll]')
    expect(track).not.toBeNull()
    expect(track?.getAttribute('aria-hidden')).toBe('true')
    expect(conversation.contains(track)).toBe(true)
    expect(details.contains(track)).toBe(false)
    expect(overlay?.contains(track)).toBe(true)
    expect(scroller?.contains(track)).toBe(false)
    await runtime.dispose()
  })
})
