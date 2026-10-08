# 当前状态（Talos 桌面 / GUI）

更新：2026-10-08。**本页是本仓桌面工作的唯一执行入口。** 引擎发行、验证与 CLI 待办见相邻仓 [Talos-CLI docs/status.md](file:///C:/DEV/develop/Talos-CLI/docs/status.md)（GitHub：[Talos-Code-CLI](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/blob/main/docs/status.md)）。

名字分层见 [词汇表](glossary.md)。历史 CLI 事实快照（至文档大修前）见 [归档](archive/2026-10-08/status-cli-facts-snapshot.md)。

## 当前交接卡

| 字段 | 当前值 |
| --- | --- |
| 任务标识 / 修订 | `docs-split-strict` / r1 |
| 阶段 | 双仓文档大修已完成；桌面实现仍暂停 |
| 本轮角色 | Luna |
| 触发依据 | 职能与语义坍缩；用户授权 split-strict 与 CLI 用户文档 Talos 化 |
| 目标 | 本仓只保留桌面状态与视觉路线；引擎事实不再写入本卡 |
| 允许范围 | 本仓 AGENTS、status、plan、workflow、glossary、adapter 索引、demo/`app/` 产品文案 |
| 禁止范围 | 在本卡维护 CLI 版本/SHA/npm；不代写引擎修复 |
| 验收 / 停止点 | 冷启动读本卡可知 GUI 边界；引擎问题链到 CLI status |
| 下一接手 | GUI 恢复时从 [plan](plan.md) 的 Tauri 接入小节启动；引擎任务读 CLI 卡 |

## 桌面工作线

| 工作线 | 当前事实 |
| --- | --- |
| 静态 demo | [demo/talos.html](../demo/talos.html) 已验收，为 GUI 视觉正本 |
| `app/` | 早期单页壳；样张与引擎未完全收口，**不算**可发行产品 |
| Tauri 2 | 未启动；在 GUI 恢复且 demo 契约稳定后再做外壳 |
| 视觉 | 方向与资产见 [design](design.md)；真实 TUI 欢迎页在 CLI，不在本仓改引擎 |
| ACP | 宿主侧契约与取证见 [talos-engine](adapters/talos-engine.md)；不直接导入引擎模块 |

## 已知欠账（桌面）

- 产品回复可见性、残留样张字段、刷新恢复未收口。
- `app/` 标题与品牌需与 [词汇表](glossary.md) 一致（Talos 桌面，不把 MiniMax Code 写成当前产品名）。

## 引擎事实（只链接）

CLI 发行线、0.1.2 身份修复、NixOS 验证限制、等待提醒开放项：**一律以 CLI 仓 status / verification / releases 为准**，本仓不复制 SHA 或版本矩阵。

静态提示词审查快照：[prompt-audit](adapters/prompt-audit.md)（审查基点 738c495；现行结论以 CLI 0.1.2 与 CLI verification 为准）。

## 阅读入口

| 文档 | 用途 |
| --- | --- |
| [glossary](glossary.md) | 名字分层 |
| [plan](plan.md) | 桌面路线与归档的引擎提案 |
| [workflow](workflow.md) | 协作与双卡规则 |
| [design](design.md) | 视觉正本 |
| [talos-engine](adapters/talos-engine.md) | 引擎 ACP/TUI 证据（历史文件名见文内说明） |
| [README](../README.md) | 本仓地图与 demo 启动 |
