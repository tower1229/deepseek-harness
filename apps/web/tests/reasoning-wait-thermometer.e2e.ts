// Web e2e scenario: the assembled web profile paints a thermometer fill while
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
interface TrackFacts {
  phase: string
  fillPresent: boolean
  fillHeightPositive: boolean
  fillMatchesTrough: boolean
  width: number
  height: number
  pointerEvents: string
  ariaHidden: boolean
  inOverlay: boolean
  inScroller: boolean
  inDetails: boolean
  rightInset: number
  sitsAboveComposer: boolean
  troughUsesThemeChrome: boolean
  troughIsWarnOrDanger: boolean
}

/**
 * Read the thermometer track against the conversation column.
 * @param page - the assembled web page.
 * @returns placement and fill facts.
 */
async function measureTrack(page: Page): Promise<TrackFacts> {
  return page.evaluate(() => {
    const track = document.querySelector('[data-reasoning-wait="thermometer"]')
    if (!(track instanceof HTMLElement)) throw new Error('thermometer reasoning-wait track missing')
    const fill = track.querySelector('[data-reasoning-wait-fill]')
    if (!(fill instanceof HTMLElement)) throw new Error('thermometer fill missing')
    const column = track.closest('[data-conversation-root]')
    if (!(column instanceof HTMLElement)) throw new Error('thermometer track is not under the conversation column')
    const overlay = track.closest('[data-conversation-overlay]')
    const scroller = track.closest('[data-conversation-scroll]')
    const details = track.closest('[class*="detailsCol"]')
    const composer = document.querySelector('textarea')
    const style = getComputedStyle(track)
    const fillStyle = getComputedStyle(fill)
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
    const fillMatchesTrough = fillStyle.backgroundColor === style.backgroundColor
    chrome.remove()
    warn.remove()
    danger.remove()
    const trackBox = track.getBoundingClientRect()
    const fillBox = fill.getBoundingClientRect()
    const columnBox = column.getBoundingClientRect()
    const composerBox = composer?.getBoundingClientRect()
    return {
      phase: track.getAttribute('data-reasoning-wait') ?? '',
      fillPresent: true,
      fillHeightPositive: fillBox.height > 0,
      fillMatchesTrough,
      width: Math.round(trackBox.width),
      height: Math.round(trackBox.height),
      pointerEvents: style.pointerEvents,
      ariaHidden: track.getAttribute('aria-hidden') === 'true',
      inOverlay: overlay !== null,
      inScroller: scroller !== null,
      inDetails: details !== null,
      rightInset: Math.round(columnBox.right - trackBox.right),
      sitsAboveComposer: composerBox !== undefined && trackBox.bottom <= composerBox.top + 1,
      troughUsesThemeChrome,
      troughIsWarnOrDanger,
    }
  })
}

/**
 * Render the golden body: relations and design constants, no elapsed-wait t.
 * @param facts - one measurement of the thermometer track.
 * @returns the golden body, without a trailing newline.
 */
function renderGeometry(facts: TrackFacts): string {
  return [
    '# Reasoning-wait thermometer on the assembled web conversation',
    '',
    `- phase: ${facts.phase}`,
    `- fill present: ${String(facts.fillPresent)}`,
    `- fill height positive: ${String(facts.fillHeightPositive)}`,
    `- fill matches trough chrome: ${String(facts.fillMatchesTrough)}`,
    `- size: ${String(facts.width)}×${String(facts.height)}`,
    `- pointer-events: ${facts.pointerEvents}`,
    `- aria-hidden: ${String(facts.ariaHidden)}`,
    `- in conversation overlay: ${String(facts.inOverlay)}`,
    `- in transcript scroller: ${String(facts.inScroller)}`,
    `- in details column: ${String(facts.inDetails)}`,
    `- column-right inset: ${String(facts.rightInset)}`,
    `- sits above composer: ${String(facts.sitsAboveComposer)}`,
    `- trough uses theme layer/border aliases: ${String(facts.troughUsesThemeChrome)}`,
    `- trough uses warning/danger: ${String(facts.troughIsWarnOrDanger)}`,
  ].join('\n')
}

describe('web e2e: reasoning-wait thermometer on the conversation HUD', () => {
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

  it.skipIf(MODE === 'record')('paints a thermometer fill while reasoning is the streaming tail', async () => {
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
    const facts = await measureTrack(page)
    expect(facts).toEqual({
      phase: 'thermometer',
      fillPresent: true,
      fillHeightPositive: true,
      fillMatchesTrough: false,
      width: 4,
      height: 96,
      pointerEvents: 'none',
      ariaHidden: true,
      inOverlay: true,
      inScroller: false,
      inDetails: false,
      rightInset: 16,
      sitsAboveComposer: true,
      troughUsesThemeChrome: true,
      troughIsWarnOrDanger: false,
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
