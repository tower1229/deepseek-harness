# Thinking Indicator

Glossary for the model reasoning-wait indicator. It names the interval the chrome measures, not how the bar is drawn.

## Language

**Reasoning wait**:
The wall-clock while an assistant message's reasoning content is the in-flight streaming tail of a model request. It starts at the first reasoning evidence (`block-start` with blockType reasoning, or the first `reasoning-delta`) and ends when that reasoning is no longer the streaming tail.
_Avoid_: 思考, thinking, request wait, step, turn

**Full scale**:
The reasoning-wait duration at which the indicator is completely filled and the color is at its last stop. Elapsed time past full scale stays clamped there until the wait ends. The duration is 37 seconds. It is a design constant of this chrome, not a deployment Config field.
_Avoid_: timeout, limit, overtime

**Idle track**:
The indicator remains mounted in the corner at empty fill while there is no reasoning wait. The trough and edge use theme chrome; the fill does not.
_Avoid_: hidden indicator, unmount-on-idle, theme-shifted fill

**Minimum fill**:
The smallest colored height shown at the start of a reasoning wait, so a just-started wait is distinguishable from the idle track. The size is 8% of track height. During a wait, fill height is minFill + (1 − minFill) × t; idle height is 0. Fill color still uses unmapped t.
_Avoid_: max(minFill, t), idle and t=0 looking the same

**Current session**:
The indicator reports only the visible session's reasoning wait. A wait on another session leaves the track idle; switching back resumes from that wait's origin.
_Avoid_: global busy light, merged child-session wait

**Wait origin**:
The session-log time of the first reasoning evidence of the open partial. Elapsed reasoning wait is now minus this origin, clamped at full scale.
_Avoid_: first paint time, firstTokenTime (that stamp is the first non-empty text, reasoning, or tool delta, not this origin)

**Iron scale**:
The fill's color path, interpolated in OKLCH across four stops: `#4a4d52` (cool metal, t=0), `#9a2b1f` (dull red, t=⅓), `#e07020` (hot orange, t=⅔), `#ffe28a` (molten yellow-white, t=1). The fill is a physical temperature and does not change with light/dark theme.
_Avoid_: traffic light, green-to-red, semantic warning/danger

**Thermometer**:
Fill color uses clamped t (elapsed wait / full scale). Fill height remaps that t onto [minimum fill, full]. The visible fill is one color at that t, not a multi-stop gradient along the bar. The fill grows from the bottom of the track.
_Avoid_: furnace window, stacked legend, top-down fill

**Drain**:
When a reasoning wait ends, fill height animates to empty while color stays frozen at the last t. After the height reaches empty, the track is idle. A new reasoning wait on the current session preempts drain and starts a thermometer from that wait's origin. Reduced motion skips drain and snaps to idle. Drain duration is 240ms and is a design constant of this chrome, not a deployment Config field.
_Avoid_: snap, cooling (the iron scale is not walked backwards), queued drain

**Web chrome**:
The indicator ships in the web profile's web-app bundle and is absent from headless, ACP, and CLI. A profile patch can unload the plugin. There is no separate Settings toggle.
_Avoid_: opt-in-only plugin, settings checkbox

**Conversation corner**:
The track sits at the bottom-right of the conversation column, not the viewport corner and not on the composer. An open details column leaves the track on the conversation, not on details. The track is 4×96 px, inset from the column's right edge and above the composer, fixed (does not scroll with messages).
_Avoid_: viewport corner, composer accessory
