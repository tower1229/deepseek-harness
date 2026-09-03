# Mission: DeepSeek Harness 架构与插件开发

## Why
深入掌握 DeepSeek Harness 的底层 Cordis 运行机制与核心生命周期，能够独立开发高内聚的扩展插件与完整的 Capability Seam，并在系统出现复杂异步状态、服务依赖或事件中断时具备精准排查与调试能力。

## Success looks like
- 能够清晰讲出 `dsh` 从 CLI 启动、Profile/Bundle 叠加、Cordis 依赖注入到 Agent Loop（Turn/Step/Inbox）的完整生命周期。
- 能够独立设计并实现一个符合规范的三件套 Capability Seam（Service Definition + Provider + Tool Consumer），通过类型检查与单测。
- 能够熟练利用 Session Log（`deriveMessages`、事件回放）、Cordis typed events（Waterfall / Serial）、`verify-*` 门禁与 Runtime Invariants 排查定位系统故障。

## Constraints
- 已具备熟练的 TypeScript 与 AI Agent 开发基础，跳过基础语意铺垫，直奔 Cordis 设计与 Harness 落地细节。
- 教学采用渐进式实操，每课产出独立、美观、带即时反馈的自包含 HTML Lesson。

## Out of scope
- TypeScript 语法与基础类型体操教学。
- 通用 LLM Prompt 工程技巧与通用大模型 API 原理。
