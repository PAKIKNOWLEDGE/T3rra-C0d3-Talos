# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **执行中（技术复核退回，待 Cursor 修复）** |
| 本轮角色 / 来源 | Codex 技术复核；用户要求复核当前候选 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | studio-stream、session-history、fact-store、types、talos-studio 重载接线、契约测试 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | 修复下方 F1–F6，相关复验后提交新候选并停在待技术复核；本候选不进入用户验收 |
| 完成证据 | 见下方「实施交付」；**未**用户验收、**未**真实引擎付费复现 |
| 下一接手 / 就绪性 | Cursor：继续同一 R1 的复核退回项；不得推进 R2 或改 CLI/视觉 |

## 触发与已确认决定

用户授权执行 R1，修复正文粘连与 ENGINE JSON 等已报问题；协作方式见 [workflow](workflow.md)。

## 产品事实与已知问题

| 项 | 状态与证据层级 |
| --- | --- |
| 视觉 / 引擎 | 用户此前表示满意；本轮未改、未重验 |
| R1 消费语义 | Cursor 声称 A1–A6 通过；Codex 定向回放发现 A2/A4/A5/A6 缺口，见下方 F1–F6 |
| 正文粘连 | 【合成】空格 delta 与 notice 交错已加回归；【**未验**】真实 MiMo/Studio 付费 turn |
| ENGINE JSON | 【源码】query_collapse_view 已抑制；【未验】其余 generic 是否仍吵 |
| 产品总验收 | **无**；mock/check:all 绿 ≠ 通过 |

## Git 与检查事实

- 实施基点（开始前 HEAD）：`597a2a1`
- 产品 WIP 恢复点（历史）：`94c02ec`
- 被复核产品候选：caae401；复核开始 HEAD 为 92683eb，后续与未提交差异仅为本页记账，产品代码与候选一致。

## 当前候选与实施交付

| 字段 | 当前值 |
| --- | --- |
| 实施基点 | `597a2a1` |
| 产品候选提交 | `caae401`（`fix(desktop): faithful studio message projection for R1`） |
| 候选之后的改动 | 92683eb 及复核开始前未提交变化均为本页；本次复核继续保留候选记账并写入结论 |
| 实际修改与范围调整 | 新增 `studio-message-text.ts`；delta 不再 trimStart；`assistant.replace` 完整帧；FactStore 按 messageId 合并、去掉正文去重；历史 parts 顺序含 tool；`query_collapse_view` 不展示；`resync-*` 触发 `session/messages` 重载；`error.message` 字段；测试 `message-fidelity-r1.test.ts` |
| A1–A6 技术证据 | Cursor 原报 A1–A6 全通过（合成，CLI SHA d045efc）；Codex 复核：A1 空白路径成立，A2/A4/A5/A6 仍有明确失败，不能按测试标题判定合同完成 |
| 命令、退出码与限制 | `npm run typecheck` 0；`npm run test:core` 116 passed；`npm run check:all` 0；【未运行】`dev:product`、真实模型、浏览器目视 |
| 引擎运行路径/版本 | 未运行；契约只读 **d045efc** |
| 用户启动与操作 | 复核通过后按 [plan 用户验收](plan.md#用户验收) 与 README `dev:product`；工作区与 provider 由用户自备 |

## Codex 技术复核

**2026-10-10：技术不通过，退回同一 R1。** 候选 caae401，基点 597a2a1；产品 diff 11 文件，未越权改 CLI/视觉。CLI 源码仍为 d045efc，工作树干净。保留本轮有效的正文空白、完整正文更新和历史 parts 修正，不推倒重做。

复核方式：读全部候选 diff、实际 app 时间线消费、相关 CLI/TUI 源码；用本地 TypeScript 编译器在内存装载生产模块，执行合成事件回放。脚本 `.talos/review-r1.cjs` 在忽略目录，`node --check .talos/review-r1.cjs` 与 `node .talos/review-r1.cjs` 均退出 0；后者是输出观察值的诊断脚本，不是“测试全绿”。无引擎启动、无模型调用、无画面验收。未重复执行 Cursor 已报告的全库测试。

### 复核退回项

| 编号 / 优先级 | 位置（候选行号） | 可复现输入与实际失败 | 修复与复验要求 |
| --- | --- | --- | --- |
| F1 / P1 | studio-stream.ts:61、174；fact-store.ts:319、328 | 同一完整 message 的 parts 为 text(before) → tool(t1) → text(after)：实时只有 beforeafter，历史却是三段；同 messageId 的正文 delta → tool delta → 正文 delta 也把 after 写回工具之前 | 实时与历史保留消息/片段身份及工具边界，完整帧更新对应片段，不将所有 text 扁平化；A4 增加同一输入实时/历史比较，以及历史装载后完整帧更新不重复的回归 |
| F2 / P1 | fact-store.ts:208；talos-studio.ts:114 | 同 processEpoch=1，当前切到 s2 后，s1 的 assistant message 仍进入 s2 的 messages/timeline；外层 turnId 未传给投影 | 在生产入口/状态层保留并核对 session、turn 归属；A6 必须通过真实 adapter → store 路径覆盖同进程切会话、迟到旧回合及外层身份，不只测旧 processEpoch |
| F3 / P1 | talos-studio.ts:115、648；fact-store.ts:118 | resync 发起 session/messages 尚未返回时收到 NEW TEXT，随后旧历史返回 OLD SNAPSHOT，整个 messages 被替换，NEW TEXT 消失 | 对重同步响应与期间增量建立顺序/代次或重放规则；完整替换事件携带的权威内容不能丢弃；补延迟 RPC、交错增量、多个响应乱序的定向回归，证明新内容不被旧快照覆盖 |
| F4 / P2 | studio-stream.ts:57、168 | thinking delta 为 I 和“ think”，完整帧 thinking 为 I think：最终得到 IthinkI think | thinking 原片段保留空白，完整 thinking 按消息身份更新；取消按片段正文拼出的去重 key，A2 覆盖多片段与完整帧一致性 |
| F5 / P2 | studio-stream.ts:214 | generic eventType=internal.new、data={key:value} 仍生成原始 JSON notice；app/talos.js:975 将其画成 ENGINE 卡片 | 按合同对有产品含义的事件明确映射，未知内部事件不默认进入聊天；A5 覆盖未列入黑名单的事件，不只测 query_collapse_view |
| F6 / P2 | fact-store.ts:199、336 | slash.completed output=OK：messages 中变成 OKOK，timeline 是 OK；新 appendTimelineAssistant 又调用 appendAssistantDelta，重复写入消息集合 | 每次斜杠结果只写一次 messages 和 timeline，补完整 slash.completed 状态回归，确保两者内容一致 |

本表所有输入为合成契约回放，不是付费引擎复现；F1–F6 均由生产模块直接产生上述结果。F6 当前 UI 优先使用 timeline，未声称它现在就显示双份，但共享事实已损坏，是本候选引入的直接回归。

证据缺口：现有 A4 只测历史，没有比较实时；A5 只断言发出 resync 请求标记，没有验证重载完成后的记录；A6 只测旧 processEpoch。Cursor 应将以上最小反例移入已有/本轮回归，复用有效检查，不增加无关测试项目。候选交付时还需把用户验收绑定准确启动入口与可复现工具记录，不能只写“工作区自备”。

下一动作：继续修复 F1–F6，不更改 R1 完成条件；更新接驳证据中相关结论，提交新候选，记录定向检查与未验范围后停在待技术复核。复核者再次检查通过前，不把本候选交给用户做产品验收。

## 用户验收

尚未进行。技术复核通过后再按 plan 五步操作。
