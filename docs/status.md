# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **执行中（第四次技术复核退回）** |
| 本轮角色 / 来源 | Codex 技术复核；用户要求复核当前候选 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | 同 R1；`fact-store` 重同步/回合边界 + 定向回归 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | 修复下方 I1 的历史响应乱序，提交新候选并停在待技术复核；当前候选不进入用户验收 |
| 完成证据 | 见「实施交付」；`npm run check:all` 0；**未**用户验收、**未**真实引擎付费复现 |
| 下一接手 / 就绪性 | Cursor：继续同一 R1 的 I1；不得推进 R2 |

## 触发与已确认决定

Codex 二次复核 `78529b9` 不通过（`d581c46` 记账 G1–G2）；三次复核 `0be98d8` 不通过（H1–H2）；用户授权修复并提交新候选。

## 产品事实与已知问题

| 项 | 状态 |
| --- | --- |
| 失效候选 | `caae401`、`78529b9`、`0be98d8` |
| 当前候选 | **`800a9c8`** — H1 pending 消费 + H2 `turn.finished` 身份核对 |
| 真实 Studio / 付费 turn | **【未验】** |
| 浏览器目视 | **【未验】** |

## Git 与检查事实

- R1 原始基点：`597a2a1`
- 上轮候选：`78529b9`；二次复核记账：`d581c46`
- **当前产品候选：`800a9c8`**

## 当前候选与实施交付

| 字段 | 当前值 |
| --- | --- |
| 实施基点 | `0be98d8` |
| 产品候选提交 | **`800a9c8`** — `fix(desktop): R1 resync pending consume and turn.finished guard` |
| 相对 0be98d8 的改动 | `fact-store.ts`：跳过陈旧历史时仍递减 `pendingHistoryResyncCount`，重试可应用新历史；`turn.finished` 须匹配当前 `turnId` 且 `status === running`（旧回合 finish 不得结束新回合） |
| H1 回归 | 实时事实导致跳过旧快照后，下一次 resync+历史应用 `fresh retry`；该顺序有效，但并行请求乱序仍会覆盖新历史，见 I1 |
| H2 回归 | `t2` 运行中拒绝 `t1 turn.finished`；同一回合重复 terminal finish 不二次改写 |
| 既有 F1–F6、G1–G2 | 保留；`test/message-fidelity-r1.test.ts` 现 **19** 项 |
| 命令、退出码 | `npm run check:all` **0**（`test:core` **129** passed） |
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

**H1–H2 修复已提交新候选（见上表 SHA）。** 待第四次技术复核；未启动引擎、未浏览器验收。

**2026-10-10：第四次技术复核未通过。** 候选 `800a9c8`：H1 单个请求的跳过与后续重试已修复，H2 旧 `turn.finished` 的身份检查已修复。本次 `npm exec -- vitest run test/message-fidelity-r1.test.ts` 退出 0（19 tests）。CLI 源码仍为 `d045efc`，工作树干净；未启动引擎、调用模型或做浏览器验收。

| 编号 / 优先级 | 位置 | 可复现输入与实际结果 | 修复与复验 |
| --- | --- | --- | --- |
| I1 / P1 | `src/core/fact-store.ts:178`、`src/adapter/talos-studio.ts:640` | 同一会话连续发起两个 `session.history_resync`，第 2 个历史请求先返回 `NEW`，第 1 个随后返回 `OLD`。`pendingHistoryResyncCount` 只计数、不标识请求；生产 `FactStore` 最终将 `OLD` 覆盖 `NEW` | 给每次历史读取分配身份/递增代次并随响应传到状态层；只允许最新适用响应替换记录。保留现有“实时事实到达则保护新文字”规则，补两请求逆序返回和期间实时增量的生产路径回归 |

定向回放 `.talos/review-r1-fourth.cjs` 在忽略目录；`node --check` 与 `node` 退出 0，观察值为先 `NEW` 后 `OLD`。这是 R1 已约定的“多个历史响应乱序”场景。Cursor 只需修 I1，保留 H1–H2 与此前有效修复；新候选再由 Codex 复核。

## 用户验收

尚未进行。须 Codex 技术通过后再执行 plan 目视清单。
