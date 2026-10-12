# 当前状态 — Talos Desktop

更新：2026-10-12。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-markdown-single-source / r2-a |
| 阶段 | **待技术复核** |
| 本轮角色 / 来源 | Luna 执行；用户授权 R2-A |
| 目标 / 方案入口 | [R2-A Markdown 生产与测试同源](plan.md#下一小轮r2-a-markdown-生产与测试同源) |
| 允许范围 | 共享 Markdown 模块、消费者、相关测试与 Vite 链检查 |
| 禁止范围 | 视觉、引擎、R2-B/R3、Markdown 新能力、依赖升级 |
| 验收 / 停止点 | Codex 技术复核本候选；不推进 R2-B |
| 完成证据 | 见「当前实施交付与复核」 |
| 下一接手 / 就绪性 | Codex 复核；交付 fail **0 / 2** |

## 本轮授权与候选

- 规划提交：`fc20af9`；产品基线：`256534a`；执行前 HEAD：`fc20af9`（干净工作树）。
- 当前产品候选：**`bf0bf2d`**
- 当前写入者：已停写，待 Codex 复核。

## 当前实施交付与复核

| 字段 | 当前值 |
| --- | --- |
| 产品候选 / 改动清单 | **`bf0bf2d`** — `app/talos.js` 从 `../src/view/message-markdown.ts` 导入 `escapeHtml`、`renderAssistantMessageHtml`、`renderUserMessageHtml`、`renderTextBlock`、`stripRedactedThinking`；删除 ~110 行平行 Markdown 实现；`formatMessageText` 仍在本文件并调用 `stripRedactedThinking`；`message-markdown.ts` 仅导出 `renderTextBlock` |
| 改前生产基线 / 改后比对 | 基线 **`256534a`** 内嵌渲染与改前 `message-markdown.ts` 逻辑一致（diff 仅 export）。`test/markdown-single-source.test.ts` 用冻结 HTML 比对表格、列表+代码混排、用户换行、思考块、单元格 XSS；**改后输出与基线一致** |
| 共享模块与实际入口加载 | `test/markdown-vite-chain.test.ts`：`resolveId` + `transformRequest` 证明 `talos.js` → `message-markdown.ts` 可解析且打包含 `renderAssistantMessageHtml` / `message-markdown` 引用（未整页 `ssrLoadModule` talos，避免 `document` 误报） |
| 检查命令与结果 / 限制 | `npm run check:all` **0**（`test:core` **138**）；未启动 `dev:product`、未浏览器目视、未真实模型 |
| Codex 技术复核 | 待复核 |
| 候选退回记录 | 无；交付 fail **0 / 2** |

## 保留的产品事实

| 项 | 状态 |
| --- | --- |
| K1 / K2 | 用户 **PASS**（`f20f145` / `256534a`） |
| R1 整体操作 | 尚未明确全量确认（见 plan 保留项） |

## 用户验收

R2-A 无新视觉合同；不要求重复 K1/K2。技术通过后用户可按需 spot-check 表格/代码块/思考显示是否与 `256534a` 一致。
