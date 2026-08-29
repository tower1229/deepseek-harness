/**
 * Reasoning-wait plugin, browser half: contributes the thermometer ring to the
 * composer meter strip beside the context-occupancy ContextMeter. Geometry and
 * placement belong to ui-conversation's meter host; this entry is decorative
 * chrome.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ReasoningWaitTrack } from './ReasoningWaitTrack.tsx'

/** Slot-contract props of the meter entry. */
export type { ReasoningWaitTrackProps } from './ReasoningWaitTrack.tsx'

/** Required service for the composer meter contribution. */
export const inject = ['slots']

/**
 * Client plugin body: register the reasoning-wait ring on the composer meter list.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject(
    'conversation.input.meter',
    () => ctx.slots.register({
      name: 'conversation.input.meter',
      id: 'reasoning-wait',
    }, ReasoningWaitTrack),
  )
}
