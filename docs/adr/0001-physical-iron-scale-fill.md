# Physical iron-scale fill, not theme semantic color

English | [中文](0001-physical-iron-scale-fill.zh.md)

The reasoning-wait thermometer's fill is a physical temperature (cool metal → dull red → hot orange → molten yellow-white) and stays the same in light and dark. Feature CSS must not map that fill onto `--dsw-alias-*` warning/danger tokens, and the iron scale must not gain a light-theme restyle. The idle track's trough and edge remain theme chrome; only the fill is exempt. The fill arc grows clockwise from the ring bottom (6 o'clock), matching the ContextMeter occupancy direction.

## Considered Options

- Theme-adapted iron (separate light/dark endpoints) — rejected because molten metal is not a brand color.
- Semantic duration tokens (`warning` / `danger` as wait grows) — rejected because that is a traffic light, not an iron scale.

See [CONTEXT.md](../../CONTEXT.md) (`Iron scale`, `Idle track`).
