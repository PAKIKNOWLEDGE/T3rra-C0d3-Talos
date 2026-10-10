# 当前状态 — Talos Desktop

更新：2026-10-10。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **待技术复核** |
| 本轮角色 / 来源 | Luna；用户授权修复第四次复核 I1 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | 同 R1；历史请求代次 + `fact-store` / `talos-studio` + 定向回归 |
| 禁止范围 | R2+、Talos-CLI、视觉、Tauri、宣称产品/画面通过 |
| 验收 / 停止点 | Codex 技术复核本候选；通过前不进入用户验收、不推进 R2 |
| 完成证据 | 见「实施交付」；`npm run check:all` 0；**未**用户验收、**未**真实引擎付费复现 |
| 下一接手 / 就绪性 | Codex 复核；若再退回则继续 I 项或新编号项 |

## 触发与已确认决定

Codex 二次复核 `78529b9` 不通过（G1–G2）；三次 `0be98d8`（H1–H2）；四次 `800a9c8`（I1）；用户授权修复并提交新候选。

## 产品事实与已知问题

| 项 | 状态 |
| --- | --- |
| 失效候选 | `caae401`、`78529b9`、`0be98d8`、`800a9c8` |
| 当前候选 | **`fc82b96`** — I1 历史请求代次 |
| 真实 Studio / 付费 turn | **【未验】** |
| 浏览器目视 | **【未验】** |

## Git 与检查事实

- R1 原始基点：`597a2a1`
- **当前产品候选：** 见下表（相对 `800a9c8` 的 I1 修复）

## 当前候选与实施交付

| 字段 | 当前值 |
| --- | --- |
| 实施基点 | `800a9c8` |
| 产品候选提交 | **（提交后填入 SHA）** — `fix(desktop): R1 history request generation for out-of-order hydrates` |
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

**I1 修复已提交新候选（见上表 SHA）。** 待第五次技术复核。

## 用户验收

尚未进行。须 Codex 技术通过后再执行 plan 目视清单。
