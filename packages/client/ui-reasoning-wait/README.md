# @deepseek-ai/dsh-client-ui-reasoning-wait

English | [中文](README.zh.md)

Web reasoning-wait ring owner: contributes one meter entry to `conversation.input.meter`, beside the context-occupancy ContextMeter in the composer trailing row ([`ui-conversation`](../ui-conversation/README.md) meter host).

The ring is idle chrome until the current session's open assistant partial has reasoning as its streaming tail: then it fills counterclockwise from the bottom (6 o'clock) as a single iron-scale color.

Height is `8% + 92% × easeOut(t)` with t = elapsed wait / 20s, clamped at 1, where easeOut is CSS `cubic-bezier(0, 0, 0.58, 1)` (fast initial rise, decelerating toward full scale). Color follows unmapped linear t across `#4a4d52` → `#9a2b1f` → `#e07020` → `#ffe28a` in OKLCH. Fill starts at the first reasoning evidence (`block-start` reasoning or the first `reasoning-delta`) using that evidence's session-log time as wait origin — not `firstTokenTime`.

When wait ends, height drains linearly to empty in 240ms with color frozen at the last t. A new wait on the current session preempts drain and starts from that origin (minimum fill, cool metal). Reduced motion skips drain and snaps to idle. Switching away from a waiting session idles immediately.

TTFT silence, text or tool-call tails, tool execution, thinking-off requests, and other sessions leave the ring idle. Switching back to a session still in wait resumes from that origin.

The ring uses a 28×28 CSS-pixel shell and 14px / 2px-stroke SVG geometry shared with ContextMeter. It is `aria-hidden` and `pointer-events: none`. The track uses a theme border alias (`--dsw-alias-border-l3`); fill is component-local iron-scale hex and is not mapped onto warning or danger tokens. The plugin ships in the web-app bundle by default and is absent from headless, ACP, and CLI; unload it by removing or disabling the plugin row in a profile patch. There is no Settings toggle and no Config for geometry, 20s scale, drain, minimum fill, or colors.

The [reasoning-wait thermometer decision](../../../.agents/notes/implemented/feature/2026-08-29-reasoning-wait-thermometer.md) records placement, iron-scale fill, ring motion, and drain. [CONTEXT.md](../../../CONTEXT.md) is the glossary; [ADR 0001](../../../docs/adr/0001-physical-iron-scale-fill.md) is the fill-token exception.

## Model Experience

None, as this package renders decorative browser chrome and touches no prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **Grill skipped a runnable UI prototype** — ring size and the four hex stops may need a follow-up visual tweak without changing the domain terms.
