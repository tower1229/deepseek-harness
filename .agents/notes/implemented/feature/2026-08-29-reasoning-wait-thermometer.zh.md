# Agent Note: Reasoning-wait 温度计

Status: implemented

[English](2026-08-29-reasoning-wait-thermometer.md) | 中文

## 问题

在 Web 对话里，人无法一眼看出当前会话正在进行的 reasoning 已经跑了多久。Think 行展示的是 reasoning 文本，不是经过的热度。同一轮里模型 reasoning、跑工具、再 reasoning——缺口是一根常驻角落的条子，只在 reasoning wait 期间填充，并在两次 wait 之间复位。

## 决策

web profile 在对话列右下提供一根温度计：常驻 idle track，reasoning wait 经过时从槽底以单一 iron-scale 颜色向上填充，37s 钳满，wait 结束时高度在 240ms 内抽空且颜色冻在最后的 t，若下一次 wait 开始则打断抽空。reduced motion 跳过抽空、直接 idle。只报告当前可见会话。Headless、ACP 与 CLI 不展示。可用 profile patch 卸掉插件；没有 Settings 开关。

[`@deepseek-ai/dsh-client-ui-reasoning-wait`](../../../../packages/client/ui-reasoning-wait/README.zh.md) 拥有温度计呈现，并以加性方式注册进 `'conversation.overlay'`。它不替换对话列 occupant。[`ui-conversation`](../../../../packages/client/ui-conversation/README.zh.md) 把该列表声明为 session-maybe 的列固定 HUD。这层 chrome 不挂在 `shell.overlay`（视口大小、没有 composer-height）或 `conversation.input.overlay`（输入 chrome）上。

idle 空槽始终挂载：4×96 CSS 像素，槽和边走主题 chrome，`pointer-events: none`，`aria-hidden`，hero（列角；composer 居中）与有可见会话时（经 `--dsh-composer-height` 贴在已停靠的 composer 之上）都在，不进 transcript 滚动容器，也不进 details。wait origin 投影落在 [`ui-conversation`](../../../../packages/client/ui-conversation/README.zh.md) 的 in-flight assistant partial 上（不新增 session event）。iron-scale 填充、抽空和 reduced-motion 跳过落在此插件中。

填充从第一次 reasoning 证据起按高度 `8% + 92% × t`、颜色按未重映射的 t 走 iron scale。wait origin 在切换会话、刷新、重连后仍接得上。切离仍在 wait 的会话时立刻 idle，不会把该会话的填充抽到下一根条子上。未写出 `assistant/message` 的中止与其它尾部变化一样结束 wait。

术语表：[CONTEXT.md](../../../../CONTEXT.md)。填充色例外：[ADR 0001](../../../../docs/adr/0001-physical-iron-scale-fill.zh.md)。

## 考虑过的替代方案

**把 chrome 挂在 `shell.overlay` 上。** 那一层是视口大小，不拥有 `--dsh-composer-height`，条子会落在框架角落，并随着输入增高盖住或错过 composer。

**把 chrome 挂在 `conversation.input.overlay` 或 composer dock 上。** 那些席位是输入 chrome；条子会跟输入卡片一起滚动或排版，并在 composer takeover 下消失。

**idle 时卸载条子。** 角落会闪现闪没，人不知道该往哪看。idle track 才是常驻 HUD。

**填充走主题适配的铁色或 warning/danger token。** 已在 [ADR 0001](../../../../docs/adr/0001-physical-iron-scale-fill.zh.md) 否决：熔融金属不是品牌色，交通灯也不是 iron scale。槽和边仍走主题 chrome。

**为 37s / 抽空 / 最小填充 / 颜色做 Settings 开关或 Config。** 这套隐喻是该 chrome 的设计常量，不是部署旋钮。用 profile patch 卸掉插件。

**复用 `firstTokenTime` 作为 wait origin。** 那个时间戳是第一条非空 text、reasoning 或 tool delta，并忽略 `block-start` reasoning，因此 TTFT 静默会点亮条子，reasoning-only 的 origin 也会错。

**为这根条子新增面向模型的 session event。** 呈现用的钟不属于日志。wait origin 是 open partial 上已有会话日志时间的投影。

**抽空时沿 iron scale 往回走（冷却）。** 抽空是清空，不是冷却；颜色冻在最后的 t，高度抽到空。

## 后果

idle track 是 4px 列上的常驻 chrome；窄视口若与回到底部控件重叠，条子保持不可交互，因此抢不走该控件的点击。Grill 跳过了可运行的 UI 原型，所以 4×96 和四个 hex 停点以后可能要做视觉微调，但不改领域术语。

idle chrome 由 `apps/web/tests/reasoning-wait-idle-track.e2e.ts` 钉住。进行中的 wait 由 `apps/web/tests/reasoning-wait-thermometer.e2e.ts` 钉住，该场景通过带 `chunks` 的 `hang` sidecar 把 reasoning 停在流式尾部。抽空、打断、reduced-motion 跳过、以及切会话立刻 idle，由 `advanceReasoningWait` 与 track 组件规格钉住。
