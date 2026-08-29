# 02 — 当前会话的 reasoning wait 温度计

**What to build:** idle track 在当前会话进入 reasoning wait 时变成温度计：第一次 reasoning 证据开始填充；高度为 8% + 92% × t，颜色沿 iron scale 走未经重映射的 t；满刻度 37s 后条满、色停在熔融黄白。TTFT、正文、tool-call、工具执行、关 thinking 的请求保持 idle。只报告当前可见会话：切到空闲会话为空槽；切回仍在 wait 的会话时按 wait origin 接上已过墙钟。刷新/重连只要 partial 还在，钟不从 0 重来。wait origin 是该 open partial 第一次 reasoning 证据的会话日志时间，不是 first-token 时间，也不新增 session event。

**Blocked by:** 01 — Idle track 挂上对话列角

**Status:** ready-for-agent

- [ ] 第一个 reasoning 证据到来时出现 minimum fill（冷金属），而不是等 TTFT 结束前就亮
- [ ] 高度按 8% + 92% × t 增长，颜色按纯 t 走四停 iron scale（OKLCH），单色温度计，从槽底往上
- [ ] 超过 37s 条满且色钳在终点，直到 wait 结束
- [ ] reasoning 不再是流式尾部（正文 / tool-call / 流结束或中止）时回到 idle（本票允许立刻变空；drain 在 03）
- [ ] 工具执行期间 idle；其它会话的 wait 不点亮当前条
- [ ] 切回仍在 wait 的会话时按 wait origin 接上，钳在 full scale
- [ ] 不新增 session event；wait origin 不复用 firstTokenTime
