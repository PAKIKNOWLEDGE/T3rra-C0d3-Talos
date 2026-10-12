# 当前状态 — Talos Desktop

更新：2026-10-12。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-message-fidelity / r1 |
| 阶段 | **待用户验收（K1 技术通过）** |
| 本轮角色 / 来源 | Luna；用户授权修复验收缺陷 K1 |
| 目标 / 方案入口 | [R1 对话记录忠实接驳](plan.md#下一小轮r1-对话记录忠实接驳) |
| 允许范围 | K1 右栏记录锚点；K2 仍待下一轮 |
| 禁止范围 | R2+、Talos-CLI、视觉正本、Tauri、宣称 R1 全量通过 |
| 验收 / 停止点 | K1 技术通过，待用户目视；K2 未开工；R1 五步未收口 |
| 完成证据 | `npm run check:all` 0；见下表 |
| 下一接手 / 就绪性 | 技术或用户确认 K1 后执行 K2（Cursor Round 2） |

## 触发与已确认决定

用户真实验收约 70%；思考重复已在 `484bb8e` 修复；K1/K2 为新一轮 UI 缺陷。K1 采用撤下右栏可见入口，保留 `session/inputSummaries` 引擎接线。

## 产品事实与已知问题

| 项 | 状态 |
| --- | --- |
| 失效候选（UI 基线） | `484bb8e`（含记录锚点右栏） |
| 当前候选 | **`f20f145`** — K1 撤下记录锚点右栏 |
| K2 Markdown 表格 | **未修** |
| 真实 Studio / 付费 turn | **【用户实测约 70%】** |
| 浏览器目视 K1 | **【待用户/Codex 确认右栏无锚点模块】** |

## Git 与检查事实

- **当前产品候选：`f20f145`**
- 基点：`484bb8e`

## 当前候选与实施交付（K1）

| 字段 | 当前值 |
| --- | --- |
| 产品候选提交 | **`f20f145`** — `fix(desktop): hide unexplained input anchor rail section (K1)` |
| 改动 | `app/index.html` 移除右栏「记录锚点」区块；`#inputAnchors` / `#anchorCount` 保留为 hidden 占位以满足 ui-manifest；`app/talos.js` 不再渲染锚点列表；`ui-manifest.json` 标为 reserved |
| 未改 | `talos-studio` `session/inputSummaries`、`FactStore.inputSummaries`、锚点跳转 handler（无可见按钮时不触发） |
| 命令 | `npm run check:all` **0**（`test:core` **132**） |
| 用户入口 | `npm run dev:product -- --cwd <绝对路径>` → `http://127.0.0.1:5193/`；右栏应仅见执行计划/检视/上下文/本轮文件 |

## 用户验收跟踪

| 编号 | 状态 | 说明 |
| --- | --- | --- |
| K1 | **技术通过，待用户目视** | 右栏不再展示「记录锚点」；无逐字竖排列表 |
| K2 | 待 Round 2 | Markdown 表格渲染 |

## Codex 技术复核

2026-10-12：**K1 候选 `f20f145` 技术通过，无本轮阻塞项。** 复核基点 `26eafd8`，复核时 HEAD 为 `9610349`（候选之后仅交付文档变化），工作树干净。

- 【源码】`app/index.html` 已撤下「记录锚点」标题与可见区块；两个 manifest 占位保留 `hidden` / `aria-hidden`，当前加载样式没有使其重新显示的规则。
- 【源码】`app/talos.js` 已删除锚点计数和列表生成，没有重新显示占位的代码；保留跳转 handler 不产生可见入口。改动限于产品壳三个文件，未修改引擎、FactStore、其他右栏模块或视觉资产。
- 【文档】复用 Cursor 绑定本候选的 `npm run check:all` 退出 0 / `test:core` 132 记录；Codex 未重跑该套检查。manifest 双向 ID 检查仍符合当前 HTML。
- 【实测】Codex `git diff --check 26eafd8 HEAD` 退出 0。
- 【未验】本轮未观察可见浏览器，不宣称视觉通过；用户确认刷新后右栏没有「记录锚点」即可完成 K1 画面验收。

本结论仅覆盖 K1。K2 Markdown 表格仍未修，R1 全量验收未完成。此复核记录只改文档，产品候选仍为 `f20f145`。

## 用户验收

R1 五步在 K1/K2 均收口后继续。当前请目视确认右栏无「记录锚点」模块。
