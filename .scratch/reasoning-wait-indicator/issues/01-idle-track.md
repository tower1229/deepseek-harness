# 01 — Idle track 挂上对话列角

**What to build:** Web 对话列右下出现一根常驻 4×96 空槽。没有当前会话（hero）、以及当前会话不在 reasoning wait 时，槽都是 idle。条子贴在对话列里、composer 之上，不进 details、不跟消息滚、不抢点击、对读屏隐藏。槽和边走主题 chrome。web profile 默认加载；headless / ACP / CLI 没有这根条。可用 profile patch 卸掉插件。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 打开 web profile 时，对话列右下能看到 idle track（无填充）
- [ ] hero / 无当前会话时 track 仍在，且为空
- [ ] details 打开时 track 仍在对话列，不在 details 上
- [ ] track 在 composer 之上，不随 transcript 滚动
- [ ] 槽不拦截点击，且不进入无障碍树
- [ ] 槽和边使用主题色，不是语义 warning/danger
- [ ] headless 组装不含此 chrome
