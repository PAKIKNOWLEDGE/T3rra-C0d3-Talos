# Codex 对标 × `talos studio` × 第一期预期

更新：2026-10-10。拍板用，**不是**实现待办。协议方法以引擎 [studio-parity](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/blob/main/docs/studio-parity.md) 为准。

## 架构差一句

Codex 桌面背后是自家线程后台。Talos Desktop 是本机 **`talos studio` 子进程**（与 TUI 同一 runtime）。可以对标工作室长什么样，不能对标云同步后台。

## Codex 是这样（用户可见，浓缩）

| 组 | 用户得到 |
| --- | --- |
| 项目 | 开本机文件夹；可多项目 |
| 活 / 历史 | 每项目多条线程；钉/改名/归档 |
| 并行 | 多条同时跑 |
| Git 审查 | diff、行评、commit/PR |
| 终端 | 线程内嵌终端 |
| 云 / 定时 | Cloud、Scheduled |
| 投料 | 拖文件/图、`@`、语音 |

## 引擎 studio 已开门（【文档】v2）

| 用户动作 | studio |
| --- | --- |
| 列这个文件夹里的旧活 | `session/list` |
| 点开、看见记录 | `session/load` |
| 刷新附着 | `session/resume` |
| 新建 | `session/create` |
| 删除 / 改名 / 归档 | `session/delete` `rename` `archive` |
| 分叉 | `session/fork`（[plan 带 4](plan.md)） |
| 发话 / 停 | `turn/start` `turn/cancel` |
| 换模式、模型、思考档 | `session/setMode`、`config/set` |
| 斜杠目录 | `commands/list` |
| 工具批准 | `permission/*` |
| 用量 / 上下文 | `inspection/usage` `inspection/context` |
| 队列 / 目标 | `queue/*` 带 3；`goal/*` 带 5 |

## 第一期就这些（给带 0 / 带 1）

1. 一个工作区路径，可换。
2. 侧栏列出该目录下的活。
3. 新建一条空活。
4. 点开一条，看见记录，能继续打字。
5. 能删测试垃圾（引擎已有 `session/delete`）。
6. 回合运行中不能偷偷切走还假装成功。
7. 列表失败可见，不伪造历史。

不加进第一期：fork 树、双路同时生成、diff 台、内嵌终端、附件、云、插件市场。
