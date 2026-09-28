# AGENTS.md — T3rra-C0d3-Talos

给没有上一会话上下文的接手者。先读本文件，再读 [当前状态与下一入口](docs/status.md)。这是独立的新项目；Rhodes 的规则有选择地继承，产品实现和引擎事实没有迁入。

Talos 现在由两个相邻、分工明确的仓库组成：本仓库维护 GUI、文档与产品视觉；`C:\DEV\develop\minimax-code` 是主人创建的引擎 fork，维护 CLI/TUI、provider、账号与数据目录。两仓库通过 ACP 对接，不使用 Git 子模块、不移动目录，也不让 GUI 直接导入引擎内部模块。

## 项目与取舍

Windows 优先的 coding-agent 桌面控制台，MiniMax Code 后端、Endfield 族视觉、Tauri 2 外壳。视觉是核心资产，先有主人喜欢的可运行 demo，再做产品。Electron 不接受。当前已验收视觉正本及来源见 [设计地图](docs/design.md)。

## 接手规则

- **冷启动缺文档即停**：本次任务依赖的当前文档、权威引用或路径找不到、打不开、链接失效，停止实现，报准确路径与缺项，由主人恢复或指定替代；不能用记忆、归档或相近文件代替。明确标为“待建”的产品文件不属于丢失文档，不能装作已经存在。
- 先查状态和工作树，再做局部修改。不要整文件回滚别人的改动；不改 Rhodes 或其他外部参考仓库。相邻引擎 fork 只有在当前轮明确授权时才可修改，并且仍需遵守它自己的 source inventory、许可证和同步规则。
- 对 MiniMax Code 的接口结论标【源码】/【实测】/【文档】/【未验】。动引擎前先在 [接驳证据](docs/adapters/minimax-code.md) 记录源码版本、path:line、映射与缺失项，再实现和跑可复现探针。不要用 opencode 报文证明 MiniMax 行为。
- 用户说“通过”就更新现状；同时说“推进”才按当前范围进入下一项。不反复索取已经给过的授权；用户说仅评估、计划、收尾或停止时按该边界办。
- 不因机检全绿宣称产品或视觉已通过。已完成、未完成、未验证必须并列说清；不编造运行结果。

## 工作流与界面纪律

- 每轮：核对现状 → 定一个可验收小目标 → 实现 → 机读检查 → 给具体验收步骤 → 主人验收 → 更新现状。失败先修本轮，别继续堆功能。完整约定见 [工作流](docs/workflow.md)。
- 长期开发服务由主人在外部终端启动；代理运行有限时长检查。不能让代理进程生命周期决定验收窗口是否活着，也不能随手杀用户服务。
- 禁止无头浏览器、Puppeteer / Playwright / ark-ui 脚本；jsdom 仅可在未来 `test/` 中做 DOM 结构断言。不能把结构检查当渲染观察。可见行为交付必须附启动命令、URL/文件、前置条件、3–5 个顺序动作及预期、独立机读结果。
- 控件必须有可观察动作或可见失败；空态给恢复入口。产品建立 `app/ui-manifest.json` 后逐元素登记 `wired` 或 `static: 原因`；当前 demo 是明确标注的模拟数据，不能把它的按钮算产品能力。
- 产品事实经合并更新，禁止整对象覆盖丢失无关字段。UI 只读派生视图；引擎适配、状态、视图、系统 I/O 的边界见 [经验](docs/lessons.md)。
- 提交前跑全部适用检查，不许为变绿放宽闸。当前可用命令见 [README](README.md)，未来产品闸要求见工作流；不存在的 npm 命令不能写成已通过。
- PowerShell 下补丁用 `apply_patch` 或保存为脚本后运行，不用内联 `node -e` 拼复杂文本。文档中文，标识符、事件 kind、日志英文。

## 文档流

一件事只写一处：状态、验收和主人决定在 `docs/status.md`；实施方案、分轮验收目标与未来规划入口在 `docs/plan.md`；操作命令在 README；规矩在本文件与 workflow；视觉在 design；契约证据在 adapter；可迁移教训在 lessons。其余地方链接，不复制第二套待办。

状态是现状，不是逐日日志；过时条目改掉，历史交给 Git。证据保留版本和日期，不写进度。新材料优先并入现有文档；需要替换整篇文档时归档原件并标注替代关系。结束一轮前，必须让下一会话只靠文件就能知道当前事实和下一入口。

## 地图

| 入口 | 用途 |
| --- | --- |
| [docs/status.md](docs/status.md) | 当前验收、边界、下一步与决定；每次必读 |
| [docs/plan.md](docs/plan.md) | 浏览器五轮实施方案、Tauri 等后续规划入口与 Astra 复核提示；实施前按 status 定位阅读 |
| [docs/workflow.md](docs/workflow.md) | 开发、验收、文档更新、机读闸和服务生命周期 |
| [docs/design.md](docs/design.md) | Talos 的视觉正本、参考层级、demo 到产品的边界 |
| [docs/lessons.md](docs/lessons.md) | Rhodes 反复踩过的坑及迁移时如何避开 |
| [docs/adapters/minimax-code.md](docs/adapters/minimax-code.md) | MiniMax 源码入口、已知证据、待查契约 |
| [demo/talos.html](demo/talos.html) | 已验收静态交互 demo，不接后端 |

仓库边界：`C:\DEV\develop\minimax-code` 是本项目相邻的自有引擎 fork；`C:\DEV\develop\t3rra-C0d3` 仍是只读的 Rhodes 经验来源。引擎 fork 的代码、CLI/TUI、provider、凭据与数据目录属于引擎仓库；Talos 只通过 ACP 和固定的启动参数使用它。新项目视觉已带入本地，不再以临时目录为正本。
