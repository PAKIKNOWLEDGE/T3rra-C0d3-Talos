# T3rra-C0d3-Talos

MiniMax Code + Endfield 族视觉 + Tauri 2 的独立控制台项目。目前已具备浏览器单会话产品骨架：Node 服务持有 MiniMax ACP 会话，`app/` 沿用已验收视觉范本；Tauri 2 与安装包仍是后续规划。

接手先读 [AGENTS.md](AGENTS.md) → [status.md](docs/status.md)。开发与文档协作方式见 [workflow.md](docs/workflow.md)。

已确认的浏览器五轮实施方案与 Tauri、Windows、功能扩展、发布的后续规划入口见 [plan.md](docs/plan.md)。其中未来路线尚待分阶段规划与授权；文中的目标接口不代表当前已有能力。

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

本轮只请主人验收可见 UI、操作路径和视觉保持。协议、类型、探针、状态合并和服务生命周期检查由执行者自行判断；当前权限规则未触发审批时，不把静态审批卡片当作通过。

## 当前机读检查

```powershell
python demo/talos-check.py
python tools/check-handoff.py
```

第一条检查 demo 结构、资源、JS 语法与基础样式约束；第二条检查交接文档相对链接、关键资产及 demo 快照 SHA-256。均不启动浏览器、不调用模型。

第 1 轮环境与握手复验在 PowerShell 中使用显式 Node 24，避免 PATH 当前指向不受支持的 Node 22.15.0：

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

在已安装的 mcode TUI 中输入 `/provider`，或在外部终端执行 `mcode provider` 打开同一管理菜单。已有配置可直接查看和使用，无需为本项目重新输入密钥。确需新增时，选择 “Add 3rd-party provider…” → 现有预设或 “Custom provider”，沿原生流程输入地址/密钥、导入或手填模型、测试保存并使用。测试保存可能调用模型。

这里是系统已安装 mcode 的操作入口，不证明本地 fork 的改动生效。`provider add/test/list` 是 CLI 子命令；模型发现的 `/models` 是 HTTP 接口。重复的浏览器配置页和 custom-provider 探针停止使用，代码清理状态见 [status](docs/status.md)。本轮不要求主人进行任何连接测试。

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

## TUI 欢迎页验收

必须从当前 fork 源码目录启动，不能用 PATH 中的系统 `mcode`，也不能跳过构建：

```powershell
cd C:\DEV\develop\Talos-CLI
$env:PATH="C:\Program Files\nodejs;$env:PATH"
node -v
pnpm build
pnpm mcode
```

预期是黄色机械臂欢迎图、普通字号 `TALOS` 和中立提示文案。若看到大字 `MINIMAX CODE` 或 `MCode`，说明启动的仍是旧 `dist` 或系统安装版，不算本轮验收结果。

## 仓库与资料

远端：[PAKIKNOWLEDGE/T3rra-C0d3-Talos](https://github.com/PAKIKNOWLEDGE/T3rra-C0d3-Talos)。本地 Git 仅用于后续开发，提交与推送状态见 [status.md](docs/status.md)。

`demo/` 为可运行范本，`docs/` 为交接地图，`docs/references/` 为主人提供的游戏参考图，`tools/` 为交接检查。字体与参考图的来源及分发待办见 [design.md](docs/design.md)；这些资料不代表整个目录已有统一开源许可。
