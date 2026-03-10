---
title: agent 的 skill 与 toolcall
date: 2026-03-10 10:42:55
tags:
    - 笔记
    - AI
    - Agent
---

<!-- more -->

## skill 是什么

`skill` 可以理解为给 agent 的“可复用操作手册”。

- 它描述一类任务该怎么做（流程、注意点、约束）
- 通常放在 `SKILL.md`，必要时配套脚本和参考资料
- 目标是让 Agent 在相似任务上更稳定，而不是每次临时发挥

一句话：`skill` 决定“怎么做这类事”。

### 一个简单的 skill 例子

例如：`sql-review` skill

- 触发场景：用户说“帮我 review 这段 SQL”
- skill 内容：
    - 先检查语义正确性
    - 再检查索引命中与全表扫描风险
    - 最后给出优化版 SQL 和风险说明

这个 `skill` 不直接执行数据库命令，它主要提供步骤和标准。

### 实现一个 skill？

- 先定义触发条件：什么请求出现时要启用这个 skill
- 写 `SKILL.md`：目标、输入输出、执行步骤、失败处理
- 把可重复动作脚本化：放到 `scripts/`，减少手工操作
- 用 2~3 个真实任务验证：看结果是否稳定、是否真的省步骤

重点不是“写得多”，而是“可复用、可触发、可稳定执行”。

```markdown
---
name: sql-review
description: Review SQL for correctness and performance risks.
---

## Workflow

1. 检查 SQL 语义是否正确（字段、表、聚合、条件）
2. 检查性能风险（全表扫描、函数索引失效、排序开销）
3. 输出优化建议（修改版 SQL + 风险说明）
```

## toolcall 是什么

`toolcall` 是 Agent 在当前任务里实际调用工具的动作。

- 例如读文件、搜文本、运行测试、改文件
- 每次调用都有输入和输出，属于“执行层”
- 它解决的是“现在这一步具体怎么落地”

一句话：`toolcall` 决定“这一刻做什么操作”。

### 一个简单的 toolcall 例子

用户说：“把 `README.md` 里所有 `foo` 改成 `bar`。”

可能的 `toolcall` 流程：

- 读取文件内容
    - 比如执行 `cat` 命令
- 执行替换
    - 比如执行 `sed` 命令
- 再读一遍确认替换结果
    - 然后再执行 `cat` 命令

这里每一步都是具体调用工具，不是抽象流程说明。

## skill 和 toolcall 的区别是什么

按我的理解：`skill` 是策略模板；`toolcall` 是具体执行的工具

- 抽象层级：
    - `skill` 高层、可复用
    - `toolcall` 低层、面向当前任务
- 生命周期：
    - `skill` 可长期复用
    - `toolcall` 是一次会话中的临时动作
- 作用对象：
    - `skill` 约束“方法论”
    - `toolcall` 改变“当前环境/文件/结果”

还是按照刚刚的例子：`sql-review` skill

- 先检查语义正确性
    - 调用某种 sql linter 来检查
    - ↑*工具调用*
- 再检查索引命中与全表扫描风险
    - 检查索引命中需要连接到数据库
    - ↑*工具调用*
- 最后给出优化版 SQL 和风险说明

而这一整个流程实际上是一整个 `skill`，可以说 `skill` 本身就是由 LLM 本身能力+一大堆 `toolcall` 实现的
