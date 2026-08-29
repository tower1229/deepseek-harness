# @deepseek-ai/dsh-client-ui-reasoning-wait

English | [中文](README.zh.md)

Web reasoning-wait thermometer owner: contributes one entry to `conversation.overlay`, a session-maybe column HUD list declared by [`dsh-client-ui-conversation`](../ui-conversation/README.md). The track is a 4×96 CSS-pixel trough at the conversation column's bottom-right. On hero it sits in the column corner; in the active phase it sits above the docked composer via `--dsh-composer-height`. It stays mounted with no current session (hero) and while a session is visible, and it does not occupy details or scroll with the transcript.

The trough is idle chrome until the current session's open assistant partial has reasoning as its streaming tail: then it fills from the bottom as a single iron-scale color.

Height is `8% + 92% × t` with t = elapsed wait / 37s, clamped at 1; color follows unmapped t across `#4a4d52` → `#9a2b1f` → `#e07020` → `#ffe28a` in OKLCH. Fill starts at the first reasoning evidence (`block-start` reasoning or the first `reasoning-delta`) using that evidence's session-log time as wait origin — not `firstTokenTime`.

TTFT silence, text or tool-call tails, tool execution, thinking-off requests, and other sessions leave the track idle. Switching back to a session still in wait resumes from that origin. When wait ends, this slice returns to idle immediately (drain is deferred).

The trough is `aria-hidden` and `pointer-events: none`. Trough and edge use theme aliases (`--dsw-alias-bg-layer-1`, `--dsw-alias-border-l2`); fill is a component-local custom property and is not mapped onto warning or danger tokens. The plugin ships in the web-app bundle by default and is absent from headless, ACP, and CLI; unload it by removing or disabling the plugin row in a profile patch. There is no Settings toggle and no Config for geometry, 37s, minimum fill, or colors.

The [reasoning-wait thermometer proposal](../../../.agents/notes/proposed/feature/2026-08-29-reasoning-wait-thermometer.md) records placement, iron-scale fill, and drain. [CONTEXT.md](../../../CONTEXT.md) is the glossary; [ADR 0001](../../../docs/adr/0001-physical-iron-scale-fill.md) is the fill-token exception.

## Model Experience

None, as this package renders decorative browser chrome and touches no prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **Drain is immediate** — when wait ends the fill snaps to empty; 240ms drain with frozen color, preemption by a new wait, and reduced-motion snap belong to a later slice.
- **In-flight wait is not in the assembled web snapshot yet** — idle chrome is pinned by `apps/web/tests/reasoning-wait-idle-track.e2e.ts`; reasoning-wait fill and drain still need a later replay fixture.
