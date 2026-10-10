# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **待技术复核** |
| 本轮角色 / 来源 | Cursor 力工；修复 Codex 对 caae401 的 F1–F6 退回 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | 同 R1；本轮针对复核表 F1–F6 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | 新候选已提交；**停于此，等 Codex 二次复核** |
| 完成证据 | 见「实施交付」；**未**用户验收、**未**真实引擎付费复现 |
| 下一接手 / 就绪性 | Codex：复核候选 `78529b9`；用户验收须等技术通过 |

## 触发与已确认决定

Codex 复核 caae401 不通过（e03b1f8 记账）；用户要求继续同一 R1 修 F1–F6。

## 产品事实与已知问题

| 项 | 状态 |
| --- | --- |
| 失效候选 | `caae401`（保留对照，不进入用户验收） |
| 当前候选 | `78529b9` — 针对 F1–F6 的修复与回归 |
| 真实 Studio / 付费 turn | **【未验】** |
| 浏览器目视 | **【未验】** |

## Git 与检查事实

- R1 原始基点：`597a2a1`
- 上一候选：`caae401`；复核记账：`e03b1f8`
- **当前产品候选：`78529b9`**

## 当前候选与实施交付

| 字段 | 当前值 |
| --- | --- |
| 实施基点 | `caae401`（相对 `597a2a1` 的首轮 R1 候选） |
| 产品候选提交 | **`78529b9`** — `fix(desktop): close R1 fidelity review defects F1-F6` |
| 候选之后的改动 | 仅本页 status 记账提交（若有） |
| 实际修改 | `studio-message-layout.ts` 统一 parts 布局；`assistant.layout` / `thought.replace`；FactStore 会话+回合归属、工具分段 delta、resync 期间丢弃陈旧 history、slash 单次写入；stream 传 `turnId`、generic 白名单；talos-studio 发出 resync 事件 |
| F1–F6 定向回归 | F1：`message-fidelity-r1` 实时/历史 parts 对照 + tool 间 delta；F2：`TalosService` 外会话/旧 turnId；F3：resync 后 stale history 不覆盖 NEW TEXT；F4：thinking 空格；F5：`internal.new` 无 notice；F6：`slash.completed` messages/timeline 一致 |
| A1–A6 | 同上文件覆盖 A1–A6 合成路径（**非引擎实测**）；CLI 依据 **d045efc** |
| 命令、退出码 | `npm run typecheck` 0；`npm run test:core` **121** passed；`npm run check:all` 0 |
| 引擎运行 | **未运行** |
| 用户入口 | 技术通过后：`npm run dev:product -- --cwd <绝对路径>` → `http://127.0.0.1:5193/`；按 [plan 用户验收](plan.md#用户验收) 五步（须自备 provider） |

## Codex 技术复核

**待二次复核。** 请对照 F1–F6 表验证 `78529b9` 已关闭最小反例；可复用 `test/message-fidelity-r1.test.ts` 与 `npm run check:all`。`caae401` 已失效。

## 用户验收

尚未进行。须 Codex 技术通过后再执行 plan 目视清单。
