# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **执行中（集中技术复核退回）** |
| 本轮角色 / 来源 | Codex 技术复核；用户要求复核当前候选 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | 同 R1；按下方 J1–J3 一次修正历史与回合归属 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | 修正 J1–J3 并提交一个候选，再进行技术复核；当前候选不进入用户验收 |
| 完成证据 | 见「实施交付」；`npm run check:all` 0；**未**用户验收、**未**真实引擎付费复现 |
| 下一接手 / 就绪性 | Cursor 执行同一 R1 的 J1–J3；若实现受阻，交 Codex 直接接手该组状态逻辑 |

## 触发与已确认决定

Codex 二次复核 `78529b9` 不通过（G1–G2）；三次 `0be98d8`（H1–H2）；四次 `800a9c8`（I1）；用户授权修复并提交新候选。

## 产品事实与已知问题

| 项 | 状态 |
| --- | --- |
| 失效候选 | `caae401`、`78529b9`、`0be98d8`、`800a9c8` |
| 当前候选 | **`fc82b96` 未通过技术复核**；待 J1–J3 的新候选 |
| 真实 Studio / 付费 turn | **【未验】** |
| 浏览器目视 | **【未验】** |

## Git 与检查事实

- R1 原始基点：`597a2a1`
- **当前产品候选：`fc82b96`**

## 当前候选与实施交付

| 字段 | 当前值 |
| --- | --- |
| 实施基点 | `800a9c8` |
| 产品候选提交 | **`fc82b96`** — `fix(desktop): R1 history request generation for out-of-order hydrates` |
| 相对 800a9c8 的改动 | `historyRequestId` 贯穿 `session.history_resync` → `hydrateSessionHistory` → `session.history`；`FactStore` 用 `maxAppliedHistoryRequestId` + 按请求 live 跳过，拒绝较旧响应覆盖较新记录；保留 H1–H2 与 F/G 行为 |
| I1 回归 | 两 resync 逆序返回（先 NEW 后 OLD）；并行 resync 期间实时 delta + 逆序历史；`TalosStudioAdapter` 双 resync 慢/快 hydrate 路径 |
| 既有 H1–H2、F1–F6、G1–G2 | 保留；`test/message-fidelity-r1.test.ts` 现 **22** 项 |
| 命令、退出码 | `npm run check:all` **0**（`test:core` **132** passed） |
| 引擎运行 | **未运行** |
| 用户入口 | 技术通过后：`npm run dev:product -- --cwd <绝对路径>` → `http://127.0.0.1:5193/`；[plan 用户验收](plan.md#用户验收) |

## Codex 技术复核

**2026-10-10：第四次技术复核未通过。** 候选 `800a9c8`：H1–H2 已修复；并行历史乱序仍覆盖新记录（I1）。定向 `message-fidelity-r1` 19 tests 通过；未启动引擎、未浏览器验收。

| 编号 | 摘要 | 状态 |
| --- | --- | --- |
| H1–H2 | pending 消费、`turn.finished` 守卫 | `800a9c8` 已修 |
| I1 | 双 resync 乱序历史覆盖 NEW | **本候选待复核** |

历史轮次记录（F/G/H）见本文件 Git 历史或归档；I1 定向回放 `.talos/review-r1-fourth.cjs` 在忽略目录。

**2026-10-10：第五次集中技术复核未通过。** 候选 `fc82b96` 修复了“新响应先到、旧响应后到”的 I1 反例。`npm exec -- vitest run test/message-fidelity-r1.test.ts test/session-history.test.ts test/studio-helpers.test.ts` 退出 0（36 tests）。另直接装载生产 `FactStore` 与 `TurnStreamProjector` 做交错事件回放，发现以下三组 R1 合同内的缺口。未启动引擎、调用模型或观察浏览器。

| 编号 / 优先级 | 位置 | 复现与影响 | 同组修复条件 |
| --- | --- | --- | --- |
| J1 / P1 | `src/core/fact-store.ts:148`、`src/adapter/talos-studio.ts:202` | 两次 resync 中，较新请求仍在等待时，较旧响应先返回并将界面从 `CURRENT` 改成 `OLD`；较新响应后来才改成 `NEW`。手动 `retrySessionHistory` 也不登记在途请求：请求后有实时 `before live`，返回的旧 `before` 会覆盖实时文字。历史失败事件没有请求身份，无法按请求清理等待状态 | 所有历史读取（初载、重同步、手动重试）在发起时登记同一类请求身份与当前会话选择代次；响应和失败都带回身份并结束对应请求。当前界面只接收最新适用的历史响应；请求发出后的实时事实不能被过时响应覆盖。覆盖旧先回、新先回、失败、重试、切走再切回同一会话 |
| J2 / P1 | `src/adapter/studio-stream.ts:273` | CLI `messages-replaced` 自带完整 `messages`，桌面却丢掉它只发起 RPC。回放旧记录 `OLD DURABLE` → 完整替换 `NEW DURABLE` → 实时 `LIVE` → 旧 RPC 返回：最终仍是 `OLD DURABLE` 加 `LIVE`，没有权威替换内容 | 按已核实 TUI 语义消费事件自带的完整列表；`messages-rewound` 与 `resync-required` 分别按其契约处理。补完整替换与实时 delta 交错后的最终时间线回归 |
| J3 / P1 | `src/adapter/studio-stream.ts:149,249,264` | 同一会话当前 `t2` 运行时，外层 `t1 turn/event` 的 user message、generic notice、error 被投影成无 `turnId` 的事件，绕过 `FactStore` 回合守卫。回放把旧用户话和旧通知加入 t2 记录，并把连接改为 error | 从 Studio 外层 `turnId` 传递所有 turn/event 投影结果，状态层统一拒绝非当前回合事件；保留当前回合错误的可见报告。补真实 adapter → store 路径的迟到 user/notice/error 与当前 t2 交错回归 |

统一状态规则：以当前会话选择代次和回合 ID 决定事件归属；历史读取再以请求 ID 与开始后的实时变化决定是否替换。完整替换事件按其权威消息列表更新。测试须等待异步响应真正写入状态后再断言；现有 adapter 测试释放慢请求后只等待请求次数，未证明旧响应已经处理。最小回放在忽略目录 `.talos/review-r1-fifth.cjs`，输出记录了 OLD/NEW 顺序、无 turnId 事件、完整替换丢失和手动重试覆盖；不是引擎实测。

本次只退回 J1–J3 这一组消息归属与重建规则，不展开 R2、视觉或引擎。保留当前已有效的分片空白、工具顺序、思考和斜杠修复。下一候选按同一组条件集中复核。

## 用户验收

尚未进行。须 Codex 技术通过后再执行 plan 目视清单。
