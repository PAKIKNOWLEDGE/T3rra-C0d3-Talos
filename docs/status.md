# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **待技术复核** |
| 本轮角色 / 来源 | Cursor 力工执行；用户授权 R1 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | studio-stream、session-history、fact-store、types、talos-studio 重载接线、契约测试 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | 本地提交 + status 实施交付；**停于此，等 Codex 复核** |
| 完成证据 | 见下方「实施交付」；**未**用户验收、**未**真实引擎付费复现 |
| 下一接手 / 就绪性 | Codex：用户说「复核当前候选」；用户验收在技术通过后 |

## 触发与已确认决定

用户授权执行 R1，修复正文粘连与 ENGINE JSON 等已报问题；协作方式见 [workflow](workflow.md)。

## 产品事实与已知问题

| 项 | 状态与证据层级 |
| --- | --- |
| 视觉 / 引擎 | 用户此前表示满意；本轮未改、未重验 |
| R1 消费语义 | 【源码+合成】A1–A6 经生产投影 + FactStore；见实施交付 |
| 正文粘连 | 【合成】空格 delta 与 notice 交错已加回归；【**未验**】真实 MiMo/Studio 付费 turn |
| ENGINE JSON | 【源码】query_collapse_view 已抑制；【未验】其余 generic 是否仍吵 |
| 产品总验收 | **无**；mock/check:all 绿 ≠ 通过 |

## Git 与检查事实

- 实施基点（开始前 HEAD）：`597a2a1`
- 产品 WIP 恢复点（历史）：`94c02ec`
- 本轮产品候选：提交后见实施交付表（`git rev-parse HEAD`）

## 当前候选与实施交付

| 字段 | 当前值 |
| --- | --- |
| 实施基点 | `597a2a1` |
| 产品候选提交 | *提交后填写 SHA* |
| 候选之后的改动 | 无（候选含接驳证据表更新；status 另提交或同提交仅文档—见提交说明） |
| 实际修改与范围调整 | 新增 `studio-message-text.ts`；delta 不再 trimStart；`assistant.replace` 完整帧；FactStore 按 messageId 合并、去掉正文去重；历史 parts 顺序含 tool；`query_collapse_view` 不展示；`resync-*` 触发 `session/messages` 重载；`error.message` 字段；测试 `message-fidelity-r1.test.ts` |
| A1–A6 技术证据 | A1✓ A2✓ A3✓ A4✓ A5✓ A6✓（`test/message-fidelity-r1.test.ts` + 相关回归；CLI 依据 SHA **d045efc**；**合成**，非引擎实测） |
| 命令、退出码与限制 | `npm run typecheck` 0；`npm run test:core` 116 passed；`npm run check:all` 0；【未运行】`dev:product`、真实模型、浏览器目视 |
| 引擎运行路径/版本 | 未运行；契约只读 **d045efc** |
| 用户启动与操作 | 复核通过后按 [plan 用户验收](plan.md#用户验收) 与 README `dev:product`；工作区与 provider 由用户自备 |

## Codex 技术复核

**待复核。** 候选 SHA 见上表。请核对：生产路径无第二套拼接规则；A1–A6 测试走 `TurnStreamProjector` + `FactStore` / `mapStudioHistoryMessages`；diff 未越权改 CLI/视觉。

## 用户验收

尚未进行。技术复核通过后再按 plan 五步操作。
