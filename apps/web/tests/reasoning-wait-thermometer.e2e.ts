// Web e2e scenario: the assembled web profile paints a thermometer ring fill while
// the current session's reasoning wait is the streaming tail. Hang prefix
// chunks park that state by construction; aria snapshots omit aria-hidden
// chrome, so this lane records fill and placement the a11y goldens cannot.
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterEach, describe, expect, it, onTestFailed } from 'vitest'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import type { ReplayOverrideDoc } from '@deepseek-ai/dsh-llm-replay'
import {
  assertFixtureInventory, compareOrRefreshGolden, fixtureUserPrompts,
  launchWebScaffold, recordFixture, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/reasoning-wait-thermometer', import.meta.url))
const FIXTURE = join(SNAPSHOT_DIR, 'session.jsonl')
const GEOMETRY_EXPECTED = join(SNAPSHOT_DIR, 'geometry.expected.md')
const MODE = webSnapshotMode()
const PROMPT = 'Reply with a one-sentence description of event sourcing, then stop.'
const REASONING_HANG: StreamChunk[] = [
  { type: 'block-start', index: 0, blockType: 'reasoning' },
  { type: 'reasoning-delta', index: 0, text: 'planning the answer.' },
]

/** Measured thermometer facts that do not depend on elapsed wait or fonts. */
interface RingFacts {
  phase: string
  fillPresent: boolean
  fillArcNonZero: boolean
  fillUsesCoolMetalStart: boolean
  shellWidth: number
  shellHeight: number
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
 * Read the thermometer ring against the composer trailing controls.
 * @param page - the assembled web page.
 * @returns placement and fill facts.
 */
async function measureRing(page: Page): Promise<RingFacts> {
  return page.evaluate(() => {
    const ring = document.querySelector('[data-reasoning-wait="thermometer"]')
    if (!(ring instanceof HTMLElement)) throw new Error('thermometer reasoning-wait ring missing')
    const fill = ring.querySelector('[data-reasoning-wait-fill]')
    if (!(fill instanceof SVGCircleElement)) throw new Error('thermometer fill missing')
    const shell = ring.querySelector('[class*="shell"]')
    if (!(shell instanceof HTMLElement)) throw new Error('thermometer shell missing')
    const track = ring.querySelector('circle[class*="track"]')
    if (!(track instanceof SVGCircleElement)) throw new Error('thermometer track missing')
    const composer = document.querySelector('[data-composer-seat]')
    const overlay = ring.closest('[data-conversation-overlay]')
    const scroller = ring.closest('[data-conversation-scroll]')
    const details = ring.closest('[class*="detailsCol"]')
    const contextTrigger = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]'))
      .find(button => button.querySelector('svg circle'))
    const shellStyle = getComputedStyle(shell)
    const trackStyle = getComputedStyle(track)
    const fillStyle = getComputedStyle(fill)
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
    const cool = document.createElement('div')
    cool.style.backgroundColor = '#4a4d52'
    document.body.append(cool)
    const coolStyle = getComputedStyle(cool)
    const fillUsesCoolMetalStart = fillStyle.stroke === coolStyle.backgroundColor
    cool.remove()
    chrome.remove()
    warn.remove()
    danger.remove()
    const dash = fill.getAttribute('stroke-dasharray') ?? ''
    const arc = Number.parseFloat(dash.split(/\s+/)[0] ?? '0')
    const ringBox = ring.getBoundingClientRect()
    const contextBox = contextTrigger?.getBoundingClientRect()
    const shellBox = shell.getBoundingClientRect()
    return {
      phase: ring.getAttribute('data-reasoning-wait') ?? '',
      fillPresent: true,
      fillArcNonZero: arc !== 0,
      fillUsesCoolMetalStart,
      shellWidth: Math.round(shellBox.width),
      shellHeight: Math.round(shellBox.height),
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
 * Render the golden body: relations and design constants, no elapsed-wait t.
 * @param facts - one measurement of the thermometer ring.
 * @returns the golden body, without a trailing newline.
 */
function renderGeometry(facts: RingFacts): string {
  return [
    '# Reasoning-wait thermometer ring beside the composer context meter',
    '',
    `- phase: ${facts.phase}`,
    `- fill present: ${String(facts.fillPresent)}`,
    `- fill arc nonzero: ${String(facts.fillArcNonZero)}`,
    `- fill uses cool-metal start (#4a4d52): ${String(facts.fillUsesCoolMetalStart)}`,
    `- shell size: ${String(facts.shellWidth)}×${String(facts.shellHeight)}`,
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

describe('web e2e: reasoning-wait thermometer ring beside the context meter', () => {
  let scaffold: WebScaffold | undefined
  let browser: Browser | undefined
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>
  let sidecarDir: string | undefined

  afterEach(async () => {
    const failures: unknown[] = []
    await browser?.close().catch((error: unknown) => failures.push(error))
    browser = undefined
    const closing = scaffold
    scaffold = undefined
    await closing?.close().catch((error: unknown) => failures.push(error))
    if (sidecarDir !== undefined) {
      await rm(sidecarDir, { recursive: true, force: true }).catch((error: unknown) => failures.push(error))
    }
    sidecarDir = undefined
    if (failures.length === 1) throw failures[0]
    if (failures.length > 1) throw new AggregateError(failures, 'reasoning-wait-thermometer teardown failed')
  })

  /**
   * Boot scaffold + page, materializing the hang sidecar before replay installs.
   * @param buildOverride - optional hang sidecar builder.
   */
  async function launch(buildOverride?: (sidecarHome: string) => ReplayOverrideDoc): Promise<void> {
    let overridePath: string | undefined
    if (buildOverride !== undefined) {
      sidecarDir = await mkdtemp(join(tmpdir(), 'dsh-web-e2e-sidecar-'))
      overridePath = join(sidecarDir, 'replay.override.json')
      await writeFile(overridePath, JSON.stringify(buildOverride(sidecarDir)))
    }
    scaffold = await launchWebScaffold(
      MODE === 'record'
        ? {}
        : { replayFixture: FIXTURE, ...(overridePath === undefined ? {} : { replayOverride: overridePath }) },
    )
    browser = await chromium.launch()
    page = await newEnglishPage(browser, 900)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
  }

  it.skipIf(MODE !== 'record')('records the base fixture live through the composer', async () => {
    await launch()
    onTestFailed(() => saveFailureShot(page, 'web-e2e-reasoning-wait-thermometer-record'))
    const input = page.locator('textarea').first()
    await input.waitFor({ timeout: 10_000 })
    const settled = scaffold!.whenTurnSettled(180_000)
    await input.fill(PROMPT)
    await input.press('Enter')
    const sessionId = await settled
    await recordFixture(scaffold!, sessionId, FIXTURE)
  }, 200_000)

  it.skipIf(MODE === 'record')('paints a thermometer ring fill while reasoning is the streaming tail', async () => {
    expect(fixtureUserPrompts(await readFile(FIXTURE, 'utf8'))).toEqual([PROMPT])
    let marker = ''
    await launch((sidecarHome) => {
      marker = join(sidecarHome, '.hang-ready')
      return {
        patches: [{ at: 0, entry: { kind: 'hang', readyFile: marker, chunks: REASONING_HANG } }],
      }
    })
    onTestFailed(() => saveFailureShot(page, 'web-e2e-reasoning-wait-thermometer'))
    const input = page.locator('textarea').first()
    await input.waitFor({ timeout: 10_000 })
    await input.fill(PROMPT)
    await input.press('Enter')
    await expect.poll(() => existsSync(marker), { timeout: 15_000 }).toBe(true)
    await page.waitForSelector('[data-reasoning-wait="thermometer"]', { timeout: 15_000 })
    const facts = await measureRing(page)
    expect(facts).toEqual({
      phase: 'thermometer',
      fillPresent: true,
      fillArcNonZero: true,
      fillUsesCoolMetalStart: true,
      shellWidth: 28,
      shellHeight: 28,
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
    expect(tripwire.warnings).toEqual([])
    await page.getByRole('button', { name: 'Stop generating' }).click()
  }, 120_000)

  it('commits exactly the fixtures it reads', async () => {
    await assertFixtureInventory(SNAPSHOT_DIR, ['session.jsonl', 'geometry.expected.md'])
  })
})
