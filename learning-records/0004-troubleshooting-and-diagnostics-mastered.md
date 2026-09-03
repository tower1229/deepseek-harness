# 掌握系统排障诊断、Invariants 断言与 Snapshot 回放

学习者掌握了 Harness 系统的物理防线与核心排障机制：理解了 Invariant 断言的防御哲学（如 `agent-loop/invariant.ts` 中拦截 `log-reconstruction desync` 的防线）、精通了 5 大典型故障模式（启动依赖缺失、Waterfall 链断裂、内存与幽灵回调泄漏、工具超时阻塞、状态脱节），并掌握了利用 `snapshots/` 进行离线零 Key 确定性回放复现的技术手段。

## Implications
- 学习者已建立起对 DeepSeek Harness 全链路的深度认知闭环：从 CLI 启动、Bundle 装配、Cordis 依赖注入，到 Agent Loop 调度、Capability Seam 三位一体编写，再到深入日志溯源与断言排错。
- `MISSION.md` 中设定的三大核心成功指标全部达成，具备了独立贡献、深度定制与系统级疑难排查的完整能力。
