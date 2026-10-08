# Talos 桌面计划

本页只保留 **GUI / Tauri / 视觉** 边界与下一入口。引擎发行、验证与 CLI 待办见 Talos-CLI [docs/status.md](file:///C:/DEV/develop/Talos-CLI/docs/status.md)。当前桌面事实见 [status](status.md)，规则见 [workflow](workflow.md)。旧步骤见 [归档](archive/2026-10-06/plan-before-doc-refresh.md)。

## 目标与范围

Windows 优先的 Talos **桌面**控制台：Endfield 族视觉、Tauri 2 外壳；引擎经 ACP 使用相邻 Talos-CLI，不直接导入引擎模块。Electron 不接受。视觉正本见 [design](design.md) 与 [demo/talos.html](../demo/talos.html)。

不从零证明继承引擎的全部能力。桌面任务来自 demo/`app/` 欠账、可见验收缺项或 Tauri 接入的明确授权；未验证本身不是无限检查的理由。**当前桌面实现暂停**；可安装终端产品在 CLI 仓。

## 恢复 GUI 后的顺序

1. 收口 `app/` 与 demo 契约差异（样张、刷新、回复可见性）。
2. 按 [design](design.md) 与 [talos-engine](adapters/talos-engine.md) 的 ACP 边界接引擎，不重做已验收 demo 布局。
3. Tauri 2 外壳：复用 demo 资产与字体策略；发行边界另定。

## 引擎侧（只链接，不在本仓实施）

提示词身份已在 CLI **0.1.2** 合入；等待提醒交流边界仍开放 — 见 CLI [prompt identity follow-ups](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/blob/main/docs/superpowers/plans/2026-10-07-prompt-identity-followups.md)。

2026-10-07 的「提示词边界修复提案」已归档为历史方案上下文，见 [归档提案](archive/2026-10-08/prompt-boundary-proposal.md)；是否继续改引擎以 CLI status 为准。

## 搜索与桌面

默认联网搜索不属于当前 CLI 预览；桌面阶段也不预设默认搜索。自配 MCP 搜索未实测，不能当已交付能力宣传。

## Git

本仓文档与 demo 在 `main` 或当前工作分支保存；引擎修改只在 Talos-CLI，按该仓 CONTRIBUTING 与 source inventory 规则执行。
