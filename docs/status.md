# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **执行中（第三次技术复核退回）** |
| 本轮角色 / 来源 | Codex 技术复核；用户要求复核当前候选 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | 同 R1；`fact-store` 重同步/回合边界 + 定向回归 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | 修复下方 H1–H2，提交新候选并停在待技术复核；本候选不进入用户验收 |
| 完成证据 | 见「实施交付」；**未**用户验收、**未**真实引擎付费复现 |
| 下一接手 / 就绪性 | Cursor：继续同一 R1 的 H1–H2；不得推进 R2 |

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

**2026-10-10：第三次技术复核未通过。** 候选 `0be98d8`；相对 `78529b9` 的产品修改只涉及 `src/core/fact-store.ts` 与 `test/message-fidelity-r1.test.ts`。G1 的“无实时事实可应用历史”和 G2 的“结束后拒绝流片段”已改善；本次定向 `npm exec -- vitest run test/message-fidelity-r1.test.ts` 退出 0（15 tests）。CLI 源码仍为 `d045efc` 且工作树干净。未启动引擎、调用模型或做浏览器验收。

直接装载生产 `FactStore` 的最小回放 `.talos/review-r1-third.cjs`：`node --check` 与 `node` 均退出 0；输出证明以下两项仍违反 R1。脚本在忽略目录，只作诊断观察，不把退出 0 当通过。

| 编号 / 优先级 | 位置 | 输入与实际结果 | 修复与定向复验 |
| --- | --- | --- | --- |
| H1 / P1 | `src/core/fact-store.ts:174` | resync → 实时正文 `live` → 旧历史响应 → 用户重试得到新权威历史 `fresh retry`。代码在 `liveStreamFactsDuringResync` 为 true 时直接 break，未消费/清理该请求；第二次正常历史仍被跳过，记录永久停在 `live` | 每个历史请求有可区分的身份或代次；忽略旧响应时也结束该次 pending，之后重试能应用新历史。补连续两次响应、旧响应乱序与新实时事实交错的生产路径回归 |
| H2 / P1 | `src/core/fact-store.ts:119` | 当前 `t2` 已 `turn.started`，迟到的 `t1 turn.finished` 因生命周期 kind 绕过 turnId 检查，将 `t2` 改为 completed，且 turnId 回退到 `t1` | 生命周期事件也必须核对当前会话和回合身份；旧 finish 不得结束新 turn。补 `t1 finished` 在 `t2 running` 期间到达及重复 terminal 通知的回归 |

上述复现均是合成回放，不是安装版实测。Cursor 只需修 H1–H2，保留当前已通过的正文、布局、generic、思考、斜杠与 G1/G2 其他场景。新候选再由 Codex 复核后才进入用户验收。

## 用户验收

尚未进行。须 Codex 技术通过后再执行 plan 目视清单。
