import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import css from './ReasoningWaitTrack.module.css'

/** Full props for the conversation-column reasoning-wait track. */
export type ReasoningWaitTrackProps = PropsRuntime<'conversation.overlay'>

/**
 * Idle trough in the conversation-column HUD. Decorative: hidden from the
 * accessibility tree and transparent to pointer events.
 */
export function ReasoningWaitTrack(_props: ReasoningWaitTrackProps) {
  return <div className={css.track} data-reasoning-wait="idle" aria-hidden="true" />
}
