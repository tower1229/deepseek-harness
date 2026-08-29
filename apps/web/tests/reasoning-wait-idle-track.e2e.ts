// Web e2e scenario: the assembled web profile paints the idle reasoning-wait
// trough on the conversation-column HUD. aria snapshots omit aria-hidden
// chrome, so this lane records geometry and placement the a11y goldens cannot.
//
// Zero model calls: the hero is the boot state. A stray stream fails loud
// with NO_ADAPTER. jsdom cannot measure 4×96 or column placement; only a
// real engine can.
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  assertFixtureInventory, compareOrRefreshGolden, launchWebScaffold, watchConsole, webSnapshotMode,
  type WebScaffold,
} from './scaffold.ts'
import { newEnglishPage, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/reasoning-wait-idle-track', import.meta.url))
const GEOMETRY_EXPECTED = join(SNAPSHOT_DIR, 'geometry.expected.md')
const MODE = webSnapshotMode()

/** Measured idle-track facts that do not depend on sidebar width or fonts. */
interface TrackFacts {
  phase: string
  fillPresent: boolean
  width: number
  height: number
  pointerEvents: string
  ariaHidden: boolean
  inOverlay: boolean
  inScroller: boolean
  inDetails: boolean
  rightInset: number
  bottomInset: number
  troughUsesThemeChrome: boolean
  troughIsWarnOrDanger: boolean
}

/**
 * Read the idle track against the conversation column and details grid item.
 * @param page - the assembled web page.
 * @returns placement and chrome facts.
 */
async function measureTrack(page: Page): Promise<TrackFacts> {
  return page.evaluate(() => {
    const track = document.querySelector('[data-reasoning-wait="idle"]')
    if (!(track instanceof HTMLElement)) throw new Error('idle reasoning-wait track missing')
    const column = track.closest('[data-conversation-root]')
    if (!(column instanceof HTMLElement)) throw new Error('idle track is not under the conversation column')
    const overlay = track.closest('[data-conversation-overlay]')
    const scroller = track.closest('[data-conversation-scroll]')
    const details = track.closest('[class*="detailsCol"]')
    const style = getComputedStyle(track)
    const chrome = document.createElement('div')
    chrome.style.backgroundColor = 'var(--dsw-alias-bg-layer-1)'
    chrome.style.border = '1px solid var(--dsw-alias-border-l2)'
    const warn = document.createElement('div')
    warn.style.color = 'var(--dsw-alias-state-warn-primary)'
    warn.style.backgroundColor = 'var(--dsw-alias-state-warn-tertiary)'
    const danger = document.createElement('div')
    danger.style.backgroundColor = 'var(--dsw-alias-interactive-bg-hover-danger)'
    document.body.append(chrome, warn, danger)
    const chromeStyle = getComputedStyle(chrome)
    const warnStyle = getComputedStyle(warn)
    const dangerStyle = getComputedStyle(danger)
    const troughUsesThemeChrome = style.backgroundColor === chromeStyle.backgroundColor
      && style.borderTopColor === chromeStyle.borderTopColor
    const troughIsWarnOrDanger = style.backgroundColor === warnStyle.color
      || style.backgroundColor === warnStyle.backgroundColor
      || style.backgroundColor === dangerStyle.backgroundColor
      || style.borderTopColor === warnStyle.color
    chrome.remove()
    warn.remove()
    danger.remove()
    const trackBox = track.getBoundingClientRect()
    const columnBox = column.getBoundingClientRect()
    return {
      phase: track.getAttribute('data-reasoning-wait') ?? '',
      fillPresent: track.querySelector('[data-reasoning-wait-fill]') !== null,
      width: Math.round(trackBox.width),
      height: Math.round(trackBox.height),
      pointerEvents: style.pointerEvents,
      ariaHidden: track.getAttribute('aria-hidden') === 'true',
      inOverlay: overlay !== null,
      inScroller: scroller !== null,
      inDetails: details !== null,
      rightInset: Math.round(columnBox.right - trackBox.right),
      bottomInset: Math.round(columnBox.bottom - trackBox.bottom),
      troughUsesThemeChrome,
      troughIsWarnOrDanger,
    }
  })
}

/**
 * Render the golden body: relations and design constants, no absolute page
 * coordinates.
 * @param facts - one measurement of the idle track.
 * @returns the golden body, without a trailing newline.
 */
function renderGeometry(facts: TrackFacts): string {
  return [
    '# Idle reasoning-wait track on the assembled web hero',
    '',
    `- phase: ${facts.phase}`,
    `- fill present: ${String(facts.fillPresent)}`,
    `- size: ${String(facts.width)}×${String(facts.height)}`,
    `- pointer-events: ${facts.pointerEvents}`,
    `- aria-hidden: ${String(facts.ariaHidden)}`,
    `- in conversation overlay: ${String(facts.inOverlay)}`,
    `- in transcript scroller: ${String(facts.inScroller)}`,
    `- in details column: ${String(facts.inDetails)}`,
    `- column-corner inset: ${String(facts.rightInset)}×${String(facts.bottomInset)}`,
    `- trough uses theme layer/border aliases: ${String(facts.troughUsesThemeChrome)}`,
    `- trough uses warning/danger: ${String(facts.troughIsWarnOrDanger)}`,
  ].join('\n')
}

describe('web e2e: idle reasoning-wait track on the conversation HUD', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    browser = await chromium.launch()
    page = await newEnglishPage(browser, 900)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[data-reasoning-wait="idle"]', { timeout: 30_000 })
  }, 180_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('paints a 4×96 idle trough in the conversation corner, not details', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-reasoning-wait-idle-track'))
    const facts = await measureTrack(page)
    expect(facts).toEqual({
      phase: 'idle',
      fillPresent: false,
      width: 4,
      height: 96,
      pointerEvents: 'none',
      ariaHidden: true,
      inOverlay: true,
      inScroller: false,
      inDetails: false,
      rightInset: 16,
      bottomInset: 16,
      troughUsesThemeChrome: true,
      troughIsWarnOrDanger: false,
    })
    await compareOrRefreshGolden(GEOMETRY_EXPECTED, renderGeometry(facts), MODE)
    expect(tripwire.pageErrors).toEqual([])
  })

  it('commits exactly the fixtures it reads', async () => {
    await assertFixtureInventory(SNAPSHOT_DIR, ['geometry.expected.md'])
  })

  it.skipIf(MODE === 'record')('issued zero model calls and stayed clean', () => {
    expect(tripwire.warnings).toEqual([])
    expect(tripwire.pageErrors).toEqual([])
  })
})
