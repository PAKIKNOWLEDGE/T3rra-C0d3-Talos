# 提示词边界修复提案（归档）

归档日期：2026-10-08。原提案写在 [plan-before-doc-refresh 同期 plan](../../plan.md) 与 2026-10-07 status；身份相关条目已由 CLI 0.1.2 实施，**等待交流边界**仍开放。

## 保留的架构判断

- 产品身份、模型身份与内部路由身份须分开。
- 机器提醒须保留反循环与完成通知；澄清「无需确认」不能保证模型静默。
- 不得用字符串测试或 UI 隐藏宣称真实体验已修复。

## 现行入口

- 引擎待办：Talos-CLI [docs/status.md](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/blob/main/docs/status.md)
- 静态审查快照：[prompt-audit](../../adapters/prompt-audit.md)
- 证据库：[talos-engine](../../adapters/talos-engine.md)
