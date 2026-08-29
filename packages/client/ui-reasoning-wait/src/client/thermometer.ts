import type { PartialAssistant } from '@deepseek-ai/dsh-client-runtime/client'

const FULL_SCALE_MS = 20_000
const MIN_FILL = 0.08
const DRAIN_MS = 240

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
 * Clocked HUD state including drain carry. Thermometer and drain rows keep
 * `sessionKey` so a session switch does not drain the previous session's fill.
 */
export type ReasoningWaitState =
  | { readonly phase: 'idle' }
  | {
    readonly phase: 'thermometer'
    readonly sessionKey: string
    readonly t: number
    readonly height: number
    readonly color: string
  }
  | {
    readonly phase: 'drain'
    readonly sessionKey: string
    readonly height: number
    readonly color: string
    readonly fromHeight: number
    readonly startedAt: number
  }

/** Inputs for one HUD frame: live partial, clock, motion preference, session. */
export interface ReasoningWaitInput {
  /** Visible session's open assistant partial, or none. */
  readonly partial: PartialAssistant | null | undefined
  /** Clock milliseconds comparable to session-log `waitOrigin`. */
  readonly now: number
  /** When true, wait end snaps to idle instead of draining. */
  readonly reducedMotion: boolean
  /** Current session id, or empty when no session is selected. */
  readonly sessionKey: string
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

/**
 * Advance HUD state by one frame. A new wait preempts drain. Reduced motion
 * skips drain. Switching session idles without draining the previous fill.
 * An unchanged frame returns `previous` so a render-time state write can bail out.
 * @param previous - last frame, or idle on first paint.
 * @param input - live partial, clock, reduced-motion, and session key.
 * @returns idle, thermometer, or drain with frozen color.
 */
export function advanceReasoningWait(
  previous: ReasoningWaitState,
  input: ReasoningWaitInput,
): ReasoningWaitState {
  const snapshot = reasoningWaitAppearance(input.partial, input.now)
  if (snapshot.phase === 'thermometer') {
    if (
      previous.phase === 'thermometer'
      && previous.sessionKey === input.sessionKey
      && previous.t === snapshot.t
      && previous.height === snapshot.height
      && previous.color === snapshot.color
    ) return previous
    return { ...snapshot, sessionKey: input.sessionKey }
  }
  if (input.reducedMotion) return previous.phase === 'idle' ? previous : { phase: 'idle' }
  const sameSession = previous.phase !== 'idle' && previous.sessionKey === input.sessionKey
  if (previous.phase === 'thermometer' && sameSession) {
    return {
      phase: 'drain',
      sessionKey: input.sessionKey,
      height: previous.height,
      color: previous.color,
      fromHeight: previous.height,
      startedAt: input.now,
    }
  }
  if (previous.phase === 'drain' && sameSession) {
    const elapsed = input.now - previous.startedAt
    if (elapsed >= DRAIN_MS) return { phase: 'idle' }
    const height = previous.fromHeight * (1 - elapsed / DRAIN_MS)
    if (height === previous.height) return previous
    return {
      ...previous,
      height,
    }
  }
  return previous.phase === 'idle' ? previous : { phase: 'idle' }
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
