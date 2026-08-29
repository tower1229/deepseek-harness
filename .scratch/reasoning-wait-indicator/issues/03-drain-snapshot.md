# 03 — Drain、打断、reduced-motion，以及组装快照

**What to build:** reasoning wait 结束后，填充在 240ms 内抽到空槽，颜色冻在结束时的 t（不沿 iron scale 往回走）。抽空过程中若当前会话又进入 reasoning wait，立刻打断 drain，按新 wait origin 从 minimum fill / 冷金属再起。系统 reduced-motion 时跳过 drain，直接 idle。用 keyless web 快照钉住组装后的 chrome。同一 PR 写落地 Agent Note。

**Blocked by:** 02 — 当前会话的 reasoning wait 温度计

**Status:** ready-for-agent

- [ ] wait 结束时高度 240ms 抽空，颜色保持结束时的铁色，抽完后为空槽
- [ ] drain 中途新的 reasoning wait 打断 drain，条子跳到新 wait 的 thermometer
- [ ] reduced-motion 下 wait 结束立刻 idle，无抽空动画
- [ ] 组装 web profile 的 keyless 快照覆盖 idle 与至少一次 reasoning wait 可见态
- [ ] 落地 Agent Note（含 ADR 0001：填充不走语义 token）
