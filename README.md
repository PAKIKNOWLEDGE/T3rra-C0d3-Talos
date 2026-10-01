# T3rra-C0d3-Talos

**操作索引，不是待办清单。** 只运行status当前任务需要的命令；后文已完成探针不应逐项重跑。当前修复入口见 [plan](docs/plan.md#待主人确认及平台验收)，源码/安装/用户验收结果统一见status。

Talos 由两个仓库组成：这里维护 GUI 和产品文档；相邻 `C:\DEV\develop\Talos-CLI` 维护 mcode fork 的引擎与终端界面。项目现状只看 [status](docs/status.md)，往后做什么看 [plan](docs/plan.md)。本页仅作操作手册，不是要依次执行的任务清单。

接手先读 [AGENTS.md](AGENTS.md) → [status.md](docs/status.md)。开发与文档协作方式见 [workflow.md](docs/workflow.md)。

按用途选入口：[TUI 欢迎 ASCII 标题](#tui-欢迎-ascii-标题验收)、[TUI Talos 主题](#tui-talos-主题验收)、[GUI 网页 demo](#本地预览)、[未验收浏览器产品](#浏览器产品入口)、[内部检查](#当前机读检查)。真实请求可能消耗模型额度，不作例行检查。

## CLI 预览版的搜索限制

当前没有默认联网搜索服务。主对话保留自配 MCP 的接线，但本项目尚未验证真实搜索；Explore/Verifier 内置子代理暂不具备网络搜索。`/provider` 配置的是对话模型，`/mcp` 目前只查看状态，不是搜索配置界面。不要将模型自身知识或未经联网验证的回答当作搜索结果。

首次 npm 发行按 CLI 预览版准备。默认中立搜索、便捷配置和子代理搜索适配属于首发后的独立工作；正式发行说明必须保留上述限制。发行边界见 [plan](docs/plan.md#首次-npm-预览版与搜索后置)，当前结果见 [status](docs/status.md)。

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

### TUI 内部回归检查

在相邻引擎仓库使用支持的 Node 24 运行整个 `tui-app` 文件：

```powershell
cd C:\DEV\develop\Talos-CLI
& 'C:\Program Files\nodejs\node.exe' node_modules/vitest/vitest.mjs run --config vitest.oss.config.mjs packages/tui/test/unit/tui-app.test.ts
```

这是使用假 runtime 的离线技术检查，不发送真实模型请求。测试显式指定语言，包含中英文历史界面用例；执行者检查所有用例通过且没有跳过。此类测试维护没有新的界面行为，不要求主人重新配置模型或手工验收。实际结果见 [status](docs/status.md)。

### Provider 配置：复用原生 TUI

本轮验收必须从 `C:\DEV\develop\Talos-CLI` 构建并启动 fork，不使用 PATH 中的系统 `mcode`：

```powershell
cd C:\DEV\develop\Talos-CLI
$env:PATH="C:\Program Files\nodejs;$env:PATH"
pnpm build
if ($LASTEXITCODE -ne 0) { throw 'Build failed; do not launch stale dist.' }
pnpm talos
```

进入 TUI 后输入 `/provider`。列表顶部应有 `+ Add provider`；按 Enter、Space 或 `a`，应进入既有官方 provider 预设列表，并能看到 `Custom provider`。MiniMax 可以作为一个 provider 预设存在，但不能再是唯一的新增入口。Talos 新构建默认使用用户 home 下的 `.talos`（带 profile 时为 `.talos-<profile>`）；旧 `.minimax` 中的配置和密钥不会自动导入，因此首次启动可能需要在 `/provider` 重新配置。测试保存可能调用模型。要在可丢弃目录中验证，可先在同一终端设置 `$env:MINIMAX_DATA_DIR='C:\path\to\disposable-talos-data'`，再启动 `pnpm talos`；显式目录优先于默认 `.talos`。

这里验收的是 Talos fork 的原生 TUI 入口，不是浏览器配置页；`provider add/test/list` 仍是 CLI 子命令。重复的浏览器配置页和 custom-provider 探针停止使用，代码清理状态见 [status](docs/status.md)。

### 预设目录中立出口自验

本轮改变的是预设目录的网络请求目标，界面没有新增可供目视判断的行为。主人无需进入 `/provider`、断网、抓包或消耗模型请求。Luna 已用注入 fetch 的离线测试核对：Talos 中立模式直接请求 `models.dev`，不请求 MiniMax 目录和排序服务；直连失败仍读取本地预设快照。定向测试 39/39、类型、构建、源码清单和新产物启动检查通过。其他云功能出口尚未包含在这一轮。

### 自动遥测中立化自验

当前 Talos 中立模式禁用上游使用统计、性能指标与自动故障诊断上传，即便配置中这些开关为 true。本地诊断仍保留；此处不覆盖用户主动 `/feedback` 或其他云功能。执行者已用假网络和临时合成配置验证，无需主人查看 JSON 或手动改配置。

复验内部回归时在相邻引擎仓库运行：

```powershell
cd C:\DEV\develop\Talos-CLI
& 'C:\Program Files\nodejs\node.exe' node_modules/vitest/vitest.mjs run --config vitest.oss.config.mjs packages/tui/test/unit/business-telemetry-privacy.test.ts packages/tui/test/unit/incident-reporter-privacy.test.ts packages/local-runtime/test/unit/metrics-telemetry-privacy.test.ts packages/local-runtime/test/unit/error-reporting-privacy.test.ts
```

新构建的 `telemetry status` / `telemetry preview` 显示实际阻断原因；preview 不发送请求。在已指定可丢弃数据目录的同一终端可运行 `& 'C:\Program Files\nodejs\node.exe' dist/cli.js telemetry preview`，预期三通道 `enabled:false`、阻断原因 `TALOS_NEUTRAL_RUNTIME` 和 `request:null`。内部结果与边界见 [status](docs/status.md)。

### 上游反馈退役验收

前置：关闭旧 TUI，使用本轮已经构建的 fork 产物。此验收不需要登录、配置模型或发送模型请求；在外部 PowerShell 启动：

```powershell
cd C:\DEV\develop\Talos-CLI
pnpm talos
```

1. 欢迎区不再推荐 `/feedback` 上传；原字标、三六边形标识和布局保持原样，可看到 `/doctor` 本地诊断提示。
2. 输入 `/feedback`：预期显示 `Upstream feedback upload is unavailable in Talos`，说明不会上传报告或诊断附件；不打开登录网页或确认面板。
3. 输入 `/feedback test`：预期同一不可用说明，没有模型回复，输入框仍可使用。正常退出即可。

内部网络阻断由执行者自验，不要求主人抓包或查看 JSON。结果见 [status](docs/status.md)。

### 插件来源中立化验收

前置：关闭旧 TUI，使用本轮已构建的产物；不需要登录或请求模型。在外部 PowerShell 启动：

```powershell
cd C:\DEV\develop\Talos-CLI
pnpm talos
```

1. 输入 `/plugins`：应打开插件管理页，说明为本地插件，不要求 MiniMax 登录、不加载上游市场。
2. 顶部只出现 All Plugins、Installed、Local；按 Tab 可在三者间循环，不出现 MiniMax Official。没有本地插件时显示 `No matching plugins` 是正常空态；这里不要求安装测试插件。
3. 按 Esc 返回聊天，输入框仍可用；正常退出即可。

内部已验证本地列表、安装/启停/移除/刷新仍使用原有 Runtime；厂商云 transport、身份 scope 和下载被阻断。GitHub 来源解析使用独立网络路径，实际 GitHub 安装与自配 MCP 真实连接未在本轮验收；不需要主人花模型请求。技术结果见 [status](docs/status.md)。

### 内置云工具退役自验

Talos 中立模式不再提供厂商 Matrix 默认搜索/媒体工具或激活 mcode-tools；模型需要网络搜索时可由你显式配置 MCP。本地文件/Shell 工具、审批与自配 MCP 保留。此轮是内部能力边界验证，不要求主人反复打开 MCP 页或发送付费请求。

执行者复验离线回归：

```powershell
cd C:\DEV\develop\Talos-CLI
& 'C:\Program Files\nodejs\node.exe' node_modules/vitest/vitest.mjs run --config vitest.oss.config.mjs packages/tui/test/unit/mcode-tools-integration.test.ts packages/local-runtime-v2/src/service/mcp/runtime/builtin-matrix.test.ts packages/local-runtime-v2/test/integration/mcp/local-mcp-public-facade.integration.test.ts packages/local-runtime-v2/test/integration/mcp/project-mcp.integration.test.ts packages/local-runtime/test/unit/local-native-tools.test.ts
```

网络使用假客户端，配置使用临时目录；Windows 的 POSIX socket 路径测试跳过属平台限制。内置程序的不可用反馈已由执行者核对。日常仍使用 `pnpm build` 和 `pnpm talos`，未引入新的启动方式；当前分发产物仍包含厂商资源，清理安排见 [status](docs/status.md)。

### 权限检查按宿主平台运行

Windows 日常继续使用 `pnpm build`、`pnpm talos`。本问题不要求安装 WSL；Git Bash 能执行 shell，但启动的 Windows Node 仍是 win32，不能代替 Linux/macOS 的文件权限和路径验证。

引擎已有平台分派。执行者在 `Talos-CLI` 根目录先查看适用检查，不直接拿整个 POSIX policy 文件当 Windows 必过闸：

```powershell
pnpm verify --list
pnpm verify --profile windows --list
```

`test:windows` 保留原 Windows source-contract，权限现有独立正式入口 `test:windows-policy`，已自动接入 Windows verifier。执行者在支持的 Node 环境复跑：

```powershell
cd C:\DEV\develop\Talos-CLI
$env:PATH="C:\Program Files\nodejs;$env:PATH"
node -v
pnpm test:windows-policy
```

预期为 Windows 适用公共权限与 native delete 用例通过；POSIX 回收/真实chmod/专属路径用例按原生宿主条件跳过，打印跳过数而非冒充通过。没有 `-t` 过滤、stat mock 或复制测试文件；在非Windows调用该命令直接报平台错误。当前结果与未验证范围见 [status](docs/status.md)。实际计数以 status 为准；主人无需手动验收或请求模型。

原 `test:windows` 卷检查与旧安装器失败仍单列待复核；新权限闸通过不等于它们已解决，也不代表全平台或整库验证通过。完整 verify 中源代码导出要求已提交且干净的跟踪工作树，当前大量未提交修改应先使用适用的独立检查，不为运行 verify 自动提交或丢弃改动。

另一台类 Unix 机器的验证在后续交接时进行，**当前不要求主人操作**。以下是通用说明，实际待验源码快照及校验材料尚未生成。先取得同一份经审查的源码快照（包含待验修改）、锁文件及版本/校验记录，确认本机 Node 与项目 engines 匹配、工作区支持原生文件权限，并在该机重新准备依赖；不复制 Windows 的 node_modules 或 dist。届时在引擎根目录运行：

```sh
uname -srm
node -p "JSON.stringify({platform:process.platform,arch:process.arch,node:process.version})"
pnpm --version
pnpm verify --list
pnpm test:policy
```

报告 OS/架构、源码身份、命令退出码和完整失败信息，由 Luna 解读。Linux 结果不代表 macOS/Seatbelt 验证，反之亦然；要发布相应平台还需完成其余适用的构建/安装与验证闸，单项 policy 通过不等于发行通过。未连接远端前，本地 Windows 纠偏和开发仍可继续。

### 中立权限分类说明

当前 neutral 模式不发送上游权限云分类请求。Auto 继续依据本地规则与安全检查判断，无法判定的操作请求确认；不自动切换到 Full access。规则允许/拒绝、危险操作保护及审批回复仍使用既有实现。独立网络阻断由执行者离线验证。

若要看说明，关闭旧 TUI 后使用本轮已构建产物（支持的 Node 24）：

```powershell
cd C:\DEV\develop\Talos-CLI
pnpm talos
```

1. 输入 `/permission` 打开权限模式面板，预期仍有 Ask、Auto、Full access。
2. 在足够宽的终端查看 Auto，说明为 `Local checks; confirm uncertain actions`，表示本地检查、未知确认，不承诺云端自动审批。
3. 按 Esc 关闭即可；无需切换模式或发送工具/模型请求。原选择不变。

技术结果见 [status](docs/status.md)。此前在 Windows 直接运行 POSIX policy 文件的失败清单，需先按上述宿主平台分工归因。对应发行平台的权限检查必须通过；不能把该清单全算产品缺陷，也不能把未验平台算通过。

### npm 更新（尚未接入）

当前没有可供使用的 Talos npm 升级命令；请继续使用上方本地源码构建入口。重新构建 fork 后，`talos update` 与 TUI `/update` 只显示“此构建尚未配置 Talos npm 更新源”，不会检查或安装更新。可以用以下命令检查刚构建产物的反馈：

```powershell
cd C:\DEV\develop\Talos-CLI
& 'C:\Program Files\nodejs\node.exe' dist/cli.js update
```

预期输出包含 `no Talos npm update source configured` 和 `Talos does not install updates automatically`。确定正式包名并交付检测器后，本节再写入准确的手动 npm 安装命令。路线见 [plan](docs/plan.md#npm-发行与版本提醒)，现状见 [status](docs/status.md)。

可见验收只需三步，不需要模型凭据或请求：

1. 关闭旧 TUI，在 `C:\DEV\develop\Talos-CLI` 按上面的 Node 24 流程运行 `pnpm build`，确保启动的是新产物。
2. 运行上方 `dist/cli.js update` 命令；预期只打印未配置 Talos npm 更新源及不会自动安装的提示，退出码为 0。
3. 运行 `pnpm talos`，在 TUI 输入 `/update`；预期对话区出现相同含义的状态，不打开安装确认面板、不退出或重启。正常退出 TUI 即可。

### MiniMax 专属登录退役验收

前置：关闭旧 TUI，在 `C:\DEV\develop\Talos-CLI` 使用上方 Node 24 命令重新构建并启动 `pnpm talos`。可以使用现有 `.talos` 配置；以下步骤不要求发送模型请求，也不要求输入 API Key。

1. 输入 `/provider`：应看到平级的 MiniMax、其他官方预设和 Custom provider；已配置连接中不应出现 `MiniMax OAuth` 或 Token Plan 行。MiniMax API Key 仍可作为普通 provider 配置。
2. 返回主界面，打开 `/` 命令列表：不应推荐 `/login`、`/logout`、`/checkin`。
3. 手动输入 `/login` 和 `/checkin`：应得到可见的不可用提示，不弹出 MiniMax 授权网页；输入 `/logout` 也应提示由 `/provider` 管理模型。
4. 在另一个 PowerShell 窗口先进入 `C:\DEV\develop\Talos-CLI`，运行 `& 'C:\Program Files\nodejs\node.exe' dist/cli.js --help`：帮助中不列登录/登出；运行同一命令加 `login` 或 `acp login` 应显示 `/provider` 提示并以错误码退出。

预期体验：Talos 不再要求 MiniMax 账号；用户从 `/provider` 选择并配置模型，MiniMax 只是可选的 API Key provider。此处只验入口与提示，不测试模型连接或第三方 OAuth 登录。

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

## 只读更新构建边界检查

这是内部检查，无需主人配置 provider 或发送消息。固定受支持的 Node 后，在引擎仓库执行：

```powershell
cd C:\DEV\develop\Talos-CLI
$env:PATH="C:\Program Files\nodejs;$env:PATH"
pnpm test:release-tools
pnpm check:source
pnpm build
pnpm check:standalone
node dist/cli.js update
```

预期：真实 CLI/TUI 只读入口被构建；旧更新安装链进入输入图时检查拒绝。最后的命令只输出更新来源未配置和不自动安装，不启动安装器。检查结果与剩余失败见 status。

## 源码主流程离线回归

这是执行者的内部检查，主人无需配置模型、提供凭据或查看JSON。前置：引擎当前源码已构建，使用受支持Node；测试只启动临时本地fake provider和合成工作区。

```powershell
cd C:/DEV/develop/Talos-CLI
$env:PATH="C:/Program Files/nodejs;$env:PATH"
pnpm exec vitest run --config vitest.oss.config.mjs --maxWorkers 1 packages/agent-tools/test/desktop/local-bash-output.test.ts
pnpm test:smoke
pnpm test:byok
pnpm typecheck
pnpm check:source
```

预期：smoke验证启动和默认数据隔离；BYOK必须完整运行到回复、历史继续和真实文件读取回传，未配置模型不能回退；工具输出验证真实宿主命令、输出完整性及退出码。外网禁止，公开目录只在测试内返回离线响应，厂商服务请求为零。平台跳过与当前结果只见status，不以这些检查替代审批、Windows取消或用户UI验收。

## ACP审批取消与恢复的离线检查

内部验证，不需要主人配置模型、改权限或发送消息。使用当前fork源码构建及受支持Node，在CLI仓库运行：

```powershell
cd C:/DEV/develop/Talos-CLI
$env:PATH="C:/Program Files/nodejs;$env:PATH"
pnpm test:byok
pnpm typecheck
pnpm check:source
```

完整BYOK文件包含原第三方对话闭环和新增真实SDK/stdio状态闭环；预期审批拒绝不写、引擎提供的临时批准实际写入合成内容，运行中/待审批取消得到权威终态，新进程load保持原cwd和单份历史并可继续。所有模型响应来自临时loopback假provider，外网被拦截，只清理测试自身进程/目录。POSIX信号专属用例在Windows明确跳过；异常崩溃及终端操作仍须另行验证，结果以status为准。

## 引擎异常退出与恢复的定向检查

内部检查，仅强制结束测试自己创建的引擎进程；不操作用户服务。使用已构建的当前CLI源码产物及Node24：

```powershell
cd C:/DEV/develop/Talos-CLI
$env:PATH="C:/Program Files/nodejs;$env:PATH"
node --test --test-name-pattern="ACP real Runtime" test/byok.test.mjs
pnpm exec vitest run --config vitest.oss.config.mjs --maxWorkers 1 packages/tui/test/unit/acp-agent.test.ts -t "fails a pending permission closed|cancels a stale ACP permission|closes the connection when terminated Client|fails a cancelled load immediately"
pnpm typecheck
pnpm check:source
```

预期：运行中旧prompt随进程退出拒绝，新进程将遗留回合记为失败并释放占用；原cwd加载历史单份，不自动重发中断指令，下一条新指令可以完成，旧失败记录保持不变。四项过滤单测证明关联竞态处理逻辑，其余未选中不计通过；工具进程树和终端信号未由此验证。恢复定位文件与SQLite检查均使用临时合成数据，不需要主人提供凭据。

## 主题与语言失败组的定向回归

仅用于status F1/F2。使用受支持Node，在CLI源码根运行既有六文件；保留现有超时与断言，不运行真实模型。初次确认当前失败后，修复再复跑同一组；不将这条命令扩成全库扫描。

```powershell
cd C:/DEV/develop/Talos-CLI
$env:PATH="C:/Program Files/nodejs;$env:PATH"
pnpm exec vitest run --config vitest.oss.config.mjs --maxWorkers 1 packages/tui/test/unit/tui/theme/custom-themes.test.ts packages/tui/test/unit/tui/theme/palettes.test.ts packages/tui/test/unit/tui/theme/runtime.test.ts packages/tui/test/unit/tui/features/settings/theme-picker.test.ts packages/tui/test/unit/tui-session-history-flow.test.ts packages/tui/test/unit/tui-session-mutation-panels.test.ts
```

预期验证实际默认/兼容/取消恢复与指定语言的历史操作；不接受单纯删除失败断言。语义与视觉要求见plan，真实结果只在status更新。

## 文案失败组的定向回归

用于status F3，先核对实际行为再修断言。

```powershell
cd C:/DEV/develop/Talos-CLI
$env:PATH="C:/Program Files/nodejs;$env:PATH"
pnpm exec vitest run --config vitest.oss.config.mjs --maxWorkers 1 packages/tui/test/unit/acp-agent.test.ts packages/tui/test/unit/headless-runner.test.ts packages/tui/test/unit/tui-terminal-presentation.test.ts packages/tui/test/unit/tui/controller/product/chrome-flow.test.ts packages/tui/test/unit/tui/controller/product/feature-flow.test.ts
```

保留能力、错误返回、状态序列和安全拒绝强度，不恢复旧登录、不盲改协议标识。实际结果只记status；纯测试修改不例行构建或重跑已完成探针。

## 平台路径失败组的定向回归

仅用于status F4，固定受支持Node，真实宿主运行两个既有文件：

```powershell
cd C:/DEV/develop/Talos-CLI
$env:PATH="C:/Program Files/nodejs;$env:PATH"
pnpm exec vitest run --config vitest.oss.config.mjs --maxWorkers 1 packages/tui/test/unit/observability.test.ts packages/tui/test/unit/wsl-attachment-paths.test.ts
```

期望按对应平台的真实路径/调用语义校准，保留WSL转换失败与无多余子进程检查。无需主人安装WSL。当前结果只记status，不能把Windows上的夹具验证说成Linux实测。

## 本地候选准备与包验证（未发布）

正式name/scope及版本先由主人确认。当前保留的@talos-local-fixture/cli包仅用于演练，**禁止发布**；root开发workspace private保护不变。以下命令是准备/验证入口，不包含npm publish或Git推送：

```powershell
cd C:/DEV/develop/Talos-CLI
$env:PATH="C:/Program Files/nodejs;$env:PATH"
$env:TALOS_NPM_PACKAGE_NAME="<主人确认的实际包名>"
$env:MCODE_RELEASE_TAG="v<与root及TUI一致的确认版本>"
pnpm build
node scripts/package-cli-release.mjs $env:MCODE_RELEASE_TAG "<仓库外候选目录>" --publishable
$env:MCODE_RELEASE_ARCHIVE="<生成的归档绝对路径>"
$env:MCODE_VERIFY_REPORT_DIR="<仓库外检查回执目录>"
pnpm verify --profile package
```

不传--publishable时manifest默认private，不能发npm且不自动查询更新；传入该flag也只是准备产物，不是发布授权。候选stage保留许可并排除已退役cloud入口资源。package profile使用隔离前缀和fake home，实际安装/launcher/native/核心回归、重装、卸载；Windows已登记到该profile。网络仅用于公开依赖下载，模型响应始终来自loopback夹具。

可选两版本验证设置TALOS_VERIFY_UPGRADE_ARCHIVE及TALOS_VERIFY_UPGRADE_VERSION，必须有对应.sha256；不得把同版重装说成升级。TALOS_VERIFY_UPDATE_PRELOAD只供执行者使用受控假registry验证安装后的只读更新命令，不用它伪造线上结果。当前演练材料和README存放在忽略目录 .talos/release-candidates/763566c，实际提交/覆盖见status。

另一类Unix主机：先确认uname -srm、node -v、pnpm -v，复制同版源码及checksum，在新目录准备其本机依赖，运行现有适用verify/policy和候选包验证；不复制Windows node_modules/dist、不需要WSL。当前源码快照是763566c，后续正式版本应重新导出准确基点。

## 最后用户验收的动作与预期

前置：正式包身份已确认，安装/技术检查由执行者完成；新增可见提醒需提供准确当前候选与受控假新版来源，不要求主人重新填API key。

1. 从当前CLI仓库用pnpm build和pnpm talos启动源码版 → 已验收的Talos主题、字标和入口应保持。
2. 输入/update → 源码或private候选说明未配置发行更新来源，不开始安装、不退出TUI。
3. 在执行者准备的发行候选假新版预览中启动 → 提醒异步显示，可继续输入、不抢焦点；这是受控预览而不是线上新版。
4. 输入/update → 显示精确包名、版本及手动npm命令；提示本身不下载安装或重启。缩窄终端后详情仍可通过/update查看。
5. 退出 → 进程按原行为结束；源码版不自动检查占位包。真实registry与正式npm安装在主人发布后另验，不把假新版当已发布证明。

步骤3的具体预览启动命令必须随正式候选身份给出，目前没有要求主人操作未准备的预览。当前未发布占位包，也未声称新增提醒已目视验收。

## 当前具名CLI验收

修复候选为@pakiknowledge/tal0s-code 0.5.7，源码4e9f1ba；尚未发布，不代表首发版本决定。使用现有.talos配置，不复制密钥。普通入口直接运行已安装包，保留调用终端cwd与PATH，不经过旧cmd包装。启动默认不修改用户PATH或shell配置；模型工具目录只加到当前进程。

先完全关闭旧终端窗口，再从开始菜单重新打开PowerShell；若仍继承旧环境，完全退出Windows Terminal或其宿主应用后重开。不要在旧终端仅开新标签页。


```powershell
cd C:/DEV/develop/T3rra-C0d3-Talos
& "C:/DEV/develop/T3rra-C0d3-Talos/.talos/acceptance/pakiknowledge-4e9f1ba/01-launch-talos.ps1"
```

1. 在新终端先运行git --version和python --version → 两个命令均可发现；技术侧已检查，不需要购买模型请求复核。
2. 切换到你希望Talos工作的目录，再执行普通入口 → 欢迎页及现有provider可用，工作目录就是调用时的目录。
3. 打开/provider查看后Esc返回，再正常退出 → 不要求重新保存模型配置，不自动发送消息。保存provider仍会影响已有.talos配置。

旧01-launch-talos.cmd已退役，会提示新入口；旧测试文件_conn_test.txt仍保留。假新版0.5.8提示已获主人验收通过，不重复验收，也不要执行预览中的npm升级命令。

入口缺失时，在GUI仓库运行python tools/prepare-cli-acceptance.py重新生成；不会安装包或复制密钥。

### 系统 PATH 修复与恢复

备份及清单位于忽略目录.talos/environment-recovery。恢复命令为python tools/recover-test-path.py --restore，只在当前PATH与修复结果一致时执行，避免覆盖后来设置。恢复会重新加入旧污染条目，不是普通验收步骤。

清理预览使用python tools/recover-test-path.py，实际写入需--apply；仅匹配已识别的测试目录，不删除文件。引擎默认不再持久化shell PATH；仅明确设置TALOS_ENABLE_SHELL_PATH_INTEGRATION=1才启用原有集成。npm的talos命令与进程内工具目录不依赖该设置。
