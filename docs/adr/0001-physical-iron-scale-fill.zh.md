# 物理 iron-scale 填充，不是主题语义色

[English](0001-physical-iron-scale-fill.md) | 中文

reasoning-wait 温度计的填充是物理温度（冷金属 → 暗红 → 热橙 → 熔融黄白），在浅色和深色下保持不变。功能 CSS 不得把该填充映射到 `--dsw-alias-*` 的 warning/danger token 上，iron scale 也不得为浅色主题另做一套。idle track 的槽和边仍走主题 chrome；只有填充豁免。填充弧从圆环底部（6 点钟）顺时针增长，与 ContextMeter 占用率圆环同向。

## 考虑过的选项

- 为主题适配的铁色（浅色／深色两套端点）— 否决，因为熔融金属不是品牌色。
- 语义时长 token（wait 变长时用 `warning` / `danger`）— 否决，因为那是交通灯，不是 iron scale。

见 [CONTEXT.md](../../CONTEXT.md)（`Iron scale`、`Idle track`）。
