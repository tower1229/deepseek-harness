# Reasoning wait thermometer

Status: ready-for-agent

Glossary: [CONTEXT.md](../../CONTEXT.md). Decision: [docs/adr/0001-physical-iron-scale-fill.md](../../docs/adr/0001-physical-iron-scale-fill.md).

## Problem Statement

Watching a Web conversation, I cannot tell at a glance how long the current session’s in-flight reasoning has been running. The Think row shows reasoning text, not elapsed heat. Across steps in one turn the model reasons, tools run, then the model reasons again — I want a persistent corner gauge that fills only during reasoning wait and resets between those waits.

## Solution

A web-profile thermometer in the conversation column’s bottom-right: an always-mounted idle track that fills from the bottom with a single iron-scale color as reasoning wait elapses, clamps at 37s, drains height (color frozen) when wait ends, and preempts drain if the next wait starts. It reports only the visible session. Headless, ACP, and CLI do not show it. A profile patch can unload the plugin; there is no Settings toggle.

## User Stories

1. As a Web user, I want a vertical track always visible in the conversation corner, so I always know where to look for reasoning wait.
2. As a Web user looking at the empty hero (no current session), I want that track idle, so chrome stays consistent before a session exists.
3. As a Web user in a session whose model is not producing reasoning, I want the track idle, so a thinking-off or text-only request does not light the bar.
4. As a Web user waiting on time-to-first-token, I want the track still idle, so silence before the first reasoning evidence is not counted as reasoning wait.
5. As a Web user, I want the fill to appear at minimum fill with cool-metal color at the first reasoning evidence (`block-start` reasoning or first `reasoning-delta`), so I can tell wait has started.
6. As a Web user, I want fill height to grow as `8% + 92% × t` where t is elapsed wait over 37s, so idle (height 0) and just-started wait stay distinguishable without a fake stuck plateau.
7. As a Web user, I want fill color to follow unmapped t on the iron scale, so temperature matches elapsed wait, not remapped height.
8. As a Web user, I want the visible fill to be one color at t (thermometer), so the bar reads as one piece of iron heating rather than a stacked legend.
9. As a Web user, I want the fill to grow from the bottom of the track, so it reads as a thermometer.
10. As a Web user whose reasoning wait exceeds 37s, I want the bar full and the color stuck at molten yellow-white until wait ends, so 37s is full scale, not an error.
11. As a Web user, I want wait to end when reasoning is no longer the streaming tail (later text or tool-call block, or stream finish / abort / error), so the gauge matches the Think row’s running rule.
12. As a Web user, I want the gap after reasoning `block-end` and before the next block to still count as wait when reasoning remains the last partial block and the stream is open, so the clock does not flicker between chunks.
13. As a Web user, when wait ends I want height to drain to empty in 240ms with color frozen at the last t, so I see wait leave without walking the iron scale backwards (that is not cooling).
14. As a Web user with reduced motion, I want drain skipped and the track snapped to idle, so motion policy is honored.
15. As a Web user whose next reasoning wait starts mid-drain, I want drain aborted and a new thermometer from the new wait origin (minimum fill, cool metal), so two waits are not glued into fake iron.
16. As a Web user in a multi-step turn, I want the bar idle during tool execution between model requests, so tool time is not reasoning wait.
17. As a Web user who switches from a reasoning session A to idle session B, I want the track idle, so the gauge reports the conversation I am looking at.
18. As a Web user who switches back to A while A is still in reasoning wait, I want the bar to resume from A’s wait origin (clamped at full scale), so leaving the tab does not restart the clock.
19. As a Web user who reloads or reconnects while reasoning is still the streaming tail, I want elapsed wait taken from the session-log time of the first reasoning evidence of that open partial, so client paint time is not the origin.
20. As a Web user with details open, I want the track to stay on the conversation column, not on details, so the gauge stays attached to the chat.
21. As a Web user, I want the track above the composer (using the column’s composer-height inset), not as composer chrome, so it does not cover send.
22. As a Web user, I want the track fixed (not scrolling with messages), so it remains a HUD.
23. As a Web user, I want the track about 4×96 CSS pixels, so a persistent idle track stays thin.
24. As a Web user, I want trough and edge to follow theme chrome while fill stays the same iron scale in light and dark, so the slot fits the shell but molten metal does not rebrand.
25. As a Web user, I want the track not to steal clicks, so a 4px HUD does not block the transcript.
26. As a Web user, I want this chrome present by default in the web profile, so I do not patch to see it.
27. As a Web user who does not want the chrome, I want to unload it with a profile patch, so there is no extra Settings checkbox.
28. As a headless / ACP / CLI user, I want no thermometer, so non-Web surfaces stay unchanged.
29. As a Web user, I want iron-scale stops cool metal `#4a4d52` → dull red `#9a2b1f` → hot orange `#e07020` → molten `#ffe28a` at t = 0, ⅓, ⅔, 1 interpolated in OKLCH, so heating then melting is readable.
30. As a maintainer, I want no new model-visible session event for this gauge, so a presentation clock does not enter the log.
31. As a maintainer, I want wait origin not to reuse first-token time (any text/reasoning/tool delta), so `block-start` reasoning and reasoning-only origin stay correct.
32. As a maintainer, I want full scale 37s, drain 240ms, minimum fill 8%, and track geometry as design constants, not cordis.yml Config, so the metaphor is not a deployment knob.
33. As a screen-reader user, I want the decorative track hidden from the accessibility tree, so duration is not announced twice beside the Think row.

