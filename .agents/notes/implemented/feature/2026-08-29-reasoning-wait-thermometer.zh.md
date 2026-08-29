# Agent Note: Reasoning-wait 温度计

Status: implemented

[English](2026-08-29-reasoning-wait-thermometer.md) | 中文

## 问题

在 Web 对话里，人无法一眼看出当前会话正在进行的思考已经跑了多久。Think 行展示的是 reasoning 文本，不是经过的热度。同一轮里模型思考、跑工具、再思考——缺口是一根常驻角落的条子，在思考阶段填充，正文流式开始后复位。

## 决策

web profile 在 composer trailing 行、ContextMeter 左侧提供 reasoning-wait 圆环：常驻 idle track，从 `step/start` 起至正文成为流式尾部前以单一 iron-scale 颜色自正下方（6 点钟）顺时针填充，20s 钳满，wait 结束时高度在 240ms 内线性抽空且颜色冻在最后的 t，若下一次 wait 开始则打断抽空。reduced motion 跳过抽空、直接 idle。只报告当前可见会话。Headless、ACP 与 CLI 不展示。可用 profile patch 卸掉插件；没有 Settings 开关。

[`@deepseek-ai/dsh-client-ui-reasoning-wait`](../../../../packages/client/ui-reasoning-wait/README.zh.md) 拥有圆环呈现，并以加性方式注册进 `'conversation.input.meter'`。它不替换对话列 occupant。[`ui-conversation`](../../../../packages/client/ui-conversation/README.zh.md) 在发送控件旁托管 meter 条。这层 chrome 不挂在 `shell.overlay`（视口大小）或列 HUD overlay（随 transcript chrome 滚动）上。

idle 圆环始终挂载：28×28 CSS 像素 shell，与 ContextMeter 共享 14px / 2px stroke 几何，track 走主题 border，`pointer-events: none`，`aria-hidden`，位于 composer trailing 行（ContextMeter 左侧），不进 transcript 滚动容器，也不进 details。wait origin 在 `step/start` 投影到 in-flight assistant partial（不新增 session event）。iron-scale 填充、ease-out 高度映射、抽空和 reduced-motion 跳过落在此插件中。

高度为 `8% + 92% × easeOut(t)`，t 为线性经过 / 20s，easeOut 为 CSS `cubic-bezier(0, 0, 0.58, 1)`（先快后慢的减速曲线，时速表指针效果）。HUD 从会话日志 `streamTime` 外推经过时间，并在 chunk 之间用客户端墙钟插值，避免 host/浏览器时钟偏差把圆环瞬间钳满；TTFT 仅有 `waitOrigin` 时以外推回退该时间。颜色按未重映射的线性 t 走 iron scale。顺时针填充通过 `rotate(90 7 7)` 与正 `stroke-dasharray` 实现。填充 stroke 走 `style.stroke`，以便 SVG 正确渲染 `color-mix(in oklch, …)` 渐变。`step/start` 的 publication 为 `immediate`，使 TTFT 期 hidden partial 进入 snapshot。wait origin 在切换会话、刷新、重连后仍接得上。切离仍在 wait 的会话时立刻 idle，不会把该会话的填充抽到下一根条子上。未写出 `assistant/message` 的中止与其它尾部变化一样结束 wait。

术语表：[CONTEXT.md](../../../../CONTEXT.md)。填充色例外：[ADR 0001](../../../../docs/adr/0001-physical-iron-scale-fill.zh.md)。

## 考虑过的替代方案

**把 chrome 挂在 `shell.overlay` 上。** 那一层是视口大小，不拥有 `--dsh-composer-height`，条子会落在框架角落，并随着输入增高盖住或错过 composer。

**把 chrome 挂在列 HUD overlay 或 composer input overlay 上。** 列 overlay 随 transcript chrome 滚动；input overlay 是输入卡片 chrome——都不是 ContextMeter 旁的 meter 条。

**idle 时卸载条子。** 角落会闪现闪没，人不知道该往哪看。idle track 才是常驻 HUD。

**填充走主题适配的铁色或 warning/danger token。** 已在 [ADR 0001](../../../../docs/adr/0001-physical-iron-scale-fill.zh.md) 否决：熔融金属不是品牌色，交通灯也不是 iron scale。track 仍走主题 chrome。

**为 20s / 抽空 / 最小填充 / 颜色做 Settings 开关或 Config。** 这套隐喻是该 chrome 的设计常量，不是部署旋钮。用 profile patch 卸掉插件。

**复用 `firstTokenTime` 作为 wait origin。** 那个时间戳是第一条非空 text、reasoning 或 tool delta，并忽略 `block-start` reasoning，因此 reasoning-only 的 origin 也会错。

**为这根条子新增面向模型的 session event。** 呈现用的钟不属于日志。wait origin 是 open partial 上已有会话日志时间的投影。

**抽空时沿 iron scale 往回走（冷却）。** 抽空是清空，不是冷却；颜色冻在最后的 t，高度抽到空。

**从底部逆时针填充以区分 ContextMeter。** 早期否决；产品现要求与 ContextMeter 同向的顺时针填充，从同一 6 点起点读取为思考热度而非第二根占用率圆环。

**线性高度映射。** 填充阶段否决：匀速弧长增长不像经过的热度；ease-out 减速符合时速表指针体感。

## 后果

idle 圆环是 composer trailing 行上的常驻 chrome。Grill 跳过了可运行的 UI 原型，所以圆环尺寸与四个 hex 停点以后可能要做视觉微调，但不改领域术语。

idle chrome 由 `apps/web/tests/reasoning-wait-idle-track.e2e.ts` 钉住。进行中的 wait 由 `apps/web/tests/reasoning-wait-thermometer.e2e.ts` 钉住，该场景通过带 `chunks` 的 `hang` sidecar 把 reasoning 停在流式尾部。抽空、打断、reduced-motion 跳过、切会话立刻 idle、圆环几何（底部起点、顺时针 dash）与 ease-out 高度，由 `advanceReasoningWait`、`ring-geometry` 与 track 组件规格钉住。
