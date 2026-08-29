# @deepseek-ai/dsh-client-ui-reasoning-wait

[English](README.md) | 中文

Web reasoning wait 温度计的归属方：向 `conversation.overlay` 贡献一个条目，该 slot 是 [`dsh-client-ui-conversation`](../ui-conversation/README.zh.md) 声明的 session-maybe 列 HUD 列表。条子是对话列右下的 4×96 CSS 像素空槽。hero 时落在列角；active 阶段经 `--dsh-composer-height` 贴在已停靠的 composer 之上。没有当前会话（hero）以及有可见会话时都保持挂载，不进入 details，也不随 transcript 滚动。

空槽是 idle chrome，直到当前会话的 open assistant partial 以 reasoning 为流式尾部：那时从槽底以单一 iron-scale 颜色填充。

高度为 `8% + 92% × t`，t = 已经过的 wait / 37s，钳在 1；颜色按未重映射的 t 沿 `#4a4d52` → `#9a2b1f` → `#e07020` → `#ffe28a` 在 OKLCH 中插值。填充从第一次 reasoning 证据（`block-start` reasoning 或第一条 `reasoning-delta`）开始，以该证据的会话日志时间为 wait origin，而不是 `firstTokenTime`。

wait 结束时高度在 240ms 内抽到空，颜色冻在最后的 t。当前会话上的新 wait 会打断抽空，并从该 origin 再起温度计（最小填充、冷金属）。reduced motion 跳过抽空、直接 idle。切离仍在 wait 的会话时立刻 idle。

TTFT 静默、正文或 tool-call 尾部、工具执行、关闭 thinking 的请求、以及其他会话都保持 idle。切回仍在 wait 的会话时按该 origin 接上。

空槽为 `aria-hidden` 且 `pointer-events: none`。槽和边使用主题别名（`--dsw-alias-bg-layer-1`、`--dsw-alias-border-l2`）；填充是组件局部自定义属性，不映射到 warning 或 danger token。插件默认打进 web-app 组合包，headless、ACP 与 CLI 不含；用 profile patch 删除或禁用该插件行即可卸掉。没有 Settings 开关，也没有几何、37s、抽空、最小填充或颜色相关 Config。

[reasoning wait 温度计决策](../../../.agents/notes/implemented/feature/2026-08-29-reasoning-wait-thermometer.zh.md)记录放置、iron scale 填充与抽空。[CONTEXT.md](../../../CONTEXT.md) 是术语表；[ADR 0001](../../../docs/adr/0001-physical-iron-scale-fill.zh.md) 是填充色例外。

## 模型体验

无，因为本包渲染装饰性浏览器 chrome，不触及 prompt、消息、schema、流或工具结果。

#### KV Cache effect

无；本包从不组装或发送 provider 请求。

## 已知限制与暂缓事项

- **Grill 跳过了可运行的 UI 原型** — 4×96 和四个 hex 停点以后可能要做视觉微调，但不改领域术语。
