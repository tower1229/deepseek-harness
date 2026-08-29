# Agent Note: Reasoning-wait thermometer

Status: implemented

English | [中文](2026-08-29-reasoning-wait-thermometer.zh.md)

## Problem

Watching a Web conversation, a person cannot tell at a glance how long the current session's in-flight reasoning has been running. The Think row shows reasoning text, not elapsed heat. Across steps in one turn the model reasons, tools run, then the model reasons again — the gap is a persistent corner gauge that fills only during reasoning wait and resets between those waits.

## Decision

The web profile ships a thermometer in the conversation column's bottom-right: an always-mounted idle track that fills from the bottom with a single iron-scale color as reasoning wait elapses, clamps at 37s, drains height in 240ms with color frozen at the last t when wait ends, and preempts drain if the next wait starts. Reduced motion skips drain and snaps to idle. The gauge reports only the visible session. Headless, ACP, and CLI do not show it. A profile patch can unload the plugin; there is no Settings toggle.

[`@deepseek-ai/dsh-client-ui-reasoning-wait`](../../../../packages/client/ui-reasoning-wait/README.md) owns the thermometer presentation and registers additively into `'conversation.overlay'`. It does not replace the conversation occupant. [`ui-conversation`](../../../../packages/client/ui-conversation/README.md) declares that list as a session-maybe column-fixed HUD. The chrome does not hang on `shell.overlay` (viewport-sized, no composer-height) or `conversation.input.overlay` (composer chrome).

The idle trough is always mounted: 4×96 CSS pixels, theme chrome for trough and edge, `pointer-events: none`, `aria-hidden`, present on hero (column corner; the composer is centered) and in a live session (above the docked composer via `--dsh-composer-height`), outside the transcript scroller and outside details. Wait-origin projection lives on the in-flight assistant partial in [`ui-conversation`](../../../../packages/client/ui-conversation/README.md) (no new session event). Iron-scale fill, drain, and reduced-motion snap live in this plugin.

Fill starts at the first reasoning evidence with height `8% + 92% × t` and iron-scale color on unmapped t. Wait origin survives session switch, reload, and reconnect. Switching away from a waiting session idles immediately rather than draining that session's fill onto the next. Abort that finalizes no `assistant/message` ends wait like any other tail change.

Glossary: [CONTEXT.md](../../../../CONTEXT.md). Fill color exception: [ADR 0001](../../../../docs/adr/0001-physical-iron-scale-fill.md).

## Alternatives considered

**Hang the chrome on `shell.overlay`.** That layer is viewport-sized and does not own `--dsh-composer-height`, so the track would sit in the frame corner and cover or miss the composer as the input grows.

**Hang the chrome on `conversation.input.overlay` or the composer dock.** Those seats are input chrome; the gauge would scroll or layout with the composer card and would disappear under a composer takeover.

**Unmount the track when idle.** The corner would appear and vanish, so a person would not know where to look. The idle track is the persistent HUD.

**Theme-adapted iron or warning/danger tokens for fill.** Rejected in [ADR 0001](../../../../docs/adr/0001-physical-iron-scale-fill.md): molten metal is not a brand color, and a traffic light is not an iron scale. Trough and edge stay theme chrome.

**A Settings toggle or Config for 37s / drain / min fill / colors.** The metaphor is a design constant of this chrome, not a deployment knob. Unload the plugin with a profile patch.

**Reuse `firstTokenTime` as wait origin.** That stamp is the first non-empty text, reasoning, or tool delta and ignores `block-start` reasoning, so TTFT silence would light the bar and a reasoning-only origin would be wrong.

**A new model-visible session event for the gauge.** Presentation clocks do not belong in the log. Wait origin is a projection of existing session-log times on the open partial.

**Walk the iron scale backwards on drain (cooling).** Drain is emptying, not cooling; color stays frozen at the last t while height goes to empty.

## Consequences

The idle track is always-on chrome in a 4px column; if placement collides with the back-to-bottom control on a narrow viewport, the track remains non-interactive so it cannot steal that control's clicks. Grill skipped a runnable UI prototype, so 4×96 and the four hex stops may need a follow-up visual tweak without changing the domain terms.

Idle chrome is pinned by `apps/web/tests/reasoning-wait-idle-track.e2e.ts`. In-flight wait is pinned by `apps/web/tests/reasoning-wait-thermometer.e2e.ts`, which parks reasoning as the streaming tail through a `hang` sidecar with `chunks`. Drain, preempt, reduced-motion snap, and session-switch idle are pinned by `advanceReasoningWait` and the track component specs.
