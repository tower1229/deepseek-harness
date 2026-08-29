import { useEffect, useState, type CSSProperties } from 'react'
import type { PartialAssistant } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { isReasoningWait, reasoningWaitAppearance } from './thermometer.ts'
import css from './ReasoningWaitTrack.module.css'

/** Full props for the conversation-column reasoning-wait track. */
export type ReasoningWaitTrackProps = PropsRuntime<'conversation.overlay'>

/**
 * Conversation-column HUD track. Idle trough, or a thermometer fill while the
 * current session's open partial has reasoning as its streaming tail.
 * Decorative: hidden from the accessibility tree and transparent to pointer events.
 */
export function ReasoningWaitTrack({ useSession }: ReasoningWaitTrackProps) {
  const partial = useSession(session => session.partial)
  const appearance = reasoningWaitAppearance(partial, useNow(partial))
  if (appearance.phase === 'idle') {
    return <div className={css.track} data-reasoning-wait="idle" aria-hidden="true" />
  }
  return (
    <div className={css.track} data-reasoning-wait="thermometer" aria-hidden="true">
      <div
        className={css.fill}
        data-reasoning-wait-fill=""
        style={{
          '--dsh-reasoning-wait-height': `${appearance.height * 100}%`,
          '--dsh-reasoning-wait-color': appearance.color,
        } as CSSProperties}
      />
    </div>
  )
}

function useNow(partial: PartialAssistant | null | undefined): number {
  const waiting = isReasoningWait(partial)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!waiting) return
    let frame = 0
    const tick = () => {
      setTick(value => value + 1)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [waiting])
  return Date.now()
}
