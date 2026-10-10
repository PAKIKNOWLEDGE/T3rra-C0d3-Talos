# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **执行中（用户验收发现思考重复，待技术复核）** |
| 本轮角色 / 来源 | Codex 修复用户真实验收发现的思考块重复；候选待技术复核 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | 同 R1；思考块合并、thoughtId 稳定性、FactStore 去重 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | 修复重复思考后重新技术复核；通过前不进入完整 R1 收口、不推进 R2 |
| 完成证据 | 见「实施交付」；typecheck 与 handoff 检查通过；用户验收已发现重复思考，待修复后继续 |
| 下一接手 / 就绪性 | Codex：复核候选 `484bb8e`；技术通过后用户继续 R1 五步验收 |

## 触发与已确认决定

Codex 二次复核 `78529b9` 不通过（G1–G2）；三次 `0be98d8`（H1–H2）；四次 `800a9c8`（I1）；用户授权修复并提交新候选。

## 产品事实与已知问题

| 项 | 状态 |
| --- | --- |
| 失效候选 | `caae401`、`78529b9`、`0be98d8`、`800a9c8` |
| 当前候选 | **`484bb8e`** — 修复真实验收发现的重复思考块 |
| 真实 Studio / 付费 turn | **【用户实测发现思考重复】** |
| 浏览器目视 | **【用户截图发现思考重复】** |

## Git 与检查事实

- R1 原始基点：`597a2a1`
- **当前产品候选：`484bb8e`**

## 当前候选与实施交付

| 字段 | 当前值 |
| --- | --- |
| 实施基点 | `fc82b96`（复核退回记录：`92c263b`） |
| 产品候选提交 | **`484bb8e`**（含前置 `d089d25`、`a83b7a2`） |
| 相对 fc82b96 的改动 | 历史请求身份、完整替换、turn/event 归属，以及 thoughtId 稳定与重复思考去重 |
| J1–J3 回放 | `outOfOrder=NEW`；`manualRetryWithLive=BEFORE LIVE`；`messagesReplaced=DURABLE`；旧回合事件不进入当前 timeline，连接保持 connected |
| 既有 R1 证据 | 沿用前置候选 F1–F6、G1–G2、I1 合成证据；本轮未新增测试文件 |
| 命令、退出码 | `npm run typecheck` 0；`npm run check:handoff` 0；思考回放输出单个 thought；未重跑完整测试套件 |
| 引擎运行 | **未运行** |
| 用户入口 | 技术通过后：`npm run dev:product -- --cwd <绝对路径>` → `http://127.0.0.1:5193/`；[plan 用户验收](plan.md#用户验收) |

## Codex 技术复核

**2026-10-10：用户真实验收发现重复思考块，原技术通过结论失效。** 用户截图显示同一段思考正文出现两次。根因是流式 thinking 与最终 assistant message 在部分 Studio 事件形状下生成不同 thoughtId，FactStore 只按 ID 替换，导致两个相同思考卡片进入 timeline。

已修复并提交 `484bb8e`：

- `studio-stream.ts` 使用外层 turnId 作为稳定 thought 归属，覆盖 delta 没有 messageId、最终 message 才带 messageId 的情况。
- `fact-store.ts` 替换思考时去除同一 thoughtId 的重复条目；没有匹配 ID 但正文完全相同的思考也不再新增第二条。
- 离线回放结果：同一回合 delta + final message 只保留一个 `thought-t1` 条目。
- `npm run typecheck` 退出 0；`npm run check:handoff` 退出 0。

本候选尚未重新技术复核，也未完成完整 R1 五步验收。真实 Studio 与浏览器截图已经证明原候选存在用户可见缺陷；本条缺陷优先级高于之前的合成证据。

## 用户验收

R1 用户验收已开始：真实请求发现重复思考块，当前候选退回技术复核。完整五步验收待 `484bb8e` 通过后继续。
