// Web e2e scenario: the assembled web profile paints the idle reasoning-wait
// ring beside the context-occupancy meter in the composer trailing row.
// aria snapshots omit aria-hidden chrome, so this lane records geometry and
// placement the a11y goldens cannot.
//
// Zero model calls after workspace connect: jsdom cannot measure the ring or
// composer placement; only a real engine can.
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  assertFixtureInventory, compareOrRefreshGolden, launchWebScaffold, watchConsole, webSnapshotMode,
  type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/reasoning-wait-idle-track', import.meta.url))
const GEOMETRY_EXPECTED = join(SNAPSHOT_DIR, 'geometry.expected.md')
const MODE = webSnapshotMode()

/** Measured idle-ring facts that do not depend on sidebar width or fonts. */
interface RingFacts {
  phase: string
  fillPresent: boolean
  shellWidth: number
  shellHeight: number
  svgWidth: number
  svgHeight: number
  pointerEvents: string
  ariaHidden: boolean
  inComposerSeat: boolean
  inOverlay: boolean
  inScroller: boolean
  inDetails: boolean
  leftOfContextMeter: boolean
  trackUsesThemeBorder: boolean
  shellIsWarnOrDanger: boolean
}

/**
 * Read the idle ring against the composer trailing controls.
 * @param page - the assembled web page.
 * @returns placement and chrome facts.
 */
async function measureRing(page: Page): Promise<RingFacts> {
  return page.evaluate(() => {
    const ring = document.querySelector('[data-reasoning-wait="idle"]')
    if (!(ring instanceof HTMLElement)) throw new Error('idle reasoning-wait ring missing')
    const shell = ring.querySelector('[class*="shell"]')
    if (!(shell instanceof HTMLElement)) throw new Error('idle reasoning-wait shell missing')
    const svg = ring.querySelector('svg')
    if (!(svg instanceof SVGSVGElement)) throw new Error('idle reasoning-wait svg missing')
    const track = ring.querySelector('circle[class*="track"]')
    if (!(track instanceof SVGCircleElement)) throw new Error('idle reasoning-wait track missing')
    const composer = document.querySelector('[data-composer-seat]')
    const overlay = ring.closest('[data-conversation-overlay]')
    const scroller = ring.closest('[data-conversation-scroll]')
    const details = ring.closest('[class*="detailsCol"]')
    const contextTrigger = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]'))
      .find(button => button.querySelector('svg circle'))
    const shellStyle = getComputedStyle(shell)
    const trackStyle = getComputedStyle(track)
    const chrome = document.createElement('div')
    chrome.style.border = '1px solid var(--dsw-alias-border-l3)'
    const warn = document.createElement('div')
    warn.style.color = 'var(--dsw-alias-state-warn-primary)'
    warn.style.backgroundColor = 'var(--dsw-alias-state-warn-tertiary)'
    const danger = document.createElement('div')
    danger.style.backgroundColor = 'var(--dsw-alias-interactive-bg-hover-danger)'
    document.body.append(chrome, warn, danger)
    const chromeStyle = getComputedStyle(chrome)
    const warnStyle = getComputedStyle(warn)
    const dangerStyle = getComputedStyle(danger)
    const trackUsesThemeBorder = trackStyle.stroke === chromeStyle.borderTopColor
    const shellIsWarnOrDanger = shellStyle.backgroundColor === warnStyle.color
      || shellStyle.backgroundColor === warnStyle.backgroundColor
      || shellStyle.backgroundColor === dangerStyle.backgroundColor
    chrome.remove()
    warn.remove()
    danger.remove()
    const shellBox = shell.getBoundingClientRect()
    const ringBox = ring.getBoundingClientRect()
    const contextBox = contextTrigger?.getBoundingClientRect()
    return {
      phase: ring.getAttribute('data-reasoning-wait') ?? '',
      fillPresent: ring.querySelector('[data-reasoning-wait-fill]') !== null,
      shellWidth: Math.round(shellBox.width),
      shellHeight: Math.round(shellBox.height),
      svgWidth: Math.round(svg.getBoundingClientRect().width),
      svgHeight: Math.round(svg.getBoundingClientRect().height),
      pointerEvents: shellStyle.pointerEvents,
      ariaHidden: ring.getAttribute('aria-hidden') === 'true',
      inComposerSeat: composer?.contains(ring) === true,
      inOverlay: overlay !== null,
      inScroller: scroller !== null,
      inDetails: details !== null,
      leftOfContextMeter: contextBox !== undefined && ringBox.right <= contextBox.left + 1,
      trackUsesThemeBorder,
      shellIsWarnOrDanger,
    }
  })
}

/**
 * Render the golden body: relations and design constants, no absolute page
 * coordinates.
 * @param facts - one measurement of the idle ring.
 * @returns the golden body, without a trailing newline.
 */
function renderGeometry(facts: RingFacts): string {
  return [
    '# Idle reasoning-wait ring beside the composer context meter',
    '',
    `- phase: ${facts.phase}`,
    `- fill present: ${String(facts.fillPresent)}`,
    `- shell size: ${String(facts.shellWidth)}×${String(facts.shellHeight)}`,
    `- svg size: ${String(facts.svgWidth)}×${String(facts.svgHeight)}`,
    `- pointer-events: ${facts.pointerEvents}`,
    `- aria-hidden: ${String(facts.ariaHidden)}`,
    `- in composer seat: ${String(facts.inComposerSeat)}`,
    `- in conversation overlay: ${String(facts.inOverlay)}`,
    `- in transcript scroller: ${String(facts.inScroller)}`,
    `- in details column: ${String(facts.inDetails)}`,
    `- left of context meter: ${String(facts.leftOfContextMeter)}`,
    `- track uses theme border alias: ${String(facts.trackUsesThemeBorder)}`,
    `- shell uses warning/danger: ${String(facts.shellIsWarnOrDanger)}`,
  ].join('\n')
}

describe('web e2e: idle reasoning-wait ring beside the context meter', () => {
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
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
    await page.waitForSelector('[data-reasoning-wait="idle"]', { timeout: 30_000 })
  }, 180_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('paints a ContextMeter-sized idle ring left of the context meter, not in the HUD overlay', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-reasoning-wait-idle-track'))
    const facts = await measureRing(page)
    expect(facts).toEqual({
      phase: 'idle',
      fillPresent: false,
      shellWidth: 28,
      shellHeight: 28,
      svgWidth: 14,
      svgHeight: 14,
      pointerEvents: 'none',
      ariaHidden: true,
      inComposerSeat: true,
      inOverlay: false,
      inScroller: false,
      inDetails: false,
      leftOfContextMeter: true,
      trackUsesThemeBorder: true,
      shellIsWarnOrDanger: false,
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
