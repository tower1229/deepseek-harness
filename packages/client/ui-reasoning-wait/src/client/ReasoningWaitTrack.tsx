import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
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
  const reducedMotion = prefersReducedMotion()
  const [state, setState] = useState<ReasoningWaitState>({ phase: 'idle' })
  const waiting = isReasoningWait(partial)
  const now = useNow(waiting || state.phase !== 'idle')
  const view = advanceReasoningWait(state, { partial, now, reducedMotion, sessionKey })

  useLayoutEffect(() => {
    setState(prev => {
      const next = advanceReasoningWait(prev, { partial, now, reducedMotion, sessionKey })
      return reasoningWaitStateEqual(prev, next) ? prev : next
    })
  }, [partial, now, reducedMotion, sessionKey])

  if (view.phase === 'idle') {
    return <div className={css.track} data-reasoning-wait="idle" aria-hidden="true" />
  }
  return (
    <div className={css.track} data-reasoning-wait={view.phase} aria-hidden="true">
      <div
        className={css.fill}
        data-reasoning-wait-fill=""
        style={{
          '--dsh-reasoning-wait-height': `${view.height * 100}%`,
          '--dsh-reasoning-wait-color': view.color,
        } as CSSProperties}
      />
    </div>
  )
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
