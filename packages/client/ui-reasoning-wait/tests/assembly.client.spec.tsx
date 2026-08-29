// @vitest-environment jsdom
/**
 * Assembled conversation + reasoning-wait: the real meter entry mounts beside
 * the composer trailing controls, not in the column HUD overlay.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotTestRuntime, usePinnedBrowserLanguages, stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyConversation, inject as conversationInject } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply, inject } from '../src/client/index.ts'

usePinnedBrowserLanguages('zh-CN')

const SID = 's1' as SessionId

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

describe('assembled reasoning-wait meter ring', () => {
  it('mounts the idle ring in the composer trailing row, not in the column HUD', async () => {
    const runtime = await SlotTestRuntime.create()
    runtime.provide('connection', { api: { settings: {} }, isLoopback: false })
    runtime.provide('remote', { $on: () => () => {} })
    runtime.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
    runtime.provide('layout', { openDetails: vi.fn(), closeDetails: vi.fn() })
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.provide('locale', locale)
    runtime.slots.installLocale(locale)
    await runtime.sessions.add({
      id: SID,
      summary: { title: 'S', displayTitle: 'S', cwd: '/proj' },
      snapshot: { nodes: [] },
      session: {
        loadOlder: vi.fn(),
        prompt: vi.fn(async () => ({ ok: true, value: { accepted: true } })),
      },
    })
    await runtime.root.declare(LAYOUT_CHILDREN, TwoColumnRoot)
    await runtime.mount({ inject: [...conversationInject], apply: applyConversation })
    await runtime.mount({ inject: [...inject], apply })
    const view = runtime.renderRoot()
    const ring = view.container.querySelector('[data-reasoning-wait="idle"]')
    const conversation = view.getByTestId('conversation-column')
    const details = view.getByTestId('details-column')
    const overlay = view.container.querySelector('[data-conversation-overlay]')
    const composerSeat = view.container.querySelector('[data-composer-seat]')
    expect(ring).not.toBeNull()
    expect(ring?.getAttribute('aria-hidden')).toBe('true')
    expect(conversation.contains(ring)).toBe(true)
    expect(details.contains(ring)).toBe(false)
    expect(composerSeat?.contains(ring)).toBe(true)
    expect(overlay?.contains(ring)).toBe(false)
    await runtime.dispose()
  })
})
