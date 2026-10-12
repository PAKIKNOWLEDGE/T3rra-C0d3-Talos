# 当前状态 — Talos Desktop

更新：2026-10-12。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-operation-feedback / r2-b |
| 阶段 | **待技术复核（R2-B 第二候选）** |
| 本轮角色 / 来源 | Luna 执行；用户授权 R2-B |
| 目标 / 方案入口 | [R2-B 基本操作结果可信](plan.md#下一小轮r2-b-基本操作结果可信) |
| 允许范围 | 动作结果关联、打开/继续/停止/审批消费者与聚焦测试 |
| 禁止范围 | CLI 写入、视觉、协议/状态所有权改变、Tauri、R2-B 外扩 |
| 验收 / 停止点 | Cursor 修本轮退回项并交新候选；不推进 R3 |
| 完成证据 | 见「当前实施交付与复核」 |
| 下一接手 / 就绪性 | Codex 技术复核候选 **`7e2b885`**；交付 fail **1 / 2**；再退回则 Codex 接手实现 |

## 本轮授权与候选

- 规划提交：`edb3fc8`；产品基线：`bf0bf2d`；执行前 HEAD：`edb3fc8`（干净）。
- 已退回候选：**`41e7cb2`**（B1：审批 RPC 失败误报连接 error）。
- 当前产品候选：**`7e2b885`**（在 `41e7cb2` 上修 B1 + 消费者等待上下文 + 聚焦测试）。
- 下一写入者 Codex；同一任务计数保持 **1 / 2**。

## 当前实施交付与复核

| 字段 | 当前值 |
| --- | --- |
| 产品候选 / 改动清单 | **`7e2b885`** — B1：`talos-studio.replyApproval` 去掉 emit `error` 的 catch，失败仅 Promise 拒绝；`pending-operations` 增加 `OperationWaitContext` 与按 operation 清理/去重 helper；`talos.js` 停止/审批绑定 operationId+sessionId+connectionToken，socket 回调核对实例；保留 `41e7cb2` 的 WS `action_error`/`sendActionWithResult` 基线 |
| B1 修复证据 | `test/operation-feedback.test.ts`「TalosStudioAdapter.replyApproval…」：真实 adapter+FactStore+RPC 边界；首次拒绝 → connected、pending、无 error 事件；重试 → 一次 settled；过期 → 无第三次 RPC。WS 路径「reply_approval over websocket…」：真实 adapter 经 service，`action_error` 带 `op-approval-ws`，连接仍 connected |
| 消费者等待上下文证据 | helper 单测：审批双注册仅一次、stale finally 不清新 flight、跨 session/token 不 current。`talos.js` 调用 `tryRegisterApprovalFlight`/`clearApprovalFlightIfCurrent`/`createOperationWaitContext`/`isOperationWaitContextCurrent`/`clearStopFlightIfCurrent`；`connect` 递增 `connectionToken`，旧 socket close/message 忽略 |
| 停止 / 回合分离 | `cancel accepted does not end the running turn`：`dispatch` 返回 accepted 后 `turn.status` 仍为 `running` |
| 打开 / 继续 / 断连 / load | 保留 WS `operationId`、load 回滚、`rejectAllPendingOperations`（`41e7cb2`）；`session-directory` 未改 |
| 检查命令与结果 / 限制 | 【实测】`npm run check:all` **0**（`test:core` **147**）；未启动真实 Talos CLI、未浏览器目视 |
| Codex 技术复核 | **待复核**（`7e2b885`） |
| 候选退回记录 | 第 1 次：`41e7cb2`（B1）；fail **1 / 2** |

## Codex 技术复核与退回项

2026-10-12：**候选 `41e7cb2` 退回，交付 fail 1 / 2。** 复核开始时 HEAD 为 `cef7f49`（候选后仅文档记录），工作树干净。本轮不推进 R3，也不修改产品代码。

### B1：审批动作失败不能伪造连接故障

- 位置：`src/adapter/talos-studio.ts:512` 审批 RPC catch 发出 `kind: error`；`src/core/fact-store.ts:410` 将 connection.status 改成 error；`app/talos.js:1118` 等消费者以 connected 判断是否在线。
- 【实测】使用实际 `TalosStudioAdapter.prototype.replyApproval` 和 `FactStore`，仅在 RPC 边界注入拒绝；起始 connection 为 connected、审批为 pending。拒绝后实际结果为 **connection=error、approval=pending**，错误文案为 permission RPC rejected。没有启动 CLI、浏览器或模型。
- 影响：普通审批请求失败被表示为整个连接故障，界面出现未连接/会话不可操作状态；保留卡片并不等于失败可恢复。违反 plan 的失败恢复与状态所有权约束。
- 修复：审批 RPC 拒绝由对应动作 Promise → WS action_error 反馈，保留连接、会话、回合和待审批事实；不要为了一个局部错误修改全局通用 error 语义。真实断连仍走既有断连路径。失败后允许对同一待审批发起新操作重试。
- 完成证据：测试经过实际 Studio adapter 的审批方法和生产状态路径，证明拒绝时连接仍 connected、审批仍 pending、动作错误保留原 operationId；随后重试成功只 settled 一次，过期请求不假成功。

### 相关交付证据补齐

【源码】`test/operation-feedback.test.ts:85` 的审批拒绝测试只让 EnginePort stub 抛错，绕过实际 adapter 的 error 发射，因此全套通过不能排除 B1。补上述生产路径回归；同时按原合同完成仍欠的前端重复点击、迟到结果/跨会话保护、停止受理与终态分离证据，测试须调用实际消费者或其生产 helper，不复制判定逻辑。只补本轮必需项，不另开框架或扩大任务。

【文档】Cursor 记录 check:all 0 / test:core 142，Codex 未重跑全套；该结果与本次实际复现并存，不能据此写整体通过。【实测】`git diff --check edb3fc8 HEAD` 退出 0。【未验】本轮无可见浏览器/真实引擎证据。

### Cursor 实施记录（第二候选 `7e2b885`）

2026-10-12：按下方指导完成 B1 与消费者上下文；产品提交 `7e2b885`。受影响：`src/adapter/talos-studio.ts`、`src/client/pending-operations.ts`、`app/talos.js`、`test/operation-feedback.test.ts`。停在待技术复核。

### Cursor 本次修复指导（同一任务，fail 仍为 1 / 2）— 已执行

按以下顺序做，不自行扩大方案。先保留 `41e7cb2`，读取当前工作树；若已有修复先检查并保存，不覆盖现场。

1. **先修 B1 的责任层。** `TalosStudioAdapter.replyApproval` 保留 meta/session 检查，直接 `await rpc.request('permission/reply', 原参数)`；删除本方法中“emit 通用 error 再 throw”的 catch。await 失败自然拒绝，后面的 meta 删除和 approval.settled 不会执行。runtime 已 await adapter，service 已 await engine，WS 已封装带 ID 的 action_error，这三层继续复用。不要修改 FactStore 的全局 error 分支，不 catch 后返回成功，也不要在 finally 删除审批 meta。
2. **用实际 adapter 补证。** 复用现有 Studio 测试的 adapter/RPC 构造方式，仅替换 RPC 边界；sink 接真实 FactStore。先令 permission/reply 拒绝，再令第二次成功。断言第一次错误沿 Promise 返回、连接仍 connected、session/turn 未被改写、审批仍 pending；第二次才删除 meta 并发一次 settled；第三次过期请求拒绝且不再调用 RPC。另经生产 service/WS 证明错误 ID 对应原动作。禁止用 EnginePort stub 直接抛错来替代这一条 adapter 测试。
3. **核对消费者等待上下文。** 审批和停止 await 前保存 operationId、会话 ID 与连接实例；提示或清理前核对它们仍属于当前上下文。审批待决记录不能只有 requestId 的 Set：必须能区分该次 operation，旧 finally 只能清自己的记录。旧请求跨会话/重连完成不得提示新会话已提交或删除新请求的防重复标记。socket 回调也要核对捕获的 socket 仍是当前实例，避免旧连接 close/message 清理或覆盖新连接。只保留等待元数据，不新增引擎状态机。
4. **最小生产 helper 验证。** 若上述消费者逻辑无法直接离线测试，就在已有 `src/client/pending-operations.ts` 局部扩展用于请求关联、上下文判定和按 operation 清理的纯逻辑，并让实际 talos.js 调用；无需新框架或伪 DOM。验证：同一待决审批/停止两次点击只发送一次；失败后可重试；旧结果跨会话不作用于新控件；断连清理后重连的新请求不被旧 finally 清除；停止 accepted 不改变回合终态，只有权威终态事件结束回合。测试调用真实 helper，不在测试另写一套判断。
5. **保留并交付。** 打开失败回滚与继续发送的会话归属复用既有测试，有缺证才补。先跑相关检查，保存候选前跑适用 check:all；status 逐项填 B1 与消费者场景证据，不写一句“全绿”替代。检查失败在任务内自行修，完成后本地提交并停写，等 Codex 复核。

这份指导是对原 R2-B 合同的具体化，不增加任务、不重置计数。普通实现细节可自行处理；若与现有契约冲突，保存并报准确冲突，不改完成条件。第二次候选退回后由 Codex 接手。

### 用户验收入口（新候选技术通过后）

`npm run dev:product -- --cwd <工作区绝对路径>` → `http://127.0.0.1:5193/`

1. 打开会话 → 切走/再开：失败应 toast 错误且 session 不回滚错误（已有 load 回滚由服务层保证）。
2. 继续发送：断网后操作不应永久 pending（断连清理）。
3. 运行中点停止：仅受理成功显示「已请求停止」；发送失败显示错误；重复点击不叠请求。
4. 审批（若有）：RPC/过期失败不显示「已提交」；卡片保持待审批。

## 保留的产品事实

| 项 | 状态 |
| --- | --- |
| R2-A | 技术通过（`bf0bf2d`） |
| K1 / K2 | 用户 PASS |
| R1 整体操作 | 部分待用户补验（plan 保留项） |

## 上轮实施交付（R2-A）

见 Git `7239422:docs/status.md` 与候选 `bf0bf2d`。
