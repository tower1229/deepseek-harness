# 掌握 Capability Seam 三件套设计与 defineTool 契约规范

学习者掌握了 Harness 最核心的解耦抽象——Capability Seam（Service Definition + Service Provider + Tool Consumer）。理解了 Declaration Merging 在 Context 上的类型扩展方式、Provider 注册与 Disposer 注销机制，以及 `defineTool` 中关于 Canonical Value、`exec.signal` 中断处理和 Presentation 纯函数投影的严格要求。

## Implications
- 学习者现在具备独立设计并在 Harness 中实现新扩展模块的能力，编写的代码能够符合仓库严格的架构门禁。
- 明确了 Provider 替换的威力（本地环境 vs 沙盒环境），为后续进行沙盒化、多环境支持打下了坚实基础。
