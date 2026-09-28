# 当前状态

最后整理：2026-09-28。此页只写现在为真的事；工作方式见 [workflow](workflow.md)，可复用经验见 [lessons](lessons.md)。

## 1. 已确认

- 【文档：主人决定】Rhodes 暂时冻结，Talos 作为独立项目继续；后端改为 MiniMax Code，视觉采用 Endfield 族，外壳沿用 Tauri 2 路线。
- 【文档：主人验收】Talos demo 经疏密调整后已通过。它是给后续模型看的设计范本，不需再宏大规划或重新设计一版。
- 【实测】已将四个 demo 文件与两个字体复制进 `demo/`，六张新游戏参考图放入 `docs/references/`。搬迁不改视觉代码；快照散列见 `demo/baseline.sha256.json`。
- 【文档：主人授权】允许本地提交，不允许 push。两个仓库均已有本地提交；此前“仅初始化、不 commit”的约束已被后续授权替代。远端当前内容本轮未查询。
- 【源码】相邻 `C:\DEV\develop\minimax-code` 是引擎 fork 源码仓库；Talos 默认仍解析 PATH 中的已安装 mcode，并非自动启动该 fork 的产物。已安装 CLI 的 initialize 证据不能证明 fork 改动生效；详细边界见 [adapter](adapters/minimax-code.md)。
- 【文档：主人决定】已确认浏览器单会话闭环计划，要求运行中刷新也能继续观察同一回合；实施分五轮验收。方案与后续路线唯一正本为 [plan](plan.md)。
- 【文档：主人决定】复用引擎已有的 provider 配置功能，最终发行命令为 `talos`。原生入口是 TUI `/provider` 菜单；此前记录的斜杠 add/test/list 子命令不准确。重复浏览器向导停止使用、待清理；`mcode` 兼容别名只是候选建议，未由主人确定。
- 【文档：主人决定】主人自行更新 CLI 以对齐源码；真实探针沿用现有账号、模型及数据目录，使用独立测试 cwd。执行者不自行升级全局软件、不复制凭据。
- 【源码】已阅读 ACP 启动、会话、流式投影、取消、审批及相关运行时路径，核对源码 HEAD 未变；依据已补入 adapter。源码阅读不等于真实行为验收。

## 2. 未做与不承诺

浏览器单会话产品已建立 `src/` 服务、MiniMax ACP 适配器、WebSocket 观察桥和独立 `app/` UI，但第 4 轮主人验收失败，尚未证明真实对话闭环。第 2 轮独立探针的文本、取消、load/继续和工具证据不能替代产品验收；审批仍未触发。产品还残留 atlas 工作区、样张容量等未接线显示，撤回“产品只显示真实事实”的过度结论。Tauri 与安装包尚未实施。

### 第 4 轮已知失败（主人截图反馈，2026-09-28）

- UI 存在明显错漏；截图显示固定 `atlas-workspace`、`C:\Projects\atlas`、`/ 200K` 样张以及密集 MiniMax 文案。不是有意交付的完成态；已验收的 `demo/` 正本仍保留。
- 发送 `只回复 talos-ok，不要调用工具` 后，作业记录仅显示用户指令，状态却为“已完成”。事件页只有 `service.snapshot` revision 2–5 等摘要；快照到达不能证明模型文本已到达，丢失发生在哪一层尚未定位。
- 原“5 项单测 + 服务启动/HTTP/WebSocket 烟测通过”结论仅限这些检查覆盖的范围，不能推导完整服务生命周期、全部计划要求或 UI 对话已通过。
- 主人要求前两项先记录不修。中立引擎 fork 已由主人创建，本机源码 origin 已按指令改向该 fork；源码已确认第三方预设可保留，且已完成第一刀：provider 视图不再固定把 MiniMax 放在 custom provider 前面，19 个 targeted provider 单测和仓库 BYOK 假 provider 套件通过。已补入显式 `TALOS_NEUTRAL_RUNTIME=1` 配置闸：managed/prod 新配置不再自动种 MiniMax provider/defaultModel，已有配置不被隐式删除；默认关闭，不改变现有 upstream 语义。删除专属登录、数据隔离、厂商网络出口审计和 TUI 改造尚未实施。

【实测】2026-09-28 使用显式 `C:\Program Files\nodejs\node.exe` 重跑环境检查与 ACP 握手：Node `v24.15.0`，mcode `0.5.7`，源码 HEAD `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`；`protocolVersion: 1`，`loadSession: true`，MCP `http/sse`，prompt 的 image/audio/embeddedContext 均关闭，session capabilities 含 list/fork/resume/close，`authMethods: []`，stderr 为空。PATH 默认 Node 仍为 `v22.15.0`，低于本项目要求；README 已固定显式 Node 24 命令。该握手未创建会话、未调用模型，也未证明后续接口。

