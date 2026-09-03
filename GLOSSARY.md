# DeepSeek Harness 核心术语表 (Glossary)

本术语表定义了 DeepSeek Harness 代码库与教学过程中使用的标准术语与概念契约。

## Terms

**Cordis Context**:
插件系统运行时的依赖注入与生命周期作用域容器，所有服务注入、事件监听和副作用均挂载于其上。
_Avoid_: 依赖注入容器 (DI Container), 全局状态 (Global State)

**Service**:
通过 `ctx.provide` 声明并在 `ctx` 属性上暴露的高内聚能力接口，依赖方通过 `inject: [...]` 显式声明。
_Avoid_: 组件 (Component), 模块实例 (Module Instance)

**Effect**:
挂载在 Context 上的可逆副作用（如事件监听、定时器、服务注册），在插件或 Context 作用域销毁时由框架自动逆向调用 Disposer 注销。
_Avoid_: 副作用钩子, 注册回调

**Profile**:
命名的 Harness 应用运行态装配方案（如 `headless`, `web`, `sdk`），决定要加载的 Bundle 列表及其补丁应用策略。
_Avoid_: 运行模式, 环境配置

**Bundle**:
一组预置的 Cordis 插件配置行及其代码的打包分发单元（如 `dsh-base`, `dsh-headless`），按顺序层叠并可通过补丁重写。
_Avoid_: 插件包, 模块包

**Capability Seam (能力缝隙)**:
具备完整三角关系（Service Definition 接口声明、Service Provider 具象实现、Consumer 消费端如 Tool）的可插拔能力抽象边界。
_Avoid_: 功能模块, 接口封装

**Turn 与 Step**:
Turn 是一轮完整的用户目标交付周期（从首个输入被认领到无可继续工作），包含 0 到多次 Step；Step 是单次“模型请求 + 工具执行”闭环。
_Avoid_: 对话轮次 (Chat Round), 循环步数

**Session Event**:
追加写入持久化会话日志的不可变领域事实，是系统状态还原、Prompt 上下文推导与 Replay 回放的唯一权威真实源。
_Avoid_: 历史消息 (Message History), 事件日志 (Event Log)
