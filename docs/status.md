# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **待技术复核** |
| 本轮角色 / 来源 | Cursor 力工；修复 Codex 二次复核 G1–G2 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | 同 R1；`fact-store` 重同步/回合边界 + 定向回归 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | 新候选已提交；**停于此，等 Codex 三次复核** |
| 完成证据 | 见「实施交付」；**未**用户验收、**未**真实引擎付费复现 |
| 下一接手 / 就绪性 | Codex：复核候选 `0be98d8` |

## 触发与已确认决定

Codex 二次复核 `78529b9` 不通过（`d581c46` 记账 G1–G2）；用户授权继续同一 R1 修复。

## 产品事实与已知问题

| 项 | 状态 |
| --- | --- |
| 失效候选 | `caae401`、`78529b9` |
| 当前候选 | **`0be98d8`** — G1 重同步代次 + G2 迟到回合流事件 |
| 真实 Studio / 付费 turn | **【未验】** |
| 浏览器目视 | **【未验】** |

## Git 与检查事实

- R1 原始基点：`597a2a1`
- 上轮候选：`78529b9`；二次复核记账：`d581c46`
- **当前产品候选：`0be98d8`**

## 当前候选与实施交付

| 字段 | 当前值 |
| --- | --- |
| 实施基点 | `78529b9` |
| 产品候选提交 | **`0be98d8`** — `fix(desktop): resync generation and late turn stream guards for R1` |
| 相对 78529b9 的改动 | `fact-store.ts`：`pendingHistoryResyncCount` + `liveStreamFactsDuringResync`（替代 revision baseline）；流式事件仅在 `turn.running` 且 turnId 匹配时接受；`turn.started`/`turn.finished` 不受旧 turnId 误拒 |
| G1 回归 | 无新事实时 resync 后应用 NEW 历史；仅 `session.context` 不阻塞；F3 正文 delta 仍阻止陈旧快照（保留） |
| G2 回归 | 回合结束后拒绝同/旧 turnId 的 delta、tool、notice；跨回合完成后拒绝 t1 迟到正文 |
| 既有 F1–F6 | 未回退；`test/message-fidelity-r1.test.ts` 现 **15** 项 |
| 命令、退出码 | `npm run check:all` **0**（`test:core` **125** passed） |
| 引擎运行 | **未运行** |
| 用户入口 | 技术通过后：`npm run dev:product -- --cwd <绝对路径>` → `http://127.0.0.1:5193/`；[plan 用户验收](plan.md#用户验收) |

## Codex 技术复核

**待三次复核。** 请用 `78529b9..0be98d8` 核对 G1–G2 最小反例已关；可跑 `npm exec -- vitest run test/message-fidelity-r1.test.ts` 与 `npm run check:all`。`78529b9` 已失效。

## 用户验收

尚未进行。须 Codex 技术通过后再执行 plan 目视清单。
