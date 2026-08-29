# @deepseek-ai/dsh-client-ui-reasoning-wait

English | [中文](README.zh.md)

Web reasoning-wait thermometer owner: contributes one entry to `conversation.overlay`, a session-maybe column HUD list declared by [`dsh-client-ui-conversation`](../ui-conversation/README.md). The track is a 4×96 CSS-pixel trough at the conversation column's bottom-right. On hero it sits in the column corner; in the active phase it sits above the docked composer via `--dsh-composer-height`. It stays mounted with no current session (hero) and while a session is visible, and it does not occupy details or scroll with the transcript.

The trough is idle chrome: empty fill, `aria-hidden`, and `pointer-events: none`. Trough and edge use theme aliases (`--dsw-alias-bg-layer-1`, `--dsw-alias-border-l2`), not warning or danger tokens. The plugin ships in the web-app bundle by default and is absent from headless, ACP, and CLI; unload it by removing or disabling the plugin row in a profile patch. There is no Settings toggle and no Config for geometry.

The [reasoning-wait thermometer proposal](../../../.agents/notes/proposed/feature/2026-08-29-reasoning-wait-thermometer.md) records placement, iron-scale fill, and drain. [CONTEXT.md](../../../CONTEXT.md) is the glossary; [ADR 0001](../../../docs/adr/0001-physical-iron-scale-fill.md) is the fill-token exception.

## Model Experience

None, as this package renders decorative browser chrome and touches no prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **Fill stays empty** — the trough does not yet grow or color during reasoning wait; thermometer fill, wait-origin projection, drain, and the assembled web snapshot belong to later slices of the same plugin.
