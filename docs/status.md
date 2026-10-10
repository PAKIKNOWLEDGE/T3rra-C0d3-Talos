# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **执行中（技术复核二次退回，待 Cursor 修复）** |
| 本轮角色 / 来源 | Codex 技术复核；用户要求复核当前候选 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | 同 R1；本轮针对复核表 F1–F6 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | 修复下方 G1–G2，完成定向复验后提交新候选并停在待技术复核；本候选不进入用户验收 |
| 完成证据 | 见「实施交付」；**未**用户验收、**未**真实引擎付费复现 |
| 下一接手 / 就绪性 | Cursor：继续同一 R1 的 G1–G2；不得推进 R2 或改 CLI/视觉 |

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
| 候选之后的改动 | `117d1ff` 为本页实施交付记账；本次复核也只更新本页 |
| 实际修改 | `studio-message-layout.ts` 统一 parts 布局；`assistant.layout` / `thought.replace`；FactStore 会话+回合归属、工具分段 delta、resync 期间丢弃陈旧 history、slash 单次写入；stream 传 `turnId`、generic 白名单；talos-studio 发出 resync 事件 |
| F1–F6 定向回归 | F1：`message-fidelity-r1` 实时/历史 parts 对照 + tool 间 delta；F2：`TalosService` 外会话/旧 turnId；F3：resync 后 stale history 不覆盖 NEW TEXT；F4：thinking 空格；F5：`internal.new` 无 notice；F6：`slash.completed` messages/timeline 一致 |
| A1–A6 | 同上文件覆盖 A1–A6 合成路径（**非引擎实测**）；CLI 依据 **d045efc** |
| 命令、退出码 | `npm run typecheck` 0；`npm run test:core` **121** passed；`npm run check:all` 0 |
| 引擎运行 | **未运行** |
| 用户入口 | 技术通过后：`npm run dev:product -- --cwd <绝对路径>` → `http://127.0.0.1:5193/`；按 [plan 用户验收](plan.md#用户验收) 五步（须自备 provider） |

## Codex 技术复核

**2026-10-10：二次技术不通过，退回同一 R1。** 候选 `78529b9` 已修复上次 F1–F6 中的实时布局、思考替换、generic 白名单与斜杠重复写入；定向 `npm exec -- vitest run test/message-fidelity-r1.test.ts` 退出 0（11 tests）。未启动引擎、未调用模型、未做浏览器验收。

复核生产模块的最小回放：`.talos/review-r1-second.cjs`，`node --check` 与 `node` 均退出 0。回放直接调用 `FactStore`，验证重同步和迟到回合边界。

### 二次复核退回项

| 编号 / 优先级 | 位置 | 可复现输入与实际失败 | 修复与复验要求 |
| --- | --- | --- | --- |
| G1 / P1 | `src/core/fact-store.ts:139` | `session.history_resync` 建立 baseline 后，`session.history` 自身也会让 revision 增加；即使期间没有任何新事件，返回的新历史也因 `revision > baseline` 被丢弃。回放保留旧 `OLD`，没有应用新 `NEW` 历史 | 用明确的 resync 请求代次或“期间确有新事实”标记区分；无新事件时必须应用返回历史，有新实时事实时防止旧快照覆盖。补无事件、仅辅助事件、正文 delta 三种回归 |
| G2 / P1 | `src/core/fact-store.ts:90` | 旧 `turnId=t1` 的正文在当前 `turn=t2` 已结束后仍被 `shouldApply` 接受；回放 `staleApplied=true`，旧正文进入当前 messages。当前检查只在 `turn.status === running` 时比较 turnId | 只接受当前会话的当前 turn，或为已结束 turn 保留可核实的结束代次；迟到旧回合在 running、completed、cancelled、failed 状态都应丢弃。补回合完成后迟到 delta/message/tool/notice 的回归 |

上次 F1–F6 的有效修复保留。本次退回只针对 G1–G2，完成后再复核；`78529b9` 不进入用户验收。

## 用户验收

尚未进行。须 Codex 技术通过后再执行 plan 目视清单。
