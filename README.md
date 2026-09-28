# T3rra-C0d3-Talos

Talos 由两个仓库组成：这里维护 GUI 和产品文档；相邻 `C:\DEV\develop\Talos-CLI` 维护 mcode fork 的引擎与终端界面。项目现状只看 [status](docs/status.md)，往后做什么看 [plan](docs/plan.md)。本页仅作操作手册，不是要依次执行的任务清单。

接手先读 [AGENTS.md](AGENTS.md) → [status.md](docs/status.md)。开发与文档协作方式见 [workflow.md](docs/workflow.md)。

按用途选入口：[TUI 欢迎 ASCII 标题](#tui-欢迎-ascii-标题验收)、[TUI Talos 主题](#tui-talos-主题验收)、[GUI 网页 demo](#本地预览)、[未验收浏览器产品](#浏览器产品入口)、[内部检查](#当前机读检查)。真实请求可能消耗模型额度，不作例行检查。

## 本地预览

前置：浏览器、Python 3；静态检查另需 Node.js。第 1 轮真实握手使用 `C:\\Program Files\\nodejs\\node.exe`（支持的 Node 24），无需启动模型会话；后续真实探针沿用现有账号、模型和数据目录。

在自己的外部 PowerShell 终端运行，保持终端开启：

```powershell
cd C:\DEV\develop\T3rra-C0d3-Talos
python -m http.server 5192 --bind 127.0.0.1 --directory demo
```

打开 <http://127.0.0.1:5192/talos.html>。端口占用时先确认是谁在用，也可改端口并同步修改访问地址。静态文件入口：[demo/talos.html](demo/talos.html)。结束服务在所属终端按 Ctrl+C。

复验只是检查搬迁完整性，不重新定义已验收设计：

1. 打开页面：出现浅灰顶栏、石墨阅读区、黄色主操作；底部标明视觉样张，右侧标明未连接引擎。
2. 切换左侧会话及底部“待批准 / 运行中 / 完成 / 空会话”：演示内容随场景切换，空态有新建入口。
3. 点工单再关闭详情：详情浮窗可打开、关闭，主记录流不被长内容撑开。
4. 点“收起概况”再恢复并缩窄窗口：概况能切换，主要操作可达；注意长标题、路径和按钮是否拥挤。

以上为预期，由主人目视；静态检查不证明交互、动效或布局正确。

## 浏览器产品入口

前置：Windows PowerShell、支持的 Node 24、已安装依赖、现有 MiniMax 登录/模型配置；准备一个可丢弃的绝对工作目录。服务会启动一个 MiniMax ACP 进程并持有当前单会话，启动终端需保持打开。

在外部 PowerShell 执行：

```powershell
cd C:\DEV\develop\T3rra-C0d3-Talos
New-Item -ItemType Directory -Force .talos\product-cwd | Out-Null
& 'C:\Program Files\nodejs\node.exe' 'node_modules\tsx\dist\cli.mjs' src\dev.ts --cwd 'C:\DEV\develop\T3rra-C0d3-Talos\.talos\product-cwd'
```

打开 <http://127.0.0.1:5193/>。这是尚未通过验收的产品骨架，已知有回复不可见与样张字段残留，当前暂停复验；准确状态见 [status](docs/status.md)。

### 第 4 轮怎么验收

1. 页面加载后，确认标题显示当前 MiniMax 会话，状态显示已连接，构图仍保留浅灰顶栏、石墨阅读区、黄色主操作和右侧概况。
2. 输入 `只回复 talos-ok，不要调用工具` 并发送。预期看到用户指令和真实 MiniMax 回复，完成后输入框再次可用。
3. 发送一条较长回复请求，在输出中刷新浏览器。预期同一回合继续显示，历史和回复不重复；事件页可看到本页收到的服务摘要。
4. 如果出现工具记录，点击记录查看真实状态、路径、输入和输出；路径只表示引擎报告的工具位置，不代表文件已修改。
5. 运行中点击黄色停止按钮。预期先显示正在停止，收到引擎权威响应后才落为完成或已中止。

以上保留为 GUI 恢复工作后的验收参考，当前不要求重跑。内部检查由执行者判断；权限规则未触发审批时，不把静态卡片当作审批通过。

## 当前机读检查

```powershell
python demo/talos-check.py
python tools/check-handoff.py
```

第一条检查 demo 结构、资源、JS 语法与基础样式约束；第二条检查交接文档相对链接、关键资产及 demo 快照 SHA-256。均不启动浏览器、不调用模型。

第 1 轮环境与握手复验使用显式 Node 24，避免不同终端的 PATH 差异；当前终端版本须实际核对，不能沿用旧记录：

```powershell
cd C:\DEV\develop\T3rra-C0d3-Talos
& 'C:\Program Files\nodejs\node.exe' 'node_modules/tsx/dist/cli.mjs' spike/check-environment.ts
& 'C:\Program Files\nodejs\node.exe' 'node_modules/tsx/dist/cli.mjs' spike/initialize.ts
```

也可在已确认 npm 使用支持版本 Node 的终端运行 `npm run check:env` 与 `npm run spike:initialize`。第 1 轮探针只执行 ACP `initialize`，不创建会话、不发送 prompt；真实输出摘要和限制见 [接驳证据](docs/adapters/minimax-code.md) 与 [当前状态](docs/status.md)。

### 第 1 轮怎么验收

前置：Windows PowerShell、依赖已安装；不启动浏览器或服务，不需要登录，不会创建 MiniMax 会话。

1. `cd C:\DEV\develop\T3rra-C0d3-Talos`。
2. 运行环境探针，预期 `ok: true`、Node `v24.15.0`、mcode `0.5.7`、`failures: []`。
3. 运行握手探针，预期出现 `phase: environment` 和 `phase: initialize`，并看到 ACP v1、`loadSession: true`、MCP `http/sse`、会话 `list/fork/resume/close`、空 `authMethods`、空 `stderr`。
4. 确认没有 sessionId、模型回复或测试目录写入；第 1 轮只证明真实 initialize。

第 1 轮已完成，以上命令保留给执行者内部复验，不要求主人重跑或查看 JSON。

### Provider 配置：复用原生 TUI

本轮验收必须从 `C:\DEV\develop\Talos-CLI` 构建并启动 fork，不使用 PATH 中的系统 `mcode`：

```powershell
cd C:\DEV\develop\Talos-CLI
$env:PATH="C:\Program Files\nodejs;$env:PATH"
pnpm build
if ($LASTEXITCODE -ne 0) { throw 'Build failed; do not launch stale dist.' }
pnpm talos
```

进入 TUI 后输入 `/provider`。列表顶部应有 `+ Add provider`；按 Enter、Space 或 `a`，应进入既有官方 provider 预设列表，并能看到 `Custom provider`。MiniMax 可以作为一个已保存 provider 行存在，但不能再是唯一的新增入口。已有配置可直接查看和使用，测试保存可能调用模型。

这里验收的是 Talos fork 的原生 TUI 入口，不是浏览器配置页；`provider add/test/list` 仍是 CLI 子命令。重复的浏览器配置页和 custom-provider 探针停止使用，代码清理状态见 [status](docs/status.md)。

### 第 2 轮怎么验收

前置：第 1 轮已通过；外部 PowerShell 使用支持的 Node 24；允许使用现有 MiniMax 账号、模型和数据目录。脚本只在 `.talos/round2-*` 创建可丢弃 cwd，不启动浏览器或产品服务，结束时清理审批测试文件。

```powershell
cd C:\DEV\develop\T3rra-C0d3-Talos
& 'C:\Program Files\nodejs\node.exe' 'node_modules/tsx/dist/cli.mjs' spike/session-probe.ts
```

依次检查：

1. `phase: conversation`：正常 prompt 为 `end_turn`，取消 prompt 为 `cancelled`，并有真实 `agent_message_chunk`。
2. `phase: load`：`loadResponseKeys` 为 `modes`、`configOptions`，历史先回放，再能继续输入并得到 `end_turn`。
3. `phase: approval-deny` 和 `phase: approval-allow-once`：当前预期 `permissionRequests: []`、文件存在且内容为 `acceptance-ok`，表示现有权限规则没有触发审批；这项不能算审批通过。
4. `phase: complete`：脚本已清理临时文件；确认 `demo/` 和产品目录没有被写入。

第 2 轮已有证据，以上是执行者内部复现说明，会产生真实模型请求；不属于例行检查或当前纠偏任务，不要求主人重跑。权限未触发仍不算审批通过。

当前工程已包含 `package.json`、锁文件、TypeScript 探针、ACP 适配器、事实模型、WebSocket 服务、`app/` 产品 UI 和 `check:all`。Tauri 与安装包仍按 [实施计划](docs/plan.md) 的后续轮次规划，不能写成已通过。

第 3 轮内部检查可在支持的 Node 终端执行：

```powershell
& 'C:\Program Files\nodejs\node.exe' 'node_modules/typescript/bin/tsc' --noEmit
& 'C:\Program Files\nodejs\node.exe' 'node_modules/vitest/vitest.mjs' run test/round3.test.ts
python demo/talos-check.py
python tools/check-handoff.py
```

产品端到端烟测曾以显式 Node `v24.15.0` 启动成功：MiniMax ACP `0.5.7`、`GET /health` 返回 `{"ok":true}`、产品入口返回 HTTP 200。完整当前状态与限制见 [docs/status.md](docs/status.md)。

## 引擎配置离线回归（执行者入口）

用于 status 指向的 `config-offline-regression/r1` 小轮；以下命令尚不代表该轮通过。只加载相邻 fork 的源码测试，不启动系统 mcode，不需要 API key。先按 plan 修正测试并建立 fake home/data dir 隔离，再在外部 PowerShell 执行：

```powershell
cd C:\DEV\develop\Talos-CLI
& 'C:\Program Files\nodejs\node.exe' 'node_modules/vitest/vitest.mjs' run --config vitest.oss.config.mjs packages/config/test/builtin-model-fallback.test.ts
& 'C:\Program Files\nodejs\node.exe' 'node_modules/typescript/bin/tsc' -p tsconfig.standalone.json
& 'C:\Program Files\nodejs\node.exe' scripts/source-inventory.mjs
git diff --check
```

预期：配置用例实际执行且零跳过、类型与源码清单通过。非 managed 用例若确认继承 fake home，报告为已复现隔离缺口；测试通过不等于独立发行通过。失败处理和修改范围按 plan，不用修改生产逻辑把检查变绿。文档收口使用本仓库现有两条 Python 检查。

## TUI Talos 主题验收

前置：已按上方命令从 `C:\DEV\develop\Talos-CLI` 完成构建，终端已进入 TUI；本轮不需要登录、发送消息或配置 provider。

1. 输入 `/theme`，在主题列表中选择 `Talos`，按 Enter 保存。
2. 观察欢迎区之外的正文、输入区、菜单和状态提示：应以黄灰为主，正文仍保持中性可读，成功/警告/错误仍有区别。
3. 在主题面板中切换 light / dark，再缩窄终端；两套颜色都应可读，面板不溢出。
4. 按 Esc 取消一次未保存选择，再重新打开确认当前主题没有被误改；不发送消息，退出即可。

预期：只改变主题颜色，不改变默认主题、快捷键、滚动、思考块、工具或审批逻辑。主题能显示并切换即可视为本轮可见验收通过；是否把 Talos 设为发行默认另行决定。

## TUI 欢迎 ASCII 标题验收

前置：已按下方命令从 `C:\DEV\develop\Talos-CLI` 完成构建，终端已进入 TUI；本轮不需要登录、发送消息或配置 provider。

1. 宽屏启动：应看到较小机械臂，上方是纯 ASCII 的 `TALOS` 字样，标题不使用厂商字标。
2. 缩到约 20–31 列：应降为单行 `TALOS` 和 compact arm，不能横向溢出。
3. 再缩窄到约 10–19 列：保留 micro arm；低于 10 列可以显示单字 fallback。
4. 恢复宽度并退出：确认欢迎页之外的输入、主题和快捷键没有被本轮改变。

预期：只是欢迎 hero 的图形缩放和标题显示变化，不改变会话、工具、审批、思考块或默认主题。

## TUI 欢迎页验收

必须从当前 fork 源码目录启动，不能用 PATH 中的系统 `mcode`，也不能跳过构建：

```powershell
cd C:\DEV\develop\Talos-CLI
$env:PATH="C:\Program Files\nodejs;$env:PATH"
node -v
pnpm build
if ($LASTEXITCODE -ne 0) { throw 'Build failed; do not launch stale dist.' }
& 'C:\Program Files\nodejs\node.exe' .\dist\cli.js
```

这是欢迎页的复验入口，不要求重新验收，也不要求发送模型消息。依次查看：

1. 构建成功后进入终端：欢迎区出现黄色机械臂和普通字号 `TALOS`。
2. 缩窄终端再放宽：欢迎图按宽度降级，提示可读。
3. 查看输入区后退出，不发送消息：本次只观察欢迎页；其它部位仍可能出现 `MCode`，不能凭这一点判断启动错了。

若欢迎区仍显示旧的大字 logo，先记录启动路径与构建结果，视为需要排查的可见失败；不能直接否定主人反馈。纯渲染/单测不能替代以上观察，既有机读证据见 adapter。

## 仓库与资料

远端：[PAKIKNOWLEDGE/T3rra-C0d3-Talos](https://github.com/PAKIKNOWLEDGE/T3rra-C0d3-Talos)。本地 Git 仅用于后续开发，提交与推送状态见 [status.md](docs/status.md)。

`demo/` 为可运行范本，`docs/` 为交接地图，`docs/references/` 为主人提供的游戏参考图，`tools/` 为交接检查。字体与参考图的来源及分发待办见 [design.md](docs/design.md)；这些资料不代表整个目录已有统一开源许可。
