# 掌握 Agent Loop 调度流水线与 Session Event 驱动模型

学习者建立了对 Harness 核心运行时心智模型的系统认知：内存中没有常驻的 messages 数组，Session Event Log 是唯一的不可变真实源，历史记录全部通过 `deriveMessages()` 纯函数按需投影。理解了 Turn（完整目标周期）与 Step（单次模型+工具闭环）的严格划分、Inbox 的原子认领原则，以及工具调度的 Parallel 并发池与 Exclusive 屏障机制。

## Implications
- 为后续编写 Capability Seam 和自定义工具打下了坚实的运行时基础：知道工具调用何时触发、返回结果如何作为事件进入 Session Log 并影响下一个 Step 的上下文。
- 在后续排查系统卡死、事件中断或重放异常时，可以直接基于 Turn/Step 边界和 `session.snapshotEvents()` 定位根本原因。
