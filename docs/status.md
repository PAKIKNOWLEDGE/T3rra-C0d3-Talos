# 当前状态 — Talos Desktop

更新：2026-10-12。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **待用户验收（K1/K2 已收口，R1 整体验收待确认）** |
| 本轮角色 / 来源 | Luna；用户 K1 PASS，授权修复 K2 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | K2 生产 Markdown 表格 |
| 禁止范围 | R2+、Talos-CLI、视觉正本、Markdown 大框架、宣称 R1 全量通过 |
| 验收 / 停止点 | K2 技术与用户验收通过；仅确认 R1 整体尚未记录的操作结果 |
| 完成证据 | `npm run check:all` 0；见下表 |
| 下一接手 / 就绪性 | 确认 R1 剩余验收事实；用户明确推进后准备 R2 |

## 触发与已确认决定

用户 **K1 PASS**（`f20f145`）。K2 在生产 `app/talos.js` 增加安全表格子集，不引入新依赖。

## 产品事实与已知问题

| 项 | 状态 |
| --- | --- |
| K1 | **用户 PASS**（`f20f145`） |
| 当前候选 | **`256534a`** — K2 表格 |
| K2 浏览器目视 | **【用户实测通过】**（本次交付反馈，候选 `256534a`） |
| 真实 Studio | **【此前用户约 70%；K1/K2 已通过，R1 整体尚未明确确认】** |

## Git 与检查事实

- K1 已收口：`f20f145`
- **K2 产品候选：** 见下表（基点 `f20f145`）

## 当前候选与实施交付（K2）

| 字段 | 当前值 |
| --- | --- |
| 产品候选提交 | **`256534a`** — `fix(desktop): safe GFM tables in production assistant markdown (K2)` |
| 改动 | `app/talos.js`：`parseTableCells` / 分隔线识别 / `<table class="md-table">`；单元格先 `escapeHtml` 再行内 Markdown；与列表、fenced code 共存。`app/product.css` 最小表格边框（不改壳布局）。`src/view/message-markdown.ts` 同步供 `test/message-markdown.test.ts` |
| 测试 | `message-markdown.test.ts` +3（表格、混排、XSS 转义）；`test:core` **135** |
| 命令 | `npm run check:all` **0** |

## 用户验收跟踪

| 编号 | 状态 |
| --- | --- |
| K1 | **PASS** |
| K2 | **技术通过 / 用户 PASS**（`256534a`） |

## Codex 技术复核

2026-10-12：**K2 候选 `256534a` 技术通过，无本轮阻塞项。** 候选后的 `00e0d2a` 为文档记录；复核开始时工作树仅有 status 中候选编号补全，本次保留并一并保存。

- 【源码】`app/talos.js` 的生产 assistant 渲染路径已识别表头、分隔线与数据行；单元格先转义 HTML，再处理行内格式；fenced code 先分段，不被表格识别吞入。CSS 仅增加气泡内表格样式。
- 【文档】Cursor 记录 `npm run check:all` 退出 0，`test:core` 135；本轮未重跑全套。
- 【实测】Codex 从实际 `app/talos.js` 提取生产渲染函数，离线执行表格行列结构、行内格式、列表与代码块顺序、HTML 转义检查，全部通过；`git diff --check f20f145 HEAD` 退出 0。没有启动浏览器或调用模型。
- 【用户实测】用户反馈 K2 自行验收确实可用；记录为本候选画面通过，非 Codex 目视。
- 【源码 / 证据限制】现有 Markdown 单测仍调用 `src/view/message-markdown.ts` 平行实现，不能将其数量当作浏览器生产路径证明。本次以生产函数补证和用户实测完成 K2；R2 在既定“验证覆盖实际生产路径”范围内统一此路径，避免后续漂移。当前实现是基本表格子集，不宣称完整 GFM 支持。

K1/K2 均已收口。本次结论不代替尚未明确记录的 R1 整体操作验收，也不授权开始 R2。

## 用户验收

用户已确认 K1 和 K2。R1 其余操作按 plan 既定清单记录结果；已确认的项目不重验。目前尚未有整体通过的明确反馈，重点核对工具前后顺序、切会话/刷新后的记录一致性与思考/工具详情操作。没有新故障不另开修复轮。
