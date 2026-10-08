# CLI 事实快照（文档大修前）

归档日期：2026-10-08。此后 **CLI 发行与引擎待办** 只维护在 Talos-CLI `docs/status.md`，本仓 [status](../../status.md) 只保留桌面线。

## 为何归档

GUI 仓曾用一张 status 同时写 CLI 版本、npm、NixOS 与提示词任务，与「split-strict」双卡冲突，且与 CLI 已发 **0.1.2** 脱节。

## 大修前 GUI 卡记录的关键事实（可能已过时）

- 交接卡 `prompt-boundary-decision/r1` 写身份修复「未启动」；CLI 侧已在 0.1.2 合入身份 PR。
- 版本叙述停在 **0.1.1** / 基点 **738c495**；CLI main 后续含 0.1.2 与身份修复提交。
- NixOS 真实使用已确认；两项自动检查限制保留 — 细节见 CLI [verification.md](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/blob/main/docs/verification.md)。

完整逐段原文见 Git 历史：`docs/status.md` @ `f3eddc1`（大修前）。
