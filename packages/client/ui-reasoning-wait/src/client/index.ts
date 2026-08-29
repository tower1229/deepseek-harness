/**
 * Reasoning-wait plugin, browser half: contributes the idle track to the
 * conversation column's HUD overlay. Geometry and placement belong to
 * ui-conversation's overlay host; this entry is decorative chrome.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ReasoningWaitTrack } from './ReasoningWaitTrack.tsx'

/** Slot-contract props of the overlay entry. */
export type { ReasoningWaitTrackProps } from './ReasoningWaitTrack.tsx'

/** Required service for the conversation-column overlay contribution. */
export const inject = ['slots']

/**
 * Client plugin body: register the idle track on the column HUD list.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject(
    'conversation.overlay',
    () => ctx.slots.register({
      name: 'conversation.overlay',
      id: 'reasoning-wait',
    }, ReasoningWaitTrack),
  )
}
