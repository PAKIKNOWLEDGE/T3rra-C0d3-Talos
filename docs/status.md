# 当前状态 — Talos Desktop

更新：2026-10-12。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **待技术复核（K2 候选）** |
| 本轮角色 / 来源 | Luna；用户 K1 PASS，授权修复 K2 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | K2 生产 Markdown 表格 |
| 禁止范围 | R2+、Talos-CLI、视觉正本、Markdown 大框架、宣称 R1 全量通过 |
| 验收 / 停止点 | Codex/用户复核 K2；R1 五步在 K1/K2 均收口后继续 |
| 完成证据 | `npm run check:all` 0；见下表 |
| 下一接手 / 就绪性 | 技术复核 K2；通过后继续 R1 用户验收 |

## 触发与已确认决定

用户 **K1 PASS**（`f20f145`）。K2 在生产 `app/talos.js` 增加安全表格子集，不引入新依赖。

## 产品事实与已知问题

| 项 | 状态 |
| --- | --- |
| K1 | **用户 PASS**（`f20f145`） |
| 当前候选 | **`256534a`** — K2 表格 |
| K2 浏览器目视 | **【待复核】** |
| 真实 Studio | **【用户约 70%，K1/K2 后需续验】** |

## Git 与检查事实

- K1 已收口：`f20f145`
- **K2 产品候选：** 见下表（基点 `f20f145`）

## 当前候选与实施交付（K2）

| 字段 | 当前值 |
| --- | --- |
| 产品候选提交 | **（见 `git log -1`）** — `fix(desktop): safe GFM tables in production assistant markdown (K2)` |
| 改动 | `app/talos.js`：`parseTableCells` / 分隔线识别 / `<table class="md-table">`；单元格先 `escapeHtml` 再行内 Markdown；与列表、fenced code 共存。`app/product.css` 最小表格边框（不改壳布局）。`src/view/message-markdown.ts` 同步供 `test/message-markdown.test.ts` |
| 测试 | `message-markdown.test.ts` +3（表格、混排、XSS 转义）；`test:core` **135** |
| 命令 | `npm run check:all` **0** |

## 用户验收跟踪

| 编号 | 状态 |
| --- | --- |
| K1 | **PASS** |
| K2 | **候选待复核** — assistant 气泡内表格为行列结构，无裸 `\|` / `---` 段落 |

## Codex 技术复核

K2 候选待复核。K1 已用户通过，无需再验锚点右栏。

## 用户验收

K2 通过后继续 R1 plan 五步完整目视。
