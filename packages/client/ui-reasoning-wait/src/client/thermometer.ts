import type { PartialAssistant } from '@deepseek-ai/dsh-client-runtime/client'

const FULL_SCALE_MS = 37_000
const MIN_FILL = 0.08

const IRON_STOPS = [
  { t: 0, hex: '#4a4d52' },
  { t: 1 / 3, hex: '#9a2b1f' },
  { t: 2 / 3, hex: '#e07020' },
  { t: 1, hex: '#ffe28a' },
] as const

/** Idle trough, or a thermometer fill derived from elapsed wait. */
export type ReasoningWaitAppearance =
  | { readonly phase: 'idle' }
  | {
    readonly phase: 'thermometer'
    readonly t: number
    readonly height: number
    readonly color: string
  }

/**
 * True when the visible session's open partial is in reasoning wait:
 * wait origin is set and reasoning is the streaming tail.
 * @param partial - visible session's open assistant partial, or none.
 * @returns whether the thermometer should fill from this partial.
 */
export function isReasoningWait(
  partial: PartialAssistant | null | undefined,
): partial is PartialAssistant & { readonly waitOrigin: number } {
  return partial != null
    && partial.waitOrigin !== undefined
    && partial.blocks.at(-1)?.kind === 'reasoning'
}

/**
 * Map the current session's in-flight partial and a clock onto HUD appearance.
 * @param partial - visible session's open assistant partial, or none.
 * @param now - clock milliseconds comparable to session-log `waitOrigin`.
 * @returns idle, or thermometer height/color at clamped t.
 */
export function reasoningWaitAppearance(
  partial: PartialAssistant | null | undefined,
  now: number,
): ReasoningWaitAppearance {
  if (!isReasoningWait(partial)) return { phase: 'idle' }
  const t = Math.min(1, Math.max(0, (now - partial.waitOrigin) / FULL_SCALE_MS))
  return {
    phase: 'thermometer',
    t,
    height: MIN_FILL + (1 - MIN_FILL) * t,
    color: ironScale(t),
  }
}

/** Documented stop hex when t is within one millisecond of that stop. */
function nearestStop(t: number): string | undefined {
  for (const stop of IRON_STOPS) {
    if (Math.abs(t - stop.t) <= 1 / FULL_SCALE_MS) return stop.hex
  }
  return undefined
}

function ironScale(t: number): string {
  const snapped = nearestStop(t)
  if (snapped !== undefined) return snapped
  if (t < IRON_STOPS[1].t) {
    return mixOklch(IRON_STOPS[0].hex, IRON_STOPS[1].hex, t / (1 / 3))
  }
  if (t < IRON_STOPS[2].t) {
    return mixOklch(IRON_STOPS[1].hex, IRON_STOPS[2].hex, (t - 1 / 3) / (1 / 3))
  }
  return mixOklch(IRON_STOPS[2].hex, IRON_STOPS[3].hex, (t - 2 / 3) / (1 / 3))
}

function mixOklch(fromHex: string, toHex: string, amount: number): string {
  return `color-mix(in oklch, ${fromHex}, ${toHex} ${amount * 100}%)`
}
