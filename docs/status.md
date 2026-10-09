# 当前状态（Talos 桌面 / GUI）

更新：2026-10-09。**本页是本仓桌面工作的唯一执行入口。**

## 当前交接卡

| 字段 | 当前值 |
| --- | --- |
| 任务标识 / 修订 | `talos-desktop-studio-band1-close` / r1 |
| 阶段 | **带 1 已闭合**；带 2 未授权 |
| 本轮角色 / 来源 | Luna；主人目视通过活目录 + 删除；阻塞已排除 |
| 目标 / 方案入口 | [plan 实现带](plan.md#实现带) · [带 2 站规](plan.md#带-24同一站规另授权) |
| 允许范围 | 文档收口、本地 commit；**不开带 2 编码**除非主人另说「推进带 2」 |
| 禁止范围 | Talos-CLI 工作树；`window.confirm` 长期留存（见 lessons）；带 2–4 未授权扩项 |
| 验收 / 停止点 | 带 1 完成证据已齐；下一带等主人授权 |
| 完成证据 | 带 1：`31bb5d3`（目录）+ `ae87967`（删除）；`test:core` 32/32；主人 2026-10-09 目视通过 |
| 下一接手 / 就绪性 | **无就绪编码任务**。欠账：删除确认改 `#detailDialog`（本轮可搁置）。带 2 = 审查台/批准记忆，需 Astra 收范围后开卡 |

## 桌面工作线

| 工作线 | 当前事实 |
| --- | --- |
| 带 1 活目录 | list / new / load / delete（ACP 0.1.3+）— **已验收** |
| 带 2 | 审查台与批准记忆 — **未开始** |
| 带 3–4 | 投料、Tauri — **未开始** |

## 已知欠账

- **删除确认 UX**：现用 `window.confirm`（WIP）；产品必须用 `#detailDialog` 同视觉确认 — 见 [lessons 视觉与交互](lessons.md#视觉与交互)，下轮小修或带 2 前换掉。
- 其余见 [parity 对照](desktop-codex-parity.md#对照codex-这样--我们第一期这样)。

## 阅读入口

[desktop-codex-parity.md](desktop-codex-parity.md) · [plan](plan.md) · [adapters/talos-engine.md](adapters/talos-engine.md) · [README](../README.md)
