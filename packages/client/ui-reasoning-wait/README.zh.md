# @deepseek-ai/dsh-client-ui-reasoning-wait

[English](README.md) | 中文

Web reasoning wait 温度计的归属方：向 `conversation.overlay` 贡献一个条目，该 slot 是 [`dsh-client-ui-conversation`](../ui-conversation/README.zh.md) 声明的 session-maybe 列 HUD 列表。条子是对话列右下的 4×96 CSS 像素空槽。hero 时落在列角；active 阶段经 `--dsh-composer-height` 贴在已停靠的 composer 之上。没有当前会话（hero）以及有可见会话时都保持挂载，不进入 details，也不随 transcript 滚动。

空槽是 idle chrome：无填充、`aria-hidden`、`pointer-events: none`。槽和边使用主题别名（`--dsw-alias-bg-layer-1`、`--dsw-alias-border-l2`），不用 warning 或 danger token。插件默认打进 web-app 组合包，headless、ACP 与 CLI 不含；用 profile patch 删除或禁用该插件行即可卸掉。没有 Settings 开关，也没有几何相关 Config。

[reasoning wait 温度计提案](../../../.agents/notes/proposed/feature/2026-08-29-reasoning-wait-thermometer.zh.md)记录放置、iron scale 填充与抽空。[CONTEXT.md](../../../CONTEXT.md) 是术语表；[ADR 0001](../../../docs/adr/0001-physical-iron-scale-fill.zh.md) 是填充色例外。

## 模型体验

无，因为本包渲染装饰性浏览器 chrome，不触及 prompt、消息、schema、流或工具结果。

#### KV Cache effect

无；本包从不组装或发送 provider 请求。

## 已知限制与暂缓事项

- **填充保持为空** — 空槽尚未在 reasoning wait 期间增高或上色；温度计填充、wait origin 投影、抽空以及组装后的 web 快照属于同一插件的后续切片。
