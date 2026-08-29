# Agent Note: Reasoning-wait thermometer

Status: implemented

English | [中文](2026-08-29-reasoning-wait-thermometer.zh.md)

## Problem

Watching a Web conversation, a person cannot tell at a glance how long the current session's in-flight reasoning has been running. The Think row shows reasoning text, not elapsed heat. Across steps in one turn the model reasons, tools run, then the model reasons again — the gap is a persistent corner gauge that fills only during reasoning wait and resets between those waits.

## Decision

The web profile ships a reasoning-wait ring in the composer trailing row, beside the context-occupancy ContextMeter: an always-mounted idle track that fills counterclockwise from the bottom (6 o'clock) with a single iron-scale color as reasoning wait elapses, clamps at 20s, drains height linearly in 240ms with color frozen at the last t when wait ends, and preempts drain if the next wait starts. Reduced motion skips drain and snaps to idle. The gauge reports only the visible session. Headless, ACP, and CLI do not show it. A profile patch can unload the plugin; there is no Settings toggle.

[`@deepseek-ai/dsh-client-ui-reasoning-wait`](../../../../packages/client/ui-reasoning-wait/README.md) owns the ring presentation and registers additively into `'conversation.input.meter'`. It does not replace the conversation occupant. [`ui-conversation`](../../../../packages/client/ui-conversation/README.md) hosts the meter strip beside the send controls. The chrome does not hang on `shell.overlay` (viewport-sized, no composer-height) or the column HUD overlay (transcript-scoped).

The idle ring is always mounted: 28×28 CSS-pixel shell, 14px / 2px-stroke SVG geometry shared with ContextMeter, theme border on the track, `pointer-events: none`, `aria-hidden`, present in the composer trailing row (left of ContextMeter), outside the transcript scroller and outside details. Wait-origin projection lives on the in-flight assistant partial in [`ui-conversation`](../../../../packages/client/ui-conversation/README.md) (no new session event). Iron-scale fill, ease-out height mapping, drain, and reduced-motion snap live in this plugin.

Fill starts at the first reasoning evidence. Height is `8% + 92% × easeOut(t)` where t is linear elapsed / 20s and easeOut is CSS `cubic-bezier(0, 0, 0.58, 1)` (fast initial rise, decelerating toward full scale — speedometer needle curve). The HUD extrapolates elapsed wait from session-log `streamTime` plus client wall clock between chunks so host/browser skew does not snap the ring full. Color follows unmapped linear t across the iron scale. Counterclockwise fill uses `rotate(90 7 7)` plus negative `stroke-dasharray`. Fill stroke uses `style.stroke` so `color-mix(in oklch, …)` gradients render in SVG. Wait origin survives session switch, reload, and reconnect. Switching away from a waiting session idles immediately rather than draining that session's fill onto the next. Abort that finalizes no `assistant/message` ends wait like any other tail change.

Glossary: [CONTEXT.md](../../../../CONTEXT.md). Fill color exception: [ADR 0001](../../../../docs/adr/0001-physical-iron-scale-fill.md).

## Alternatives considered

**Hang the chrome on `shell.overlay`.** That layer is viewport-sized and does not own `--dsh-composer-height`, so the track would sit in the frame corner and cover or miss the composer as the input grows.

**Hang the chrome on the column HUD overlay or the composer input overlay.** Column overlay scrolls with transcript chrome; input overlay is composer-card chrome — neither is the meter strip beside ContextMeter.

**Unmount the track when idle.** The corner would appear and vanish, so a person would not know where to look. The idle track is the persistent HUD.

**Theme-adapted iron or warning/danger tokens for fill.** Rejected in [ADR 0001](../../../../docs/adr/0001-physical-iron-scale-fill.md): molten metal is not a brand color, and a traffic light is not an iron scale. Track stays theme chrome.

**A Settings toggle or Config for 20s / drain / min fill / colors.** The metaphor is a design constant of this chrome, not a deployment knob. Unload the plugin with a profile patch.

**Reuse `firstTokenTime` as wait origin.** That stamp is the first non-empty text, reasoning, or tool delta and ignores `block-start` reasoning, so TTFT silence would light the bar and a reasoning-only origin would be wrong.

**A new model-visible session event for the gauge.** Presentation clocks do not belong in the log. Wait origin is a projection of existing session-log times on the open partial.

**Walk the iron scale backwards on drain (cooling).** Drain is emptying, not cooling; color stays frozen at the last t while height goes to empty.

**Clockwise fill from the top (ContextMeter direction).** Rejected for reasoning wait: counterclockwise from the bottom reads as a distinct wait gauge beside occupancy, not a second context meter.

**Linear height mapping.** Rejected for fill phase: uniform arc growth does not read as elapsed heat; ease-out deceleration matches a speedometer needle.

## Consequences

The idle ring is always-on chrome in the composer trailing row. Grill skipped a runnable UI prototype, so ring size and the four hex stops may need a follow-up visual tweak without changing the domain terms.

Idle chrome is pinned by `apps/web/tests/reasoning-wait-idle-track.e2e.ts`. In-flight wait is pinned by `apps/web/tests/reasoning-wait-thermometer.e2e.ts`, which parks reasoning as the streaming tail through a `hang` sidecar with `chunks`. Drain, preempt, reduced-motion snap, session-switch idle, ring geometry (bottom start, counterclockwise dash), and ease-out height are pinned by `advanceReasoningWait`, `ring-geometry`, and the track component specs.
