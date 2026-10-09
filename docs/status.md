# 当前状态（Talos 桌面 / GUI）

更新：2026-10-09。**本页是本仓桌面工作的唯一执行入口。**

## 当前交接卡

| 字段 | 当前值 |
| --- | --- |
| 任务标识 / 修订 | `talos-desktop-studio-nav` / r1 |
| 阶段 | **桌面功能线暂停**（带 1 列/开/新建已过；缺退役） |
| 本轮角色 / 来源 | 主人要梳理漏项与两仓维护线；本轮只写清，不改 CLI、不加删除 UI |
| 目标 / 方案入口 | [plan 两仓串行与漏项门禁](plan.md#两仓串行与漏项门禁) |
| 允许范围 | 本仓 `docs/status.md`、`docs/plan.md` |
| 禁止范围 | 改 Talos-CLI；桌面假删除；带 2–4；与 CLI **并行**同一能力 |
| 验收 / 停止点 | 两问已答并写入 plan；主人若要删会话，下一张卡在 **Talos-CLI** 按 CLI 迭代流，不在本仓接着写 |
| 完成证据 | 带 1 目视通过。CLI 未改。删除 = CLI ACP 开门后桌面再接 |
| 下一接手 / 就绪性 | **无就绪桌面任务**。删除需求已写入 `C:\DEV\develop\Talos-CLI\docs\status.md` 交接卡 `acp-session-delete` r0（排队未开工）。本仓等 **已发布** `talos` 再接线 |

## 桌面工作线

| 工作线 | 当前事实 |
| --- | --- |
| 第一期 | 活目录：list / 新建 / load 切换；跑时禁止换活 |
| 对标 | Codex 列表；不做并行与审查台 |

## 已知欠账

- **删会话**：桌面侧栏能列出、新建、点开，**不能删**。原因在 ACP：引擎广告 `list/fork/resume/close`，没有 `session/delete`。`close` 只松开附着，历史仍在。不是双仓事故，CLI **未改**。
- 其余见 [parity 对照](desktop-codex-parity.md#对照codex-这样--我们第一期这样)。

## 阅读入口

[desktop-codex-parity.md](desktop-codex-parity.md) · [plan](plan.md) · [README](../README.md)
