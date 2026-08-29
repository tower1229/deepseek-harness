# @deepseek-ai/dsh-client-ui-reasoning-wait

[English](README.md) | 中文

Web reasoning wait 圆环的归属方：向 `conversation.input.meter` 贡献一个 meter 条目，与 composer trailing 行里的上下文占用 ContextMeter 并排（[`ui-conversation`](../ui-conversation/README.zh.md) meter host）。

圆环是 idle chrome，直到当前会话的 open assistant partial 处于思考窗口（`step/start` 起、正文成为流式尾部前）：那时从正下方（6 点钟）以单一 iron-scale 颜色顺时针填充。

高度为 `8% + 92% × easeOut(t)`，t = 已经过的 wait / 20s，钳在 1；easeOut 为 CSS `cubic-bezier(0, 0, 0.58, 1)`（先快后慢的减速曲线）。经过时间从会话日志 `streamTime`（最新 `assistant/chunk`）外推，并在 chunk 之间用客户端墙钟插值，避免 host/浏览器时钟偏差把圆环瞬间钳满；TTFT 仅有 `waitOrigin` 时以外推回退该时间。颜色按未重映射的线性 t 沿 iron scale 在 OKLCH 中插值。wait origin 在 `step/start` 打点，不是 `firstTokenTime`。

wait 结束时高度在 240ms 内线性抽到空，颜色冻在最后的 t。当前会话上的新 wait 会打断抽空，并从该 origin 再起（最小填充、冷金属）。reduced motion 跳过抽空、直接 idle。切离仍在 wait 的会话时立刻 idle。

正文成为流式尾部、tool-call 尾部、工具执行、关闭 thinking 的请求、以及其他会话都保持 idle。切回仍在 wait 的会话时按该 origin 接上。

圆环使用 28×28 CSS 像素 shell，与 ContextMeter 共享 14px / 2px stroke 几何。`aria-hidden` 且 `pointer-events: none`。track 使用主题 border 别名（`--dsw-alias-border-l3`）；填充是组件局部 iron-scale hex，不映射到 warning 或 danger token。插件默认打进 web-app 组合包，headless、ACP 与 CLI 不含；用 profile patch 删除或禁用该插件行即可卸掉。没有 Settings 开关，也没有几何、20s 刻度、抽空、最小填充或颜色相关 Config。

[reasoning wait 温度计决策](../../../.agents/notes/implemented/feature/2026-08-29-reasoning-wait-thermometer.zh.md)记录放置、iron scale 填充、圆环运动与抽空。[CONTEXT.md](../../../CONTEXT.md) 是术语表；[ADR 0001](../../../docs/adr/0001-physical-iron-scale-fill.zh.md) 是填充色例外。

## 模型体验

无，因为本包渲染装饰性浏览器 chrome，不触及 prompt、消息、schema、流或工具结果。

#### KV Cache effect

无；本包从不组装或发送 provider 请求。

## 已知限制与暂缓事项

- **Grill 跳过了可运行的 UI 原型** — 圆环尺寸与四个 hex 停点以后可能要做视觉微调，但不改领域术语。