## Implementation Decisions

- One new Web client UI plugin owns the thermometer presentation and registers additively into the conversation column. It does not replace the conversation occupant.
- The conversation column declares a new additive overlay list seat for column-fixed HUD (session-maybe). Do not hang this chrome on the frame overlay: that layer is viewport-sized and does not own composer-height. Do not hang it on the composer overlay: that is input chrome.
- The live conversation snapshot of the current session is the data source. Extend the in-flight assistant partial projection with wait origin (session-log time of the first reasoning evidence of that partial) and the last-block kind already on the partial. Do not add a session event. Do not have the plugin fold raw session events itself.
- Current session means the visible session from the session list selection. No session ⇒ idle. A wait on a non-current session does not light the bar; switching back reads that session’s live projection (origin preserved on the session object).
- Indicator view-model is a pure function of: current session or none, that session’s partial (blocks + wait origin), clock now, reduced-motion, and local drain animation phase. Phases: idle, thermometer (t clamped 0..1), drain (frozen color, height animating to 0). New wait preempts drain.
- t = clamp((now − wait origin) / 37s, 0, 1) while reasoning is the streaming tail of the open partial. Height = 0 when idle; during thermometer height = 0.08 + 0.92 × t. Color is iron-scale(t) with piecewise OKLCH ranges between the four stops. Drain keeps the last color and animates height to 0 over 240ms.
- Fill color is computed for the indicator (physical iron) and passed as a component-local custom property. Trough and edge use theme semantic aliases. Do not map fill onto warning/danger tokens. See ADR 0001.
- Geometry: 4×96, bottom-right of the conversation column, inset from the column’s right edge and above the composer via the existing composer-height custom property. pointer-events none. aria-hidden.
- Ship in the web-app bundle; omit from headless/ACP/CLI. Unload by removing or disabling the plugin row in a profile patch. No Config fields for 37s, drain, min fill, or colors.
- Do not change agent-loop, LLM adapters, or Think row behavior. Compaction and title requests stay idle if they do not stream reasoning as the tail.
- Implement-time Agent Note is still required by repo policy; CONTEXT.md is the glossary, ADR 0001 is the token exception.

## Testing Decisions

**Highest seam (prefer this one):** the indicator’s user-visible state as a function of the live conversation snapshot + clock. Drive fixtures that already assemble conversation snapshots / partials from session events (same style as conversation-node and chat-view tests). Assert idle vs thermometer vs drain, t/clamp, height remap, current-session isolation, wait-origin recovery, drain preempt, and reduced-motion snap. Do not assert CSS class names, Color.js internals, or render counts.

**Composition seam:** the plugin occupies the conversation-column overlay seat and stays out of details and composer. Skeleton/layout tests (or a focused overlay test) assert it is in the conversation column, above the composer inset, not the frame corner.

**Assembled Web:** if the chrome is visible in the shipped web profile, add or update a keyless web snapshot through a real runnable example in the same change (repo testing policy). Package tests and mock-only fixtures do not replace that transcript.

**What a good test is:** external behavior only — what a user would see or what the snapshot exposes (idle track empty, fill present with expected height/color at a frozen clock, drain then idle, switch session). Clock is injected; no wall-clock sleeps.

**Prior art:** conversation-node-definitions (streaming partial / reasoning tail), chat-view and ReasoningRow (running iff streaming and last block is reasoning), ui-jobs (additive slot plugin, locale, no RPC), directory-picker loading indicator (silence vs visible chrome), runtime partial accumulator tests, web snapshot lane for assembled GUI.

## Out of Scope

- Visual prototype of alternate sizes or palettes
- Multi-session merged wait, subagent waits while viewing the parent
- Settings toggle, Config tunables, theme-adapted iron, traffic-light colors, furnace-window gradient in the bar
- CLI / ACP / headless chrome
- Walking iron scale backwards (cooling)
- Native multi-stop API in Color.js
- Changing Think row, stats line, or model-visible log
- Clickable or screen-reader-announced duration on the track

## Further Notes

- Wait origin is not `firstTokenTime`. That stamp is the first non-empty text, reasoning, or tool delta and ignores `block-start`.
- Grill skipped a runnable UI prototype; 4×96 and the four hex stops may need a follow-up visual tweak without changing the domain terms.
- This fork’s GitHub Issues are disabled; this spec is the tracker record.
