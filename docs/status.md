# 当前状态 — Talos Desktop

更新：2026-10-12。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-startup-surface / v1 |
| 阶段 | **待技术复核** |
| 本轮角色 / 来源 | 用户已确认 8e52c77 预览非常满意，明确交 Cursor 接入；Codex 已规划 |
| 目标 / 方案入口 | [V1 开屏与空态产品接入](plan.md#下一小轮v1-开屏与空态产品接入) |
| 允许范围 | app 开屏/空态局部接线、生产显示 helper 与相关测试；必要时最小历史加载显示标记 |
| 禁止范围 | 改已确认视觉、CLI/协议/状态所有权、demo、依赖框架、V2/V3/Tauri 实现 |
| 验收 / 停止点 | 连接/真实状态不受开屏影响，离线自验、本地提交后待 Codex 复核 |
| 完成证据 | 见「V1 实施交付」 |
| 下一接手 / 就绪性 | Codex 技术复核 V1 候选；fail **0 / 2** |

## 当前候选与交付

- 产品基线：已通过 `e091aca`；视觉正本：已通过预览 `8e52c77`。规划前恢复点 `8e52c77`，执行者以实际 HEAD 核对文档之后产品未变。
- 当前产品候选：**`b0e38cb`**；基点 `e091aca`，规划 `04f0173`。
- V1 交付 fail：**0 / 2**；Cursor 已停写。

## V1 实施交付

| 字段 | 当前值 |
| --- | --- |
| 产品候选 / 改动 | 开屏 `#startupSplash` + `product-splash.css`（8e52c77 节奏）；`taskInvite` 邀请面；`src/view/startup-surface.ts`；`FactStore.snapshot` 派生 `historyLoading`；`talos.js` 接线（connect 并行、不重置快照）；manifest/测试 |
| 开屏生命周期 | 每页载入一次（内存 `createSplashController`）；约 2.2s / 跳过 / reduced-motion 同一 `endStartupSplash`；不重播于切会话或 WS 重连；无重播按钮 |
| 空态优先级 | `shouldShowTaskInvite` + `hasRecordBody`：事件页、断连、无 sessionId、加载中、historyLoading/失败、运行、消息/工具、审批、问卷、errors 均优先于邀请面 |
| 焦点 | 开屏期间工作台 `pointer-events: none`；结束后仅邀请面且输入可用时 focus `#prompt` |
| 检查 | 【实测】`npm run check:all` **0**（`test:core` **157**）；`test/startup-surface.test.ts` + vite 链含 `startup-surface` |
| 限制 | 【未验】浏览器开屏动效与集成画面；未启动真实 CLI/模型 |
| Codex 技术复核 | **待复核** |
| 退回记录 | 无；fail **0 / 2** |

### 用户验收入口（V1 候选）

[README 启动浏览器产品](../README.md#启动浏览器产品)：`npm run dev:product -- --cwd <工作区绝对路径>` → `http://127.0.0.1:5193/`

1. 刷新 → 开屏一次，跳过或结束后看到当时真实页面；底栏连接照常进行。
2. 新建空会话 → 邀请面；打开有记录的会话 → 原 timeline 正常。
3. 发一条简短指令 → 进入记录流，不重播开屏/工作台进场。
4. 切会话、减少动态（系统设置）→ 不重播开屏；加载中/错误/审批不被邀请面盖住。

## 已确认的预览与产品基线

- 【用户实测】此前明确反馈「可以，本轮过」，R2-B 候选 `e091aca` 收口。本次反馈「可以，我非常满意」，确认预览 `8e52c77` 并授权准备 Cursor 生产接入。没有单独反馈的真实审批场景仍不补写通过。
- 【源码】仅迭代预览开屏：浅灰点阵底、黄色斜切面、深色徽标与加大字标、低对比大字底纹、小尺寸识别条；保留约 2.2 秒和跳过/重播/reduced-motion。未更改空任务层、产品壳与引擎。
- 【参考】用户指定 `C:/DEV/develop/tmp/Manuel-ref-image/endfield`；概览目录内 13 张图，详细查看 END1.jpg；只借鉴色面/几何/构图，未复制图片或游戏品牌到产品。
- 【未验】按用户要求不跑浏览器/服务；不把源码检查作为动画观感验收。此前暗底预览可从 Git `4b751d7:preview/empty-landing` 恢复。

## 上轮 R2-B 授权与候选

- 规划提交：`edb3fc8`；产品基线：`bf0bf2d`；执行前 HEAD：`edb3fc8`（干净）。
- 已退回候选：**`41e7cb2`**（B1：审批 RPC 失败误报连接 error）。
- 第二次退回候选：**`7e2b885`**（B1 已修；B2 后为 `029a863`）。Codex 本次从 `029a863` 修复 B3，候选为 **`e091aca`**。
- 当前无人写入，产品候选冻结为 **`e091aca`**；Cursor 停写，同一任务计数 **2 / 2**。后续本任务直接回归仍由 Codex 修。

## 上轮已通过候选：`e091aca`

- 【源码】`src/adapter/talos-studio.ts` 使用 `randomUUID()` 生成跨实例唯一 turn ID；启动拒绝时只结束本次 turn、清理 waiter/active 映射并发 `turn.finished(error)`，不再发全局 `error`。
- 【源码】`app/talos.js` 的直接 prompt、slash、queue/steer 提交统一等待 `action_result`；只有受理后才记录成功和清空草稿，若用户已编辑新草稿则保留。
- 【实测】`test/operation-feedback.test.ts` 15 项通过，覆盖两个 adapter 实例 ID 不重复、turn/start 冲突经 WS 返回原 operationId、连接保持 connected、会话回到 ready、失败不写入全局 errors、审批失败与迟到结果保护。
- 【实测】`npm run check:all` 退出 0：30 个测试文件、153 项通过；typecheck、demo、handoff 均通过。没有启动真实 CLI、浏览器或付费模型。
- 【限制】本次用户已确认 R2-B 本轮通过；真实审批单独场景未反馈，不假称已验。产品候选保留，进入 V0 预览；V1 尚未实施。

## 用户验收失败：B3 新会话首次发送入口冲突

2026-10-12 用户截图：新建会话首次输入后主列为「当前会话尚无消息」与 `Turn ingress conflicts`，底栏变成未连接。本次用户要求先排查，Codex 仅查源码、安装入口和只读数据库，未改产品代码、未发模型请求。`029a863` 不再作为已可继续收口的候选；影响新建/继续发送及失败后的连接显示，已通过视觉不因此重做。

### 已定位机制与现场证据

- 【源码】`src/adapter/talos-studio.ts:52,439` 从零计数，每个 adapter 生命周期依次向 turn/start 提交 `local-turn-1` 等回合 ID，跨重启会重复。CLI `studio/server.ts:473` 原样采用客户端 ID；`local-runtime-v2/src/infra/db/schema/turn.ts` 的 turn_id 为持久化全局主键；`turn.repository.ts:1115,1138` 先按 turn_id 查旧记录，session 或输入摘要不一致即 ingress-conflict。CLI 源码 SHA `d045efc92408fd444487098da9a7c04318365882`，只读。
- 【实测】用桌面实际 inspectEnvironment 解析本机入口：`C:/Users/pachu77/AppData/Roaming/npm/talos.cmd` → 安装包 `@pakiknowledge/tal0s-code/cli.js`，包版本 `0.1.4`；安装 chunk `chunk-TOPVGFWW.js` 含同一冲突文案与 turn_id TEXT PRIMARY KEY 的存储结构。未启动 Studio。
- 【实测】按 CLI 默认数据目录契约，只读打开 `C:/Users/pachu77/.talos/v2/sqlite/runtime-state.sqlite`（mode=ro），只查指定 ID 与状态：`local-turn-1/2/3` 均有 completed 记录。未读或输出 sessionId、正文、凭据；未删除/修改数据库。未截取本次失败的实际请求帧，因此不冒充抓包确认具体失败 turnId；源码的 ID 重用与当前默认库冲突条件已证实。
- 【源码】`sendPrompt` 在失败后再次发出通用 error（459），FactStore 将 connection.status 改成 error，解释截图底栏未连接。首次发送的前端提交函数也在结果确认前清空输入。与审批 B1 同属局部请求失败不能伪造连接故障的约束，本轮既有测试没有覆盖 adapter 重启后命中持久化 ID。

### 后续修复边界（本次未执行）

1. 在桌面 adapter 分配跨实例/重启唯一的回合 ID；可复用已有 randomUUID。每个逻辑发送只生成一次，实时事件、waiter 和服务器确认仍关联该 ID，不在 token/event 上反复生成。无需修改 CLI、删除库或反复新建会话。
2. 失败区分启动拒绝与已接收回合终态，正确清理本次 waiter/活动映射；请求失败通过动作结果返回，保留正常连接与其他会话事实。避免单纯去掉 catch 后遗留运行中或未消费的 waiter 拒绝。
3. 发送失败提供重试所需输入，不能为恢复旧文本覆盖用户正在编辑的新草稿；沿用本轮上下文保护。
4. 离线回归经过实际 adapter：跨两个新实例发送 ID 不重复；旧持久化回合 ID 的模拟准入不会误拒新回合；启动拒绝/完成失败后连接与等待状态可恢复，随后可继续发送。mock 只替代 RPC/持久化外部边界，不用付费真实请求补例行证明。

这是 R2-B 已授权操作范围内的用户验收失败，后续由 Codex 修，同一任务不交 Cursor 第三次。开屏/文案/视觉与 Tauri 计划保留，先修本故障。

## 上轮实施交付与复核

| 字段 | 当前值 |
| --- | --- |
| 产品候选 / 改动清单 | **`e091aca`** — 回合 ID 改为 `desktop-turn-${randomUUID()}` 跨 adapter 重启唯一；发送拒绝清理活动回合/等待并发 `turn.finished(error)`，不再发通用连接 error；直接提交、斜杠、排队/插入等待动作结果后再清草稿，用户编辑中的新草稿不被覆盖；补跨实例、WS 与失败恢复回归 |
| B1 修复证据 | `test/operation-feedback.test.ts`「TalosStudioAdapter.replyApproval…」：真实 adapter+FactStore+RPC 边界；首次拒绝 → connected、pending、无 error 事件；重试 → 一次 settled；过期 → 无第三次 RPC。WS 路径「reply_approval over websocket…」：真实 adapter 经 service，`action_error` 带 `op-approval-ws`，连接仍 connected |
| 消费者等待上下文证据 | helper 单测：审批双注册仅一次、stale finally 不清新 flight、跨 session/token 不 current。`talos.js` 调用 `tryRegisterApprovalFlight`/`clearApprovalFlightIfCurrent`/`createOperationWaitContext`/`isOperationWaitContextCurrent`/`clearStopFlightIfCurrent`；`connect` 递增 `connectionToken`，旧 socket close/message 忽略 |
| 停止 / 回合分离 | `cancel accepted does not end the running turn`：`dispatch` 返回 accepted 后 `turn.status` 仍为 `running` |
| 打开 / 继续 / 断连 / load | 保留 WS `operationId`、load 回滚、`rejectAllPendingOperations`（`41e7cb2`）；`session-directory` 未改 |
| 检查命令与结果 / 限制 | 【实测】`npm run check:all` **0**（`test:core` **153**）；未启动真实 Talos CLI、未浏览器目视；`git diff --check` 通过 |
| Codex 技术复核 | **B3 已由 Codex 修复并自验通过**；用户本次确认通过 |
| 候选退回记录 | 第 1 次 `41e7cb2`（B1）；第 2 次 `7e2b885`（B2）；fail **2 / 2** |

## 第二候选复核与 Codex 接手

2026-10-12：`7e2b885` 中 B1 已修，实际 adapter 的拒绝/重试与 WS 测试覆盖生产路径；全局连接错误处理未改。但本候选仍有 **B2：通用 action_error 分支绕过消费者上下文保护**，记第二次交付 fail，Codex 直接接手，不要求用户重复授权。

【源码】`app/talos.js` 的 action_error 在 pending.reject 之后仍无条件 notice 并启用 workspaceSwitchForm 提交按钮。旧会话审批的拒绝即便被 await 消费者按会话过滤，通用分支仍会显示它并影响当前工作区控件；违反 plan 的迟到结果保护。

接手修复只改 `app/talos.js`、`src/client/pending-operations.ts` 与现有回归测试：共享 helper 把错误路由到唯一接收者；已跟踪 Promise 的错误由其上下文消费者显示，已清理停止/审批的迟到错误忽略，只有 workspace 错误恢复工作区按钮。未改引擎、视觉、协议或状态所有权。

【实测】定向 `npx vitest run test/operation-feedback.test.ts test/session-directory.test.ts test/markdown-vite-chain.test.ts` 退出 0，23 项通过。新增生产 helper 回归证明旧会话审批失败无当前提示、并发新请求不被结算、迟到重复错误忽略，其他操作失败不解锁工作区控件。全套 `npm run check:all` 退出 0（核心 30 文件、149 项通过；类型、demo、handoff 均通过）；`git diff --check` 退出 0。产品保存为 `029a863`。

### 历史接手交付（029a863，后被 B3 候选替代）

| 字段 | 当前值 |
| --- | --- |
| 产品候选 | **`029a863`**；基点 `c7d5576`，之后仅 status 记录变化 |
| 改动 | 仅错误路由、真实消费者分支和 2 项相关回归；3 个产品/测试文件，未改 CSS、CLI、协议或引擎状态 |
| 检查 | 定向 23 项通过；check:all 退出 0，核心 149 项；diff 检查通过 |
| 角色限制 | Codex 本轮同时复核旧候选并接手修复，新候选结论为实现自验，不冒充另一个执行者的独立复核 |
| 实测边界 | 离线 adapter/RPC/WS/helper 和入口转换；未启动真实 CLI，未观察可见浏览器，未调用模型 |
| 用户验收 | 仍需确认打开/继续/停止实际操作，安全审批若无真实场景标未验；不要重复 K1/K2 或模拟底层故障 |

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

### 历史用户验收入口（候选 029a863）

使用 [README 启动入口](../README.md#启动浏览器产品)，候选之后仅文档变化；已有服务则确认使用当前代码并刷新页面，不杀用户服务。

1. 打开既有会话，切走再开或刷新 → 会话归属及正文/工具顺序一致。
2. 在该会话继续一条简短任务 → 生成与结束正常，思考/工具详情不产生重复。
3. 用户主动发起的运行中任务点击停止 → 请求与终态可区分，停止后可继续操作；无需编造耗时或危险任务。
4. 若有安全审批场景，提交引擎选项 → 可确认结果；没有场景则真实审批标未验，已有离线拒绝/重试证据保留。

失败、断连、重复提交和迟到结果的离线验证已由执行者完成，用户不用逐个模拟。R2-B 用户通过后，按用户新增的 V 序列先准备开屏/空态接入，再完成文案与视觉总复核，最后进入 R3；不再追加无依据的检查轮。

## 非本轮：开屏、空态与发布前复核规划

2026-10-12 用户澄清：要的是「无任务时的独立表面 + 开屏」，视觉仍用已确认 Endfield 语言；不是搬 Codex 配色。Cursor 未改 `app/`、`demo/` 与冻结候选 `029a863`。

- 可看：[preview/empty-landing](../preview/empty-landing/README.md)
- 拟改清单：[提案](proposals/empty-task-layer.md)
- 用户本次要求审核后接入，并在 Tauri 前插入文案复核与用户主导视觉总复核。顺序与职责只见 [plan 的 V 序列](plan.md#tauri-前插入的-v-序列)。
- 【源码】Codex 已审预览与实际 renderContent，修订空态优先级、一次性开屏与焦点/失败边界；详见提案。`node --check preview/empty-landing/landing.js` 退出 0。
- 【未验】可见浏览器 file URL 被策略阻止，本次不宣称动画观感通过，不绕过策略；用户决定构图/节奏。预览启动说明已改为仓库根服务，未由代理启动服务。
- R2-B 已由本次用户确认收口；开屏方案本次已确认，当前 V1 合同已就绪；尚未实施，未改 app/demo。R2-B 已通过产品候选为 `e091aca`，此次仅迭代预览。
- 已有预览、提案和用户 status 补充在改文档前保存为 `b56f80a`；本次优化为文档变化，不混入产品候选。

## 保留的产品事实

| 项 | 状态 |
| --- | --- |
| R2-A | 技术通过（`bf0bf2d`） |
| K1 / K2 | 用户 PASS |
| R1 整体操作 | 部分待用户补验（plan 保留项） |

## 上轮实施交付（R2-A）

见 Git `7239422:docs/status.md` 与候选 `bf0bf2d`。
