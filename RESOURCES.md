# DeepSeek Harness Resources

## Knowledge

- [Document: Architecture Guide (`docs/architecture.md`)](file:///Users/zangtao/Workspace/Playground/deepseek-harness/docs/architecture.md)
  系统顶层架构图景，涵盖 Cordis 插件模型、Profile/Bundle 分层、Turn/Step 循环与 Session 映射原则。用作学习整体架构的北极星。
- [Document: Cordis Primer (`docs/cordis-primer.md`)](file:///Users/zangtao/Workspace/Playground/deepseek-harness/docs/cordis-primer.md)
  Cordis 框架核心机制（Context 树、Service 依赖注入、Effect 生命周期、Waterfall 监听链）。用作理解插件通信与状态清理的底层依据。
- [Document: Capability Seams (`docs/capability-seams.md`)](file:///Users/zangtao/Workspace/Playground/deepseek-harness/docs/capability-seams.md)
  全仓库能力缝隙与服务依赖全景图（Mermaid 拓扑）。用作设计新 Service 或查找现有服务实现关系时的参考。
- [Document: Tool Authoring Reference (`docs/cookbook/adding-a-tool.md`)](file:///Users/zangtao/Workspace/Playground/deepseek-harness/docs/cookbook/adding-a-tool.md)
  `defineTool` 协议规范、参数校验、返回值规范与 UI Card 渲染约束。用作编写 model-facing tool 时的契约手册。
- [Package: `packages/boot/app-boot`](file:///Users/zangtao/Workspace/Playground/deepseek-harness/packages/boot/app-boot/README.md)
  应用启动核心，负责环境变量加载、Profile bundle 组合、`cordis.patch.yml` 叠加与故障快速失败。用作排查启动与装配问题的关键源码。
- [Package: `packages/core/agent-loop`](file:///Users/zangtao/Workspace/Playground/deepseek-harness/packages/core/agent-loop/README.md)
  Agent Loop 运行时实现，管理 Inbox 消费、`agent/pre-step` 决策、Turn/Step 分界与模型调用。用作调试循环与消息流转的核心代码。

## Wisdom (Communities & Practice)

- [Repository: DeepSeek Harness Tests & Snapshots (`snapshots/`)](file:///Users/zangtao/Workspace/Playground/deepseek-harness/snapshots)
  最真实的零 API Key 录制会话回放。用作观察真实环境下的 SessionEvent 与 Tool 行为的验证基准。
- [Cordis Upstream & Discussions](https://cordis.moe/)
  Cordis 官方文档与设计哲学，解答 IOC 容器与微内核插件机制的深度设计意图。
