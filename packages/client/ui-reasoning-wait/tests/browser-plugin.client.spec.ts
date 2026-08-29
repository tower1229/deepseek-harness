/**
 * ui-reasoning-wait plugin halves: the browser entry's overlay-slot
 * registration against the real SlotRegistry (with fiber teardown proving
 * removal — HMR safety), the inert node entry, and the invariant companion's
 * ownership reservation. Profile patches pin web-only composition.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as applyNode } from '../src/index.ts'
import * as ReasoningWaitInvariant from '../src/invariant.ts'

const PKG = '@deepseek-ai/dsh-client-ui-reasoning-wait'
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

/** Slot ledger reader: entry ids currently registered in the column HUD list. */
function overlayEntryIds(ctx: Context): (string | undefined)[] {
  return ctx.slots
    .entries('conversation.overlay')
    .map(entry => entry.options.id)
}

/** Boot the browser half over a real slot tree that declares the HUD list. */
async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'conversation.overlay': { kind: 'list', scope: 'session-maybe' },
    },
  } as never, () => null)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('ui-reasoning-wait browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots'])
  })

  it('registers the overlay entry, and fiber teardown removes it (HMR safety)', async () => {
    const { ctx, fiber } = await bench()
    expect(overlayEntryIds(ctx)).toContain('reasoning-wait')
    await fiber.dispose()
    expect(overlayEntryIds(ctx)).not.toContain('reasoning-wait')
  })
})

describe('ui-reasoning-wait node half', () => {
  it('contributes no host behavior', () => {
    expect(applyNode).not.toThrow()
  })
})

describe('ui-reasoning-wait invariant companion', () => {
  it('reserves package ownership under its declared companion name', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(ReasoningWaitInvariant)
    await fiber.await()
    expect(ReasoningWaitInvariant.name).toBe('client-ui-reasoning-wait-invariant')
    expect(ReasoningWaitInvariant.inject).toEqual(['invariants'])
    expect(() => { (ctx.emit as (event: string) => void)('slots/changed') }).not.toThrow()
    await fiber.dispose()
  })
})

describe('profile composition', () => {
  it('ships in the web-app patch and is absent from headless and base', () => {
    const web = readFileSync(resolve(repoRoot, 'packages/bundle/web-app/cordis.patch.yml'), 'utf8')
    const headless = readFileSync(resolve(repoRoot, 'packages/bundle/headless/cordis.patch.yml'), 'utf8')
    const base = readFileSync(resolve(repoRoot, 'packages/bundle/base/cordis.patch.yml'), 'utf8')
    const acp = readFileSync(resolve(repoRoot, 'examples/acp-agent/cordis.yml'), 'utf8')
    expect(web).toContain(PKG)
    expect(headless).not.toContain(PKG)
    expect(base).not.toContain(PKG)
    expect(acp).not.toContain(PKG)
  })
})
