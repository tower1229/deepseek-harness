import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PartialAssistant } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  advanceReasoningWait,
  isReasoningWait,
  type ReasoningWaitState,
} from './thermometer.ts'
import { RING_FILL_TRANSFORM, RING_RADIUS, ringStrokeDasharray } from './ring-geometry.ts'
import css from './ReasoningWaitTrack.module.css'

/** Full props for the composer reasoning-wait ring. */
export type ReasoningWaitTrackProps = PropsRuntime<'conversation.input.meter'>

/**
 * Composer trailing reasoning-wait ring. Idle track, clockwise iron-scale fill
 * from the bottom from step start through reasoning streaming until text streams,
 * or a 240ms arc drain with frozen color when that wait ends. A new wait
 * preempts drain. Reduced motion snaps wait end to idle. Decorative: hidden
 * from the accessibility tree and transparent to pointer events.
 */
export function ReasoningWaitTrack({ session }: ReasoningWaitTrackProps) {
  const partial = session.partial
  const sessionKey = String(session.sessionId)
  const reducedMotion = prefersReducedMotion()
  const [state, setState] = useState<ReasoningWaitState>({ phase: 'idle' })
  const streamClockAnchorRef = useRef<StreamClockAnchor | null>(null)
  const waiting = isReasoningWait(partial)
  const wallNow = useNow(waiting || state.phase !== 'idle')
  const clockNow = extrapolateSessionClock(partial, wallNow, streamClockAnchorRef, sessionKey)
  const view = advanceReasoningWait(state, { partial, now: clockNow, reducedMotion, sessionKey })

  useLayoutEffect(() => {
    setState(prev => {
      const next = advanceReasoningWait(prev, { partial, now: clockNow, reducedMotion, sessionKey })
      return reasoningWaitStateEqual(prev, next) ? prev : next
    })
  }, [partial, clockNow, reducedMotion, sessionKey])

  return (
    <span className={css.root} data-reasoning-wait={view.phase} aria-hidden="true">
      <span className={css.shell}>
        <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
          <circle className={css.track} cx="7" cy="7" r={RING_RADIUS} />
          {view.phase !== 'idle' && (
            <circle
              className={css.fill}
              data-reasoning-wait-fill=""
              cx="7"
              cy="7"
              r={RING_RADIUS}
              style={{ stroke: view.color }}
              strokeDasharray={ringStrokeDasharray(view.height)}
              transform={RING_FILL_TRANSFORM}
            />
          )}
        </svg>
      </span>
    </span>
  )
}

interface StreamClockAnchor {
  readonly stamp: string
  readonly streamTime: number
  readonly seenAt: number
}

/**
 * Session-log `streamTime` plus client extrapolation between chunks. Avoids
 * comparing session-log `waitOrigin` directly to `Date.now()` when host and
 * browser clocks diverge.
 * @param partial - visible session partial, or none.
 * @param wallNow - client wall clock in milliseconds.
 * @returns clock comparable to session-log `waitOrigin`.
 */
function extrapolateSessionClock(
  partial: PartialAssistant | null | undefined,
  wallNow: number,
  anchorRef: { current: StreamClockAnchor | null },
  sessionKey: string,
): number {
  if (!isReasoningWait(partial)) {
    anchorRef.current = null
    return wallNow
  }
  const stamp = `${sessionKey}:${partial.waitOrigin}:${partial.streamTime ?? partial.waitOrigin}`
  if (anchorRef.current?.stamp !== stamp) {
    anchorRef.current = {
      stamp,
      streamTime: partial.streamTime ?? partial.waitOrigin,
      seenAt: wallNow,
    }
  }
  const anchor = anchorRef.current
  return anchor.streamTime + (wallNow - anchor.seenAt)
}

function reasoningWaitStateEqual(a: ReasoningWaitState, b: ReasoningWaitState): boolean {
  if (a.phase !== b.phase) return false
  if (a.phase === 'idle') return true
  if (a.phase === 'thermometer') {
    return b.phase === 'thermometer'
      && a.sessionKey === b.sessionKey
      && a.t === b.t
      && a.height === b.height
      && a.color === b.color
  }
  return b.phase === 'drain'
    && a.sessionKey === b.sessionKey
    && a.height === b.height
    && a.color === b.color
    && a.fromHeight === b.fromHeight
    && a.startedAt === b.startedAt
}

function prefersReducedMotion(): boolean {
  // jsdom implements no matchMedia despite lib.dom's non-optional typing.
  // oxlint-disable-next-line typescript/no-unnecessary-condition
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

function useNow(active: boolean): number {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    let frame = 0
    const tick = () => {
      setTick(value => value + 1)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [active])
  return Date.now()
}
