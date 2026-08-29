import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  advanceReasoningWait,
  isReasoningWait,
  type ReasoningWaitState,
} from './thermometer.ts'
import css from './ReasoningWaitTrack.module.css'

/** Full props for the conversation-column reasoning-wait track. */
export type ReasoningWaitTrackProps = PropsRuntime<'conversation.overlay'>

/**
 * Conversation-column HUD track. Idle trough, thermometer fill while the
 * current session's open partial has reasoning as its streaming tail, or a
 * 240ms height drain with frozen color when that wait ends. A new wait
 * preempts drain. Reduced motion snaps wait end to idle. Decorative: hidden
 * from the accessibility tree and transparent to pointer events.
 */
export function ReasoningWaitTrack({ useSession, sessionId }: ReasoningWaitTrackProps) {
  const partial = useSession(session => session.partial)
  const sessionKey = sessionId ?? ''
  const previousRef = useRef<ReasoningWaitState>({ phase: 'idle' })
  const waiting = isReasoningWait(partial)
  const now = useNow(waiting || previousRef.current.phase !== 'idle')
  const state = advanceReasoningWait(previousRef.current, {
    partial,
    now,
    reducedMotion: prefersReducedMotion(),
    sessionKey,
  })
  previousRef.current = state
  if (state.phase === 'idle') {
    return <div className={css.track} data-reasoning-wait="idle" aria-hidden="true" />
  }
  return (
    <div className={css.track} data-reasoning-wait={state.phase} aria-hidden="true">
      <div
        className={css.fill}
        data-reasoning-wait-fill=""
        style={{
          '--dsh-reasoning-wait-height': `${state.height * 100}%`,
          '--dsh-reasoning-wait-color': state.color,
        } as CSSProperties}
      />
    </div>
  )
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