继承 Rhodes 的工作方式，不继承它的 F1–F21 待办编号、opencode HTTP 路由、配置文件、环境变量、版本范围或已验收结论。不把旧项目未完成的打包工作带成新项目的欠债。

当前交接材料可独立阅读和预览；真正接驳仍依赖本机 MiniMax 源码。字体原授权文本与游戏参考图分发范围尚未核实，见 design 的资产说明；不影响当前本地交接，但公开随包分发前需处理。

## 3. 下一会话从哪里开始

欢迎图已选择：主人认可 **03 装配机械臂**。字符正本已落入 design 引用的仓库文件，未接入 TUI；只确认图案，完整欢迎页、对话、工具及审批画面仍未验收。

两个仓库保持分工：Talos 维护 GUI 和产品文档，`C:\DEV\develop\minimax-code` 维护引擎、CLI/TUI、provider、账号与数据目录；两者通过 ACP 对接，不使用子模块。TUI 已选 A「对话流式终端」和机械臂图案，不做大字字标，见 [design](design.md#tui-设计讨论)。完整 TUI 实现前另给欢迎、对话/工具、审批三种画面范本验收。

当前入口：**纠偏收口小轮已完成并停止**。已删除重复浏览器 provider 向导、对应 POST 路由、临时 custom-provider 探针及脚本入口；原生 TUI `/provider` 仍是唯一 provider 配置路径。未运行引擎或真实模型请求。撤销“扩展同一探针到工具、取消、load”的下一步。第 4 轮 GUI 失败保留，第 5 轮继续暂停。

纠偏依据：原计划没有将“验证 fork 的具体改动”与“验证上游已有能力”分开，也没有固定构建身份与请求开销；执行随后新增重复配置入口。该探针默认找系统 mcode，`provider add --use` 先测连接，再发 ACP prompt；页面成功不能证明 fork 中立化。中立配置保留测试还把 `custom_provider` 写在了错误的 `provider` 层级。详细源码和证据限制见 adapter；这轮不修引擎行为，不让主人重复填密钥。

本机引擎提交为 `cf8bd41`（provider 排序与中立配置闸），上游基线为 `2aed5ca`；本轮工作树只读核对为干净。既有 provider/BYOK/presets 结果保留其原覆盖范围，配置测试通过不再代表正确验证了 custom provider 保留或用户数据隔离。

本轮交付：删除重复 provider 支线并更新 README、plan、workflow、status、adapter；交接检查通过（9 篇文档、59 个本地链接、20 个必需文件、demo 快照未变），diff 空白检查通过。未改引擎代码、未发送真实请求；产品 GUI 既有失败与 fork 验证缺口仍保留。

原 origin 为 `https://gh.xmly.dev/https://github.com/MiniMax-AI/minimax-code.git`，留作后续上游同步定位；已按主人指令改为 `https://github.com/PAKIKNOWLEDGE/Talos.git`，此前未增设 upstream。产品启动尚未锁定 fork 构建产物，账号与权限未切换。

非 UI 的协议、类型、探针、状态与服务检查继续由执行者自验；主人只验可见操作、视觉和需决策的产品取舍。修复获准后，先补对实际失败链路的验证，再给新的可见验收步骤；下方原第 4 轮步骤已暴露失败，当前不要求主人重复执行。

以下第 1、2 轮是历史步骤，已被执行者内部验收取代，不要求主人重跑或贴 JSON；当前下一入口仅为上面的纠偏小轮。第 4 轮步骤保留用于理解已知失败，暂停复测。操作命令的现行入口见 README。

### 第 1 轮历史验收步骤（不再执行）

前置：Windows PowerShell；当前工作树为 `C:\DEV\develop\T3rra-C0d3-Talos`；依赖已安装；不需要启动浏览器、服务、模型或登录，不会创建会话。

1. 在外部 PowerShell 执行 `cd C:\DEV\develop\T3rra-C0d3-Talos`。
2. 执行 `& 'C:\Program Files\nodejs\node.exe' 'node_modules/tsx/dist/cli.mjs' spike/check-environment.ts`。预期输出 `ok: true`、Node `v24.15.0`、mcode `0.5.7`、`failures: []`。
3. 执行 `& 'C:\Program Files\nodejs\node.exe' 'node_modules/tsx/dist/cli.mjs' spike/initialize.ts`。预期先出现 `phase: environment`，随后 `phase: initialize`；`protocolVersion` 为 `1`，`agentInfo.version` 为 `0.5.7`，`loadSession` 为 `true`，MCP 的 `http/sse` 为 `true`，prompt 的 image/audio/embeddedContext 均为 `false`，session capabilities 含 list/fork/resume/close，`authMethods` 为空，`stderr` 为空。
4. 确认没有创建 sessionId、没有模型回复、没有写入测试目录；这正是第 1 轮的预期边界。

验收通过请回复：**第 1 轮通过，推进**。若不通过，请贴出失败命令和完整 JSON；我会先修复第 1 轮，不进入第 2 轮。后续每轮交付都会沿用“前置条件 → 启动命令/入口 → 3–5 个动作 → 每步预期 → 机读结果 → 通过/推进回复格式”。

### 第 2 轮历史验收步骤（不再执行）

前置：第 1 轮已通过；Windows PowerShell；外部终端使用支持的 Node 24；允许使用现有 MiniMax 账号/模型；脚本会在 `.talos/round2-*` 创建并清理可丢弃 cwd，不启动浏览器或产品服务。

1. 执行 `cd C:\DEV\develop\T3rra-C0d3-Talos`。
2. 执行 `& 'C:\Program Files\nodejs\node.exe' 'node_modules/tsx/dist/cli.mjs' spike/session-probe.ts`。
3. 看到 `phase: conversation`：预期 `normal.stopReason` 为 `end_turn`，`cancel.stopReason` 为 `cancelled`，并有 `agent_message_chunk` 计数；stderr 为空。
4. 看到 `phase: load`：预期 `loadResponseKeys` 只有 `modes`、`configOptions`，回放包含 user/agent 消息，`continuation.stopReason` 为 `end_turn`。
5. 看到 `phase: approval-deny` 与 `approval-allow-once`：当前预期 `permissionRequests: []`、`fileExists: true`、`fileContent: acceptance-ok`；这表示权限规则未触发审批，不是审批通过。最后看到 `phase: complete`，脚本会清理临时文件。

第 2 轮通过回复：**第 2 轮通过，推进**。若正常/取消/load 失败，请贴出对应完整 JSON；若只是不出现审批，请按“权限未触发”反馈，不要把它写成通过。审批专项会在证据明确后单独复测。

Tauri、Windows 工作区/进程、扩展能力和安装发布均在 plan 第二部分列出规划入口，尚未授权实施或定完细节。复杂节点的 Astra 提示及复核规则见 workflow，不得把未来候选当成本轮待办。

【实测】2026-09-28 以显式 Node `v24.15.0` 启动 `src/dev.ts --cwd .talos/product-cwd`：MiniMax ACP `0.5.7` 子进程成功建立，产品输出 `http://127.0.0.1:5193/`，`GET /health` 返回 `{"ok":true}`，产品入口返回 HTTP 200。此前 `minimax-acp.ts` 的运行时导入错误已修复并通过类型检查与 5 项 Round 3 单测。

### 第 4 轮主人验收步骤

前置：使用外部 PowerShell；支持的 Node 24 已安装；保留现有 MiniMax 登录、模型与权限；准备一个可丢弃的绝对工作目录。不要关闭启动服务的终端。

1. 执行：`cd C:\DEV\develop\T3rra-C0d3-Talos`，再执行 `New-Item -ItemType Directory -Force .talos\product-cwd | Out-Null`。
2. 执行：`& 'C:\Program Files\nodejs\node.exe' 'node_modules\tsx\dist\cli.mjs' src\dev.ts --cwd 'C:\DEV\develop\T3rra-C0d3-Talos\.talos\product-cwd'`。预期看到产品 URL、工作目录和 `MiniMax ACP: 0.5.7`。
3. 打开 `http://127.0.0.1:5193/`。预期仍是已验收范本的浅灰顶栏、石墨阅读区、黄色主操作和右侧概况；页面显示“当前会话 · 已连接”。
4. 输入 `只回复 talos-ok，不要调用工具` 并发送。预期看到自己的指令、MiniMax 的真实回复，运行中按钮切换为“正在停止”，完成后恢复可发送状态。
5. 请求一段较长回复，在输出中刷新页面。预期同一回合继续显示且历史不重复；点“事件”可看到本页收到的服务摘要，点工具记录可查看引擎实际返回的状态/路径/输入/输出。

本轮可见验收通过请回复：**第 4 轮通过，推进**。若页面打不开、视觉回归或发送/停止/刷新行为不符，请只描述具体动作与可见结果；内部协议和类型问题由执行者自行修复。

## 4. 验收账

| 范围 | 机读 | 主人验收 |
| --- | --- | --- |
| Talos 视觉与疏密调整 | 既有 demo 检查通过；迁移后另复核 | 本会话明确“通过” |
| 新目录交接 | 【实测】既有检查通过：43 个唯一 ID、42 处引用、4 项本地资源、JS 语法；6 个 demo 文件与搬迁源 SHA-256 一致。新增计划后的文档检查结果见下一行 | 首次冷启动已完成阅读，必需材料可读；未重复做目视验收 |
| 计划与接驳文档收口 | 【实测】两项检查通过：9 篇文档、52 个本地链接、20 个必需文件；demo 结构/资源/JS 检查通过，SHA-256 快照未变。已补充源码证据；第 1、2 轮证据及第 3 轮内部实现已落盘 | 浏览器计划已获实施指令；未来阶段未授权实施 |
| 两仓库接手地图与路线收口 | 【实测】Talos `python tools/check-handoff.py` 通过；引擎 `pnpm check:source` 通过（4276 files，公开源码清单与 workspace exports 完整）；两仓库仅改文档，未改引擎代码 | 【执行者自验】职责、ACP 边界、无子模块约束和下一入口已写入双方文档；不代表中立化、TUI 或 GUI 已验收 |
| 平级 provider 与默认配置闸 | 既有配置回归 5/5、provider/BYOK/presets 等检查通过；已提交 `cf8bd41`，未 push。复核发现保留 custom provider 的测试数据层级错误，需另轮纠正 | 仅保留排序和配置闸有限结论；不证明真实 custom provider 保留、无旧凭据读取或独立发行 |
| 重复 provider 支线 | 已删除浏览器表单、POST 接口、临时配置探针和脚本入口；保留 Git 历史可恢复；未发真实请求 | 原生 TUI `/provider` 为唯一配置路径；不再作为主人验收入口 |
| 真实 custom provider 文本 | 【主人反馈】`https://api.xiaomimimo.com`、`mimo-v2.6-flash`、`openai-completions`；页面曾显示连接成功和 `talos-custom-ok` | 只保留当时路径的成功反馈；fork 构建身份、准确 token 用量、账号隔离及完整独立运行均未证明，不要求重复测试 |
| 第 1 轮：环境、证据与握手 | 【实测】显式 Node 24 下 `check:env` 与 `spike:initialize` 通过；获得真实 ACP v1 握手，stderr 为空；未创建会话、未调用模型 | 主人提供成功输出并已授权推进 |
| 第 2 轮：真实单会话探针 | 【实测】真实 new/prompt 流式、cancel、跨进程 load/继续、tool_call/tool_call_update 通过；审批两种尝试均未触发 permission request，临时文件直接写入并清理 | 【执行者自验】内部闸通过；审批专项保留未触发限制 |
| 第 3 轮：应用核心与本地服务 | 【实测】TypeScript 通过；Vitest 5 tests passed；覆盖工具部分更新、旧进程代次隔离、operationId 去重、观察者断开和 WebSocket 快照 | 【执行者自验】内部闸通过；进入第 4 轮 UI 接入 |
| 第 4 轮：沿范本接入界面 | 既有类型、5 项单测及启动烟测通过；未覆盖本次消息缺失与 UI 错漏，不能据此宣称闭环完成 | **失败**：回复不可见、UI 错漏；主人要求本轮只记录，先评估 fork |
| MiniMax 接驳 / 浏览器产品 / 桌面 / 发布 | 浏览器实现未完成可见闭环；Tauri、桌面生命周期和发布仍未实施 | 浏览器第 4 轮失败；桌面与发布未验收 |

收到验收反馈直接更新对应行，失败原因和保留限制写在本页，不另生一份竞争清单。机读结果不得自动升级人工验收。

## 5. 决定

| 日期 | 决定与依据 |
| --- | --- |
| 2026-09-28 | 主人：Rhodes 暂冻结，Talos 独立项目，MiniMax Code 后端与 Endfield 族；沿用成熟工作流 |
| 2026-09-28 | 主人：demo 小改疏密后通过；定位为后续模型的范本，不继续扩张视觉任务 |
| 2026-09-28 | 主人：新远端保持空；本轮只整理正式本地目录、经验和文档，供无上下文会话接手 |
| 2026-09-28 | 主人澄清：交接要画地图，使接手者自主阅读和判断；重点是不重复踩坑及复用开发、验收、文档流 |
| 2026-09-28 | 主人选择浏览器单会话闭环作为本阶段终点，要求运行中刷新不断流；由主人更新 CLI，测试沿用现有引擎配置 |
| 2026-09-28 | 主人要求实施已确认计划，按第 1 轮起步、逐轮验收；随后要求先落盘当前计划与 Tauri 等未来路线，在复杂规划节点标注“此处可能需要 Astra 把关” |
| 2026-09-28 | 主人将非 UI/非直观使用层面的验收交由执行者判断；UI、实际操作和视觉仍需主人验收 |
| 2026-09-28 | 主人选择两个相邻仓库保持独立、先 TUI 再 GUI、首版自带密钥与本地工具；TUI 采用对话流，欢迎图从游戏元素绘制 ASCII，拒绝大字字标。机械臂图案方向已确认，完整画面仍待验收 |
| 2026-09-28 | 主人确认 Talos GUI 仓库与 `PAKIKNOWLEDGE/Talos` 引擎 fork 的两仓库路线；本轮完成职责、ACP 边界、同步规则和下一入口文档整理，未改引擎代码 |
