# Talos 路线与当前方案

本页只讲往哪里走和本轮如何做；实际进度、验收与授权以 [status](status.md) 为准。先保存现有源码的本地 WIP 恢复点，再核验和修复；测试失败不阻止保存。当前小轮以 status 为准，不开展路线表的新功能。未来路线不自动生成执行任务，完成一个小轮后停在对应验收点。

## 当前发行路线（Astra复核）

2026-10-01收紧：目标仍是Talos CLI预览版，保留已验收TUI，GUI暂停。源码运行、源码验收与npm发行是不同里程碑；不再把测试失败数当剩余功能数，也不按一个断言拆一轮。下方历史方案仅供追溯，status与本节是当前入口。

| 交付块 | 必须拿到的结果 | 范围与停止点 |
| --- | --- | --- |
| A. 可验收的CLI源码基线 | fake provider配置、回复、工具结果与历史恢复的实际证据；默认数据隔离和权限保证保留 | 先完成下一小轮。随后将旧品牌/语言/主题及宿主夹具按契约集中校准；已退役更新器不修活。发现生产缺陷按真实因果定位，不扩大为重做TUI或实现替代云功能 |
| B. Talos自己的可安装候选包 | 单一包身份/版本/bin；厂商资源与依赖许可清单；受支持Windows临时prefix安装、启动、离线对话、升级和卸载；自己的只读新版提醒 | 复用现有构建/打包工程，纠正上游manifest和平台假设；包名/版本向主人确认，不能推断npm scope。网络依赖获取如有需要单独说明，模型调用不是安装验证前提。保留类Unix原生权限另机验证，不安装WSL |
| C. 发布候选验收 | 同一候选源码/包的适用检查结论、文档与限制说明、主人看到明确可用的CLI体验 | 集中跑发行适用检查，解决剩余阻塞后由主人发布；不以预览版豁免权限/隔离/许可/安装。未验证平台不宣传支持，平台范围变化须主人确认 |

A/B/C是交付块而非承诺只需三轮或预估工期。不得为了检查全绿重建MiniMax登录、默认provider、旧安装器或云工具；也不得把真实核心/平台失败全部叫作旧测试。源码改动前保留本地Git基点，失败也WIP保存。搜索后置、GUI/Tauri暂停、手动npm升级等已有决定不变。

## 下一小轮：源码主流程离线验收

任务 cli-core-acceptance/r1。替换上一入口的“单独修主题测试”。Luna自主执行，无需Astra再写实现计划。

- 复用现有 test/smoke.test.mjs、test/byok.test.mjs 及本地假provider/网络隔离夹具。先读源码确认 neutral 默认无MiniMax OAuth、空provider列表、.talos默认目录；将旧默认身份断言替换为对应正反例，保留显式custom provider、凭据隔离和禁止外网断言。
- BYOK必须实际执行到配置读取、模型响应、工具结果和恢复断言；在OAuth断言前退出不算验证。Windows命令夹具按真实宿主构造，不mock出POSIX权限，也不要求用户安装WSL。
- 本轮只跑受影响smoke/BYOK与必要类型/边界检查；若暴露生产故障，修第一条与该闭环有关的因果链，不能顺手清全库。不得只批量改字符串让测试变绿。
- 验收交付是“哪些完整流程已实际验证、剩余失败在哪”，技术由Luna判断，保存本地提交即停；不让主人看JSON、不调用真实模型、不发布。未跑到的工具/恢复/取消明确保留未验。
## 已交付小轮：只读更新构建契约

任务 cli-update-build-boundary/r1。复用已退役更新器的产品行为，只修构建检查与回归。修改前使用现有干净本地提交作为恢复点。

- required inputs 保留其余能力，将旧 update/application 改成 CLI main 与 TUI update-flow 的实际输出检查；不能只删失败断言。
- 统一 nonBundledSources 增加旧 cli/update、update/application、update/service 和 update/prefix-update；即使只出现在输入图而未输出字节，也拒绝。旧源码保留供上游审查。
- 既有 source-sync 测试覆盖合法产物、缺失/零输出入口、每种旧安装器再入图和既有私有宿主禁入。用合成metafile，不执行安装。
- 跑release-tools、source inventory、实际build与standalone检查；只运行本地产物update状态命令，不请求registry。完成后本地提交并停，其他失败独立处理。

## 产品方向与顺序

维护两个仓库：本仓库做 GUI 和产品文档，`C:\DEV\develop\Talos-CLI` 做引擎和 TUI。先把 fork 与 TUI 做成可用的独立终端产品，再恢复 GUI，最后做桌面外壳；不是同时开三条实施线。

| 顺序 | 要得到什么 | 完成标准 / 开工前要解决什么 |
| --- | --- | --- |
| 1. TUI 外观小轮 | 在现有终端功能上形成自己的外观 | 从主人当前意见中选一个部位，例如欢迎区或输入区；明确前后变化和窄屏表现。复用原生渲染、对话、工具与审批，每轮只验一个切片，不重写这些功能 |
| 2. 中立引擎与发行入口 | 自带 provider 凭据即可用，最终命令为 `talos` | 分轮处理专属登录/默认网络入口、数据继承与隔离、构建身份、命令与更新渠道。CLI 独立 npm 发行准备属于此线；具体依赖顺序见“npm 发行与版本提醒”。保留第三方预设、安全与许可 |
| 3. 恢复 GUI | 在已验收网页构图里真正完成单会话闭环 | 固定 fork 启动产物，先定位回复丢失与 UI 错漏；之后验工具、审批、取消，以及运行中/待审批时刷新、重启后的历史恢复。保留未知结局，不重复发送 |
| 4. Tauri 2 桌面 | 不依赖开发服务器的桌面入口 | 先决定 Node 核心/sidecar/Rust IPC 的职责，再做窗口、Windows 工作区与进程生命周期；不复制业务状态机，不换 Electron |
| 5. 分发与可选扩展 | 可安装、可升级的产品；按需求扩功能 | 先处理引擎与运行时分发、许可/字体、安装升级回滚；会话列表、并行、队列、文件树、diff、终端、图片等分别规划，不默认全部实现 |

上述顺序沿用先 TUI、后 GUI 的方向，不要求把所有 TUI 细节无限打磨完才动下一阶段。每个阶段需要一次明确收口；主人可以调整优先级，调整时只更新本表和 status 的当前入口，不另建一套路线。

**此处可能需要 Astra 把关**：改变 ACP 契约或恢复承诺、决定 Tauri 与引擎的进程/状态归属、设计新的信任或发行架构时。Luna 默认负责各阶段的源码调查、局部计划、实现及回归；账号、数据、网络、发布和上游合入不是整块的 Astra 专属工作。具体升级条件见 [workflow](workflow.md#6-复杂规划的复核与模型交接)。

## 已交付小轮：TUI 欢迎标识替换

任务 `tui-hex-emblem/r1`。上一轮字标与品牌布局得到主人认可，但右侧机械臂在实际终端里不可辨。主人指定改用已验收 GUI demo 顶栏的一上二下三六边形标识；本轮只替换右侧图案，保留六行欢迎高度。

| 项目 | 本轮边界 |
| --- | --- |
| 源码结论 | GUI `demo/talos.html` 的 `.emblem` 为三枚六边形，CSS 排成上方一枚、下方两枚；TUI `hero.ts` 按宽度切换完整字标与窄屏回退，运行时不加载字体包 |
| 实施 | 用 6 行纯 ASCII 绘制三枚填充六边形；64 列以上与 `TALOS` 字标并排，20–63 列改为单行标题加标识，10–19 列保留两行简版 |
| 验证 | 定向欢迎断言、源码清单与 diff 检查；构建和可见外观由主人在关闭旧 TUI 后执行 |
| 主人验收 | 宽屏欢迎页字标右侧能辨出上方一枚、下方两枚六边形，图案与字标同占六行，不裁顶；中等宽度仍有回退 |
| 停止 | 主人目视通过后停；其他 TUI、引擎和 GUI 工作另开轮次 |

## CLI 去 MiniMax 化与独立发行总目标

这是长期目标的宽口径定义；每次真正实施仍要先读对应源码、补接驳证据，再拆成可验收小轮。Talos 最终作为自己的 CLI/TUI 发行：外部命令只保留 `talos`，不保留 `mcode` 兼容入口；provider、凭据、数据、品牌、厂商网络出口和发布渠道都按中立产品重新核对。上游能力、MIT 许可证、NOTICE、第三方归属、权限检查和安全边界继续保留。

Talos 不走上游内置安装器。后续版本通过独立 npm 包发布；客户端只查询自己的 npm 版本并提示，由用户在外部终端手动升级。上游变化按周期进入候选分支，逐项审查后以 PR 合入；合 PR 与发布 npm 是两件事，只有自己的新版本发布后才触发客户端提醒。目标先固定，具体文件和删除/保留边界以每轮源码证据为准。

| 阶段 | 目标 | 进入条件 / 结果 |
| --- | --- | --- |
| 1. 外部入口与构建身份 | `talos` 是本地 fork 和发行包的唯一 CLI 入口，`mcode` 不再生成 | 构建、打包、安装验证和 GUI 启动路径都指向 fork；不把包名、数据目录或更新器一起悄悄改掉 |
| 2. provider、登录与数据 | 第三方预设平级；日常使用不依赖 MiniMax 专属账号；Talos 数据落点与原版隔离 | 先审计源码和现有离线回归，再处理显式迁移；不复制真实账号和会话 |
| 3. 品牌、网络与内置服务 | 清理用户可见 MiniMax 身份、默认厂商出口和不需要的专属能力 | 保留许可证、归属、权限和安全能力；不靠删字符串制造“完成” |
| 4. npm 独立发行 | CLI 写完后由主人直接发布 Talos npm 包 | 先确定包名/scope 与独立版本，再验证本地安装包；首次发布前接入只读版本提醒，真实 registry 验证留到发布后。发布由主人决定。详见“npm 发行与版本提醒” |
| 5. 周期性上游合入 | 保持与上游的可审查同步，不让 fork 漂移 | Luna 在同步授权内检查源清单、回归并解决常规冲突。**此处可能需要 Astra 把关**：上游架构与 Talos 既定契约冲突时；不自动 merge/push |

本目标不要求现在一次性重写 TUI、替换全部内部 `mcode` 标识或复制其它产品的完整交互；每个敏感边界都在实际源码轮次中单独收口。

## CLI 首版收口标准

本节将既有中立引擎路线收敛为验收边界，不新增功能，也不是下一轮实施授权。首个 npm 版本定位为能独立使用、能供 GUI 调用的 CLI 预览版；保留已确认的通用能力，不要求重写全部交互或追平其它产品。搜索后置边界见下一节。

| 范围 | 达到什么程度就收口 |
| --- | --- |
| 外观与身份 | 已验收的主题和欢迎页可作为首版基线；补齐日常入口、帮助和诊断中的 Talos 身份。发行默认主题策略需明确，保留用户选择；无需全库替换内部标识符，保留许可证和来源归属 |
| 模型与登录 | 原生 `/provider` 可管理平级的第三方预设与自定义模型；日常使用不要求 MiniMax 专属账号，Talos 发行不留可用的专属登录或意外回退入口。模型 provider 自己的凭据校验、安全审批仍保留 |
| 配置与数据 | 自己的配置、凭据与会话落点明确；不会悄悄读取、复制或改写原版数据。迁移如需要必须显式，失败可恢复 |
| 启动与网络 | `talos` 明确启动本地 fork 的可复现产物，GUI 能固定调用其 ACP 入口；默认厂商目录、遥测、签到、云能力和更新出口已审计并处理。Talos 不走上游内置更新器，后续通过独立 npm 发布；依赖 MiniMax 账号的能力可禁用，不要求逐个重造 |
| 核心可用性 | 指定 fork 的对话、流式输出、工具、审批、取消和历史恢复有与改动相称的证据；原有能力优先复用。先离线回归，再仅为缺少的证据做有限真实验证，不例行重复付费探针 |
| 可维护性 | 已运行的回归失败有归因和处置，不能靠缩小测试范围宣称全绿；构建、源码清单、许可和上游同步边界清楚。后续同步在候选分支审查，不承诺无人值守合入 |

达到这些条件后结束 CLI 首版改造，回到 GUI 已知失败修复。TUI 布局重做、复杂交互、新工具体系、所有厂商云功能的替代、内置自动更新系统和 npm 正式发布后的运营维护都不是这一阶段必做项；后续按总目标另开小轮。

## 首次 npm 预览版与搜索后置

首发定位为 **CLI 预览版**，不宣称功能完整。默认中立搜索服务、便捷搜索配置以及 Explore/Verifier 的中立搜索适配，放到首次 npm 发布后单独规划，不作为当前发行阻塞。这是完成度定位，正式包名、版本和 dist-tag 仍在发行准备轮由主人确认，不能据此擅定 beta 标签。

| 时点 | 范围与要求 |
| --- | --- |
| 发行前必须完成 | 剩余隐式厂商出口、数据隔离、权限与审批回归、必要核心能力证据；包身份与依赖/许可收口；临时前缀安装、启动、升级和卸载验证；首发前只读新版提醒。预览版不放宽这些闸 |
| 发行前必须说明 | 暂不自带默认联网搜索；主对话保留自配 MCP 接线，真实搜索尚未验证；Explore/Verifier 暂无网络搜索；`/mcp` 只查看状态。README 和实际发行说明须同义说明，不能把“保留 MCP”当搜索已迁移 |
| 首次发布后独立实施 | 选择中立搜索服务、提供可用的首次配置流程、按只读搜索身份/能力适配子代理，再补端到端真实搜索证据。不得恢复厂商默认回退，或通过允许全部 MCP 来绕过角色权限 |

后置只是优先级决定，不代表这些功能已实现或自动开工。发布后具体顺序由主人决定，不新建竞争待办，也不因搜索未做而扩大当前首发范围。**此处可能需要 Astra 把关**：子代理搜索如果改变工具信任边界或角色权限契约时；常规接线、配置流程、测试和文档仍由 Luna 完成。

## 已交付小轮：Talos CLI 外部入口

任务 `cli-talos-entrypoint/r1`。目标是先让构建和发行元数据只生成 `talos` 命令，为后续中立化和 npm 独立发行提供稳定入口。`mcode` 不做兼容别名。本轮不改数据目录、provider、登录、ACP 报文或 GUI，也不接上游内置更新器；更新器是否删除或退役留到独立源码轮次。

执行范围：`Talos-CLI/package.json`、`scripts/build.mjs`、`scripts/package-cli-release.mjs`、发行验证脚本及对应离线测试。验收是构建产物和发行 manifest 只有 `talos` bin，版本命令可由 `talos` 启动；内部 MiniMax 包名与许可证暂不在本轮改写。完成后进入主人可见的 CLI 命令验收，再决定下一轮数据/provider 边界。

## 历史方案：CLI 中立化

任务 `cli-provider-data-audit/r2`。Luna 按已确定的“第三方 provider 平级、移除可用的 MiniMax 专属登录与意外回退、Talos 数据与原版隔离”目标，复用已有证据，补必要源码并自行拆一个最小代码轮；不重复完整调查或真实模型请求。下一次主人要求继续时，可在同一轮更新局部方案并实施，无需再经过 Astra 的取证审批。

Luna 需要落实的局部问题：

1. `TALOS_NEUTRAL_RUNTIME=1` 已有何种配置层效果，哪些路径仍会继承默认 home；
2. provider 排序、第三方预设、BYOK 与 MiniMax 登录门禁分别由哪些源码入口控制；
3. `MINIMAX_DATA_DIR`、默认 `.minimax` 数据目录和 managed/non-managed 分支是否构成真实隔离；
4. 为落实既定目标选定开关接线、独立目录和专属入口退役的具体办法；不能只隐藏按钮却保留可用的专属登录回退。旧数据不隐式读取/迁移；本轮不新增迁移工具。

执行范围：相邻引擎的配置、数据路径、启动环境、provider/登录入口及对应既有测试；每次只选其中一个可验收切片，先将具体模块、源码依据、预期、离线检查及回退方法写入本节，再实现。第一刀已完成：Talos TUI 启动链自动设置 `TALOS_NEUTRAL_RUNTIME=1`，阻止 managed 启动自动种入 MiniMax 默认 provider，同时保留用户显式 provider 配置。下一刀再解决默认数据目录命名与旧 home 继承，使用 fake home 和可丢弃目录验证；代码回退不自动迁移或删除数据。记录构建来源，不触及真实凭据，不请求模型，不 fetch/merge/push；GUI、视觉、网络出口全量清理、npm 发布不在这个小轮。

验收与停止：本切片验收只确认 Talos 启动会设置中立开关，不能把它称为完全中立化或数据隔离完成。主人可用现有 Talos 启动入口观察 provider 初始状态；完成本切片后停。只有实施必然要求改变数据格式/恢复保证、协议或安全契约时才按 workflow 升级；目录命名、开关接线、普通回归问题无需 Astra。

## 历史方案：provider 入口与构建身份

任务 `cli-provider-neutral-ui/r3`。目标是修复空配置时 `/provider` 看起来像 MiniMax 独占，以及本地构建仍把自己称为 MiniMax Code 的可见问题。第三方预设和 Custom provider 已存在于原生 onboarding，本轮把入口接回 provider 管理页，不重写 provider 协议或凭据逻辑。

| 项目 | Luna 执行范围 |
| --- | --- |
| 实现 | provider 管理页顶部显示 `+ Add provider`；Enter/Space 或 `a` 进入既有官方预设/Custom provider 向导；构建根包、产物包和构建输出显示 Talos CLI；版本解析同时接受本地 Talos 产物名 |
| 依据 | `packages/tui/src/tui/features/provider/manager.ts` 的列表与键盘动作；`feature-flow.ts` 的 onboarding 装配；`onboarding.ts` 的 Known providers/Custom provider 列表；`scripts/build.mjs` 与 `package.json` 的可见构建身份 |
| 自验 | provider manager 定向套件、standalone typecheck、`pnpm build`；不发送模型请求，不触碰真实 provider/data |
| 主人验收 | 从 `C:\DEV\develop\Talos-CLI` 用支持的 Node 24 执行 `pnpm build`；启动 `pnpm talos`，输入 `/provider`；首行应见 `+ Add provider`，按 Enter 或 `a` 后应见官方预设列表和 `Custom provider`。MiniMax 可作为一个 provider 行存在，但不能再是唯一配置入口 |
| 停止 | 通过后停；下一轮再处理默认数据目录、专属登录门禁或发行 manifest，不把本轮入口修复称为完全去 MiniMax 化 |

## 历史方案：provider catalog parity

任务 `cli-provider-catalog-parity/r5`。目标是让 `/provider` 首屏真正呈现中立目录：MiniMax 作为一个正常 preset 与 DeepSeek、Z.AI 等其他厂商同层，Custom provider 作为同一目录中的开放式兜底入口保留；已配置连接从目录内的明确入口进入。

| 项目 | Luna 执行范围 |
| --- | --- |
| 实现 | provider preset parser 不再排除 `minimax`，仅保留旧区域别名的过滤；`/provider` 直接打开统一 catalog；厂商 preset 与 Custom provider 同属 `Provider catalog`；`Manage configured connections` 打开保存连接管理器；未配置的 MiniMax API Key 不再伪装成已存在的连接 |
| 依据 | `packages/local-runtime-v2/src/service/model-system/catalog/provider-presets/provider-presets.service.ts` 的过滤集合；`packages/tui/src/tui/commands/catalog.ts` 与 `packages/tui/src/tui/controller/product/command-flow.ts` 的 `/provider` 路由；`packages/tui/src/tui/features/provider/onboarding.ts` 的目录与管理入口；`packages/tui/src/provider/application.ts` 的连接快照 |
| 自验 | provider preset、onboarding、manager、provider application、feature-flow 定向 Vitest 99/99；standalone typecheck；`pnpm build`、`pnpm check:source` 和 `git diff --check` |
| 主人验收 | 关闭旧 TUI 后从 `C:\DEV\develop\Talos-CLI` 重建并运行 `pnpm talos`；输入 `/provider`。首屏直接预期看到 MiniMax、DeepSeek、Z.AI、Custom provider 同属 `Provider catalog`，并看到 `Manage configured connections`；不应先出现 MiniMax API Key/OAuth 两行。选管理入口后才进入已配置连接页 |
| 未覆盖 | 不改变 MiniMax OAuth/API Key 的认证实现，不改数据目录，不删除 Custom，不做真实模型请求；如果本地 catalog 快照没有 MiniMax，记录为 catalog 数据问题，不用 UI 假造 |
| 停止 | 主人通过后停；下一轮再处理默认数据目录、专属登录门禁或发行 manifest |

## 已交付小轮：旧 home 技能信任隔离

任务 `cli-legacy-skill-isolation/r1`。承接 Windows 权限闸，只修旧 home `.minimax` 的隐式技能信任，不把本小轮称为完整数据隔离完成。

- 先核对技能 registry、bundled 资源和 external workspace 根。没有固定 home fallback 时不凭猜测删 registry；实际向上扫描若包含 home，应排除它的旧 `.minimax/skills`；其他外部工作区来源继续服从既有开关。
- 中立模式的 runtime 技能白名单仅依据实际 dataDir；底层继续识别旧 `.minimax` 为私有数据，但不把其中 skills、agent workspace 或 memory 自动当作 Talos 资产。不得因移除品牌而放宽旧凭据读取。
- 使用 fake home、独立 dataDir/cwd 和合成技能，覆盖 read/glob/grep/list、两种 policy owner、Talos 技能可用、旧私有数据审批、递归/别名保护及非中立对照。
- 跑仓库正式权限入口和带仓库配置的既有技能/配置回归，补类型、source inventory、构建、文档与 diff 检查。没有真实模型请求，没有迁移/删除用户数据。
- 技术验收由 Luna 自行完成并停；无需主人查看 JSON 或用真实 provider 测试。完整数据隔离、发行依赖和安装验证仍由后续小轮分别完成。

## 已交付小轮：Talos 数据目录与旧 home 继承

任务 `cli-data-directory-isolation/r1`。目标是让 Talos CLI/TUI、headless 和 ACP 共用独立的默认数据目录，不从旧 MiniMax home 读取或复制配置。上一轮三六边形欢迎标识已获主人目视验收，本轮只处理数据落点和配置继承。

| 项目 | Luna 下一轮范围 |
| --- | --- |
| 源码依据 | `packages/tui/src/runtime/data-dir.ts` 将默认路径解析到 `.minimax`；`packages/tui/src/index.ts` 启动时把该路径写入运行环境，TUI/headless/ACP 也调用同一准备函数；`packages/config/src/config.ts` 的非 managed 分支会从默认 home 复制配置，且先于 neutral 判断。逐行证据见 [adapter](adapters/minimax-code.md#talos-默认数据目录与旧-home-继承2026-09-29) |
| 实施目标 | TUI 默认落点改为 home 下 `.talos`（profile 使用 `.talos-<profile>`），显式环境目录仍优先；neutral 模式下非 managed 初始化不再读取或复制旧 home 配置。旧数据不迁移、不删除 |
| 验证方式 | fake home 与可丢弃 data dir 的离线回归，覆盖默认路径、显式覆盖、非 managed 不继承，以及显式 custom provider 的保存与重读；不请求真实模型、不触碰用户真实目录 |
| 可能需要 Astra 把关 | 只有当隔离要求必须改变数据格式、会话恢复保证或跨进程迁移契约时升级；单纯目录、环境变量和配置继承修复由 Luna 完成 |
| 主人验收 | 这是内部隔离闸，由 Luna 用假 home 自验并报告实际路径与测试结果；不要求主人查看配置 JSON 或消耗真实 provider 请求 |
| 停止 | 证明“默认目录独立 + 非 managed 不继承 + 显式覆盖和重读仍可用”后停；专属登录退役、网络出口与 npm 发行另开小轮 |

## 历史方案：MiniMax 专属账号入口退役

任务 `cli-neutral-auth-entry/r1`。MiniMax 保留为可选的普通 API Key provider；Talos 不提供 MiniMax 账号 OAuth、Token Plan 和依赖该账号的签到入口。第三方 provider 的认证方式保持可用。

本轮依据见 [接驳证据](adapters/minimax-code.md#talos-专属登录入口2026-09-29)。CLI `login` / `acp login`、TUI `/login`、provider 管理页的 OAuth 行、`provider use token-plan` 与 `/checkin` 必须退出可用入口；旧命令需明确告知改走 `/provider`，不能误发模型或打开授权页。用离线回归验证入口和普通 provider 仍可用，再跑类型、构建和源码清单。用户可见行为交给主人审批后停；网络出口、底层模块清理及发行另开轮次。

## 历史方案：provider 预设目录出口中立化

任务 `cli-neutral-preset-egress/r1`。依据见 [接驳证据](adapters/minimax-code.md#talos-预设目录网络出口2026-09-30)。Talos 中立运行时，CN/EN 官方预设刷新均直接访问 `models.dev`，不访问 MiniMax descriptor/镜像；排序用本地区域默认值，不请求 MiniMax `common_config`。离线缓存继续可用；旧镜像图标地址和跨来源 ETag 不传给直连路径。非 neutral 兼容路径不变。

只修改预设目录 client/service 和既有测试，使用注入 fetch 断言目标与失败回落；不发真实网络或模型请求，不改用户配置、第三方凭据、ACP 和 GUI。这是不可通过界面目视判断的内部切片，由 Luna 完成定向回归、类型、构建与源码清单自验后停；不要求主人反复进入 `/provider`。其他出口另轮审计。

## 已交付小轮：旧内置更新器退役

任务 `cli-neutral-update-entry/r2`。依据见 [接驳证据](adapters/minimax-code.md#talos-旧更新入口2026-09-30)。本轮是下述路线的第一步：Talos neutral 入口停止使用上游更新检查、下载、安装和 prefix activation。npm 包身份尚未确定，不实现空转的检测器，不查询占位包名，也不把上游包名当默认值。

| 项目 | r2 实施与验证范围 |
| --- | --- |
| 启动与重启 | 已切断 `index.ts` 的旧 prefix 更新准备、`tui/launcher.ts` 的旧启动检查和重启时 activation；普通启动、退出及重启保留 |
| 手动入口 | `talos update` 与 `/update` 仍由命令分发，现只显示“此构建尚未配置 Talos npm 更新源；请使用当前源码构建。Talos 不会自动安装更新。”含义的提示；不误当聊天、不调用旧检查/安装器。帮助为查看更新状态 |
| 代码边界 | 核对 CLI/TUI 所有可达旧更新入口；在接线处隔离。旧底层模块可以暂留以便审查上游，但 Talos 产品路径不可达；不盲目删除与更新同名的普通业务逻辑 |
| 自验 | 旧更新应用不再由 Talos launcher 装配，TUI `/update` 无 inspect/apply 选项，CLI `update` 不加载旧安装器，重启直接启动子进程。相关定向测试、类型、构建、源码清单和新产物命令检查通过；完整 tui-app 文件的后续归因见下节，不宣称全库通过 |
| 交付与停止 | 内部调用隔离由 Luna 自验；命令反馈和检查结果见 [status](status.md)，不要求主人为了证明无网络请求而开关 TUI。此切片完成后停 |
| 不在本轮 | npm 查询器、包名/scope 修改、版本重定、发布配置、真实账号/模型、GUI、上游同步；不创建尚无消费者的更新框架 |

## 已交付小轮：TUI 回归归因与修复

任务 `cli-tui-regression-reconcile/r1`。主人已确认更新入口符合未配置提示的预期，要求执行者处理完整 `tui-app` 失败。本轮以支持的 Node 24 在现有工作树重跑完整套件，逐项对照测试预期、相关实现及已验收产品事实；结果见 [status](status.md)。

- 旧品牌、已验收欢迎文案与已退役更新行为的断言按对应真实行为修正；不做全文件盲替换，也不放宽功能断言。
- 历史、回退、问卷、状态合并等失败先读实现与输入，区分测试夹具问题和真实缺陷；必要的局部实现修复先补 adapter 源码依据。保留原测试目的、权限与错误恢复。
- 最后重跑整个 `tui-app` 文件，不用定向通过代替完整结果；受影响的额外回归、类型、源码清单、构建与文档检查按修改范围执行。
- 这是内部技术收口，Luna 自验，报告原因分类和剩余问题后停；不要求主人阅读 JSON 或花模型 token，不追加 UI/npm/GUI 功能。

## 已交付小轮：自动遥测出口中立化

任务 `cli-neutral-telemetry-egress/r1`。实施前默认遥测是 opt-in，但 neutral 不覆盖旧配置开关。本轮已在 `TALOS_NEUTRAL_RUNTIME=1` 时阻止上游 usage、metrics、自动诊断网络上传，即便配置已开启；保留本地故障记录、原有脱敏与权限边界。

- 修改共享 `config/telemetry-policy.ts` 和业务统计策略；业务客户端在收集/发送时也检查，防止绕过 launcher 或排队期间状态变化。
- 状态/预览命令明确报告 neutral 阻止上传，不建议用户打开无效的配置，不输出可发送的上游请求预览。
- 用既有 privacy 测试注入 fetch：验证配置全开、排队后变为 neutral、旧待发送诊断不上传、本地诊断仍存在；保留非 neutral 原有测试，证明不靠删除功能让检查通过。
- 相关单测、类型、源码清单、构建及文档检查已完成，结果见 [status](status.md)。此轮到此停；反馈、云工具/插件、权限分类服务等不属于本切片，不做真实网络、模型或数据迁移。

## 历史方案：上游反馈上传退役

任务 `cli-neutral-feedback-egress/r1`。原生反馈绑定上游账号、feedback ticket 与日志 presign/PUT，本轮在 neutral 模式关闭这条链，保留本地诊断；没有自己的反馈服务时不假造“已发送”或新后端。

- `/feedback` 仍由命令识别，立即给不可用说明，不读账号、不准备草稿、不误发模型；neutral 命令目录不推荐上传。欢迎内容撤下 `/feedback` 上传提示，用现有本地 `/doctor` 能力替代。
- runtime 服务的 prepare/submit 和诊断上传器拒绝 neutral；入口阻断发生在账号读取、日志 flush/采集、文件打包与 fetch 之前，发送边界再次核验。
- 离线覆盖直接调用、既有草稿、排队/诊断采集中切换 neutral、零认证/采集/上传；保留非 neutral 现有脱敏与取消测试。完成反馈相关测试、完整 TUI、类型、构建、源码清单和文档检查后停。
- 可见验收只看 unavailable 提示和正常输入，不要求真实反馈或模型请求；本轮不触碰其他云工具、provider、用户配置和 GUI/npm。

## 已交付小轮：上游插件市场与连接器中立化

任务 `cli-neutral-plugin-cloud/r1`。插件 registry 和云连接器共用厂商签名 transport，GitHub 主动导入是另一条独立链。neutral 阻断前者，不把所有插件网络一刀切。

- 共用 transport 在账号读取/签名、请求 dispatch、包下载及写入前拒绝 neutral，给明确 unavailable 错误；不将拒绝解释为成功。
- 初始化插件系统时屏蔽 neutral 的上游账号 scope，避免恢复厂商账号绑定的插件或持续等待专属认证；原本地、GitHub importer、用户 MCP 和权限/审批不改。
- CLI/TUI 默认列本地插件；显式 official 操作立即解释 unavailable。来源列表、刷新反馈及页面 tab 不再推荐厂商市场，已保存数据不迁移或删除。
- 既有测试补 neutral、直调、下载零文件、云账号零读取、本地列表/安装/启停/刷新及 GitHub source 正常解析；保留非 neutral 签名/鉴权/下载回归。类型、构建、源码清单、相关测试与文档检查后停。
- Matrix、mcode-tools 和其他云服务另轮审计；不能据此声称全进程无厂商请求。反馈提示待主人验收记录保留。

## 已交付小轮：内置 Matrix 与 mcode-tools 云工具退役

任务 `cli-neutral-matrix-tools/r1`。内置 Matrix 是厂商搜索/媒体网关，mcode-tools 是通过租约 broker 激活的厂商产物。本轮关闭 neutral 的自动注册、凭据传递、HTTP 与工具程序激活，不替换通用 MCP、Shell 或权限审批。

- MCP 初始化及 LocalMcpService 不注册/展示/连接内置 Matrix；即使上层 flag 为 true，neutral 仍覆盖。带内部 Matrix 标记的旧配置只过滤运行视图，不删磁盘；用户自配同名 `matrix` 服务不按名称误伤。
- 原生 native web_search 的默认 Matrix adapter 同样撤下，防模型调用不可用入口；显式自定义搜索 adapter 与 MCP 搜索保留。
- 内置 builder/token override 不再创建工具描述或传递凭据；Matrix HTTP 客户端在 POST、上传、下载、header 读取前给明确 unavailable，防止绕过目录直调。
- neutral 不激活 mcode-tools resource/broker/PATH；lifecycle、配置投影、prepare 和子程序入口分别保护。启动入口仍可返回明确不可用说明，不能导入闭源嵌入程序。
- 离线证明零 builder/连接/身份读取/fetch、opt-in 不能启用；本地/自配 MCP 仍能列出，Shell 与审批原回归不变。保留非 neutral 协议与 broker 测试，相关和完整 TUI 回归、类型、构建、源码清单及文档检查已完成，实际结果见 [status](status.md)；本轮到此停。
- 后续中立搜索不是已经完成的事实：主对话的 MCP 底座可用，但首次配置体验、默认搜索选择和 Explore/Verifier 只读搜索契约仍缺；依据见 [adapter](adapters/minimax-code.md#中立搜索的现有调用链与缺口2026-09-30)。届时单独规划，不通过允许全部 MCP 来绕过既有角色权限。
- 构建仍复制的 mcode-tools 第三方资源留待发行审计，许可证/NOTICE 不删；运行禁用不等于已去除分发依赖，不声称全进程无其他厂商出口。

## 已交付小轮：权限云分类中立化

任务 `cli-neutral-permission-classifier/r1`。neutral 不将工具输入、home/workspace 路径和对话上下文发往上游 permission/check。沿用现有“云分类不可用 → 本地规则/检查仍生效，未决操作请求用户确认”的分支，不重写权限引擎或强制修改保存的模式。

- shouldUseCloudClassify 在 neutral 为 false；HTTP 客户端在身份读取/序列化/发送前返回现有 fail-closed unavailable verdict，防止绕过 facade 直调。保留非 neutral 协议行为。
- 用 managed=true + neutral 的真实 facade 离线回归证明未知操作 ask（即使假云客户端会 allow 也不调用）、明确 allow/deny 规则有效、危险操作的硬拒绝保留；检查原权限、删除保护和完整 TUI 回归。
- Auto 文案说明本地检查与未决确认，默认 Ask 和 Full access 语义不变；不把所有未知行为默许或把模式悄悄切到 Full access。
- 类型、构建、源码清单、相关权限与完整 TUI 回归检查完成，本轮出口阻断收口；当时 Windows 直跑 POSIX policy 文件的15项既有失败已有对照；最新 Astra 平台边界纠偏及尚未消除的风险、下一入口只见 [status](status.md#当前技术收口缺口权限-facade-13项剩余失败)。下一授权实施轮按 r2 先明确 Windows 适用覆盖与原生 POSIX 交接，再审计旧 home 技能信任路径。搜索迁移按首发后路线，不新增云审批替代服务。

## 已交付小轮：权限写入工作区夹具修正

任务 `cli-permission-workspace-fixtures/r1`。两项预期 ask 的测试没有提供会话 cwd，生产 fallback 为 home；Windows fake dataDir 在 home 下，目标已经属于隐式工作区，导致测试无法隔离自己要测的信任边界。

- 仅在测试夹具增加显式会话工作区，选 cwd 与 dataDir 不重叠；原 home 回退不改。
- 普通 dataDir 写入与精确计划目标边界分别测试 default/auto：外部普通目标 ask，显式精确目标 allow，相邻 .bak ask，不写入长期规则。对照无会话配置的 home fallback，固定平台前提，不盲调 tmpdir 路径或放宽断言。
- 两项修正与正反对照通过，并完整重跑 facade，逐名称确认仅减少指定失败；类型、源码清单、diff与文档检查通过。本轮到此停，剩余失败及下一入口只见 [status](status.md#当前技术收口缺口权限-facade-13项剩余失败)，不扩大为全权限通过。

## 历史方案：POSIX 回收脚本平台夹具

任务 `cli-permission-posix-fixtures/r2`，Astra 于 2026-09-30 按主人环境条件纠偏。Windows 主机继续承担 Windows 开发；主人另有一台类 Unix 机器，不要求安装 WSL。该机具体 OS、架构、Node 版本与接入方式尚未核对，不能预先称它可验证 Linux/macOS 全部平台。

**关键源码事实**：引擎 `scripts/verify.mjs:75-81` 已将 `test:policy` 限为 darwin/linux；`test/vitest-suites.json:202-204` 该组包含完整 local-permission-facade。直接在 Windows 调用 Vitest 整个文件绕过了该平台约束。Git Bash 能执行 shell 脚本，但它启动的 Windows Node 仍使用 win32 路径/文件元数据。r1 的 stat mock 不能据此升级为真实 POSIX 验证，不再扩展此模拟。

### r2 本地纠偏已完成与原生交接边界

1. 已撤销 r1 新增的 `simulatedPosixModes`、node:fs stat mock、其 fixture/cleanup 接线及依赖这些模拟的 Windows 反向用例；保留此前已通过的 session.cwd/精确写入修正和 neutral 云分类测试。缺失/篡改/去执行位的坏脚本用例留到真实 POSIX 检查，不在 Windows 伪造 available。
**当前完成范围**：模拟已撤回；平台归因和正式Windows权限自动入口已由下方 `cli-windows-permission-gate/r1` 交付，原POSIX断言保留，新Windows对照已跑通。原生类Unix结果、实际待验源码快照与版本校验材料仍未取得；不再为重复通用说明单独开轮。

2. 逐项标注原13个失败的测试平台与契约。Windows 返回更早的硬拒绝不是放宽 deny 的理由；缺脚本、路径/执行计划、错误分类、用户规则和审批分别取证。平台归属不清或实际放行不合契约者仍是安全待办，不能统一标不适用。
3. 建立明确的 Windows 权限覆盖入口，复用已有 Windows delete boundary、默认/Auto 未决确认、显式规则、配置异常拒绝、敏感文件和精确写入边界。可以整理现有测试并登记 suite；按引擎 source inventory 规则执行，不复制第二套生产逻辑。现有 `test:windows` 主要是路径与旧更新安装契约，不能把它单独通过当权限全验收。
4. 在 Windows 运行上述适用回归与本轮相称检查，记录通过、失败和按既有平台条件不适用的项目；原 POSIX 断言不改成 Windows 值来凑通过，不删除套件或降低门槛。
5. 类 Unix 通用操作说明已在 README；实际源码快照、文件清单/校验值、锁文件与版本尚未准备。确认机器和移交范围后一次性准备，不在当前Windows权限轮反复整理。无需等远端在线才建立本地检查入口，不自行安装 WSL/系统软件、远程连接或上传项目。

### 两台机器的职责和验证时点

| 环境 | 承担的检查 | 边界 |
| --- | --- | --- |
| Windows 当前主机 | Windows Node、路径、`.cmd`/PowerShell 删除保护、权限审批、本地工具、CLI/TUI/GUI 开发 | 常用启动仍为 pnpm；Git Bash 可测 shell 可用性，不把它当 Linux/macOS Node |
| 主人的类 Unix 机器 | 原生 Node 与真实文件权限下的 policy、POSIX 回收脚本以及该平台安装产物 | 执行前确认实际 OS/架构和工作区文件系统；Linux 通过不代表 macOS/Seatbelt 通过，反之亦然；不使用 Windows node_modules/dist |

移交使用同一份经审查的本地提交或源码快照及校验值，包含待验改动和锁文件，不只记录仍未包含改动的 HEAD。不能因此自动提交、push、上传私有数据或引入远程连接授权；命令只写 README。由 Luna 读取并解释机器结果，主人不承担 JSON 分析。

**阻塞判断**：原生 POSIX 结果未取得，不阻塞后续 Windows 功能开发与独立问题修复；若要声明支持该类 Unix 平台或发布相应产物，须补原生通过证据。任何适用于目标发行平台的权限/数据安全缺陷仍阻塞发行。首发平台清单、npm 元数据与支持声明届时一致，不能借“Windows 优先”擅自改变全平台承诺或把未验标通过。可先推进 Windows 主线，无需为了清空这个错误数字接入 WSL。


## 已交付小轮：Windows 权限自动检查入口

任务 `cli-windows-permission-gate/r1`。正式提供 Windows policy 命令并接入 verifier，复用 test/vitest-suites 的既有 policy 文件，不复制生产逻辑或重复登记测试文件。

- runner 允许显式宿主约束，Windows 命令在非 win32 直接报平台错误，不伪造环境；使用现有 TEMP 规范化与串行文件设置。
- 同一 facade 文件公共规则/ask/deny/数据路径断言持续运行；真实 POSIX 回收、chmod、POSIX 路径/日志用例仅在 Linux/macOS 执行，原断言保留，Windows 增加对应回收计划、早期硬拒绝及日志断言。被标平台不适用的每个原失败均有明确源码依据或 Windows 对照，不能只把失败名称加入排除列表。
- portable 写重定向用例明确选定会话 cwd，不以 /tmp 或 home fallback 推断跨平台工作区；敏感路径与未知操作确认检查保留。
- 新 package 命令、verifier Windows 和完整 profile 都包含权限闸；只读 list 与不匹配平台的拒绝路径验证。源码清单、类型、正式权限闸与发布工具回归已检查，实际结果见 [status](status.md)；完成本轮即停，不重复整理远端交接。
- Windows source contract 中 fsutil 与旧安装器三项失败另列，不通过缩小旧测试改变结论；原生 POSIX 结果仍未取得。

## npm 发行与版本提醒

这是后续依赖顺序，不是立即连续执行的任务单。npm 尚未发布不妨碍关闭旧安装器，也不妨碍后续用本地产物恢复 GUI。版本提醒应随首个正式 npm 包交付；不必先发布一个没有提醒能力的版本才能开发它。

| 顺序 | 要得到什么 | 进入条件与完成边界 |
| --- | --- | --- |
| 1. 关闭旧更新执行路径 | 当前源码构建不查、不装上游发行 | 按上面 `r2` 小轮实施；与 npm 账号、包名和发布无关 |
| 2. CLI 技术收口 | 可独立使用的 Talos 引擎基线 | 按 [预览版边界](#首次-npm-预览版与搜索后置) 处理其余厂商出口、完整数据隔离、回归失败归因及必要核心证据；搜索功能后置，发行前限制说明不后置；Luna 自行拆分小轮，不重复已通过的探针 |
| 3. npm 发行准备 | 一份可本地安装验证的 Talos 包 | 届时由主人确认实际 npm scope/包名与独立版本策略；Luna 修正发行 manifest、归属、依赖/原生资源和 `talos` launcher，在临时安装前缀验证安装、启动、升级和卸载。保留开发 workspace 的防误发布保护，不把当前上游 manifest 直接解锁发布 |
| 4. 首发前接入只读提醒 | 首个 npm 版本具备检测下一版的能力 | 包身份确定后，实现下面契约，使用假 registry 响应和合成版本离线自验；发布包包含检测器。此时不要求 npm 上已有真实新版 |
| 5. 主人发布与真实核验 | 已发布版本可查、可安装 | 主人发布 CLI 预览版后，核对真实包名、`latest`、安装产物与版本；尚无第二版时只能验证“当前版本”，不能称真实新版通知已通过。后续已授权合上游 PR、回归、提升 Talos 版本并发布，才产生真实升级提示 |

未来提醒契约：

- 发行元数据是包名、当前版本与更新目标的单一来源；检测目标和手动安装命令必须一致。不能从上游常量或仓库目录名推断 npm scope。主人输入的 `@maintainder@` 为占位符；正式 tag 拼写是 `latest`，包名未定前不输出可执行的假安装命令。
- 只有明确的 Talos npm 发行构建启用默认检测。源码/未配置构建不自动查询；手动更新命令清楚说明未配置。确认包身份后可在正式首发前通过假响应测试，不以线上 404 阻塞实现。
- 首版在交互 TUI 启动后异步检查一次自己的 npm `latest`，不阻塞欢迎页或输入；不设常驻轮询。`/update` 与 CLI 更新命令可主动查询，重复请求合并。ACP/headless 不主动检查、不向协议 stdout 混入提示。
- 用语义版本比较，只提示适用且比本地新的稳定版本；同版、较旧版本不提示升级，不因字符串大小或继承的上游版本制造降级。404、超时、离线、非法响应表示“未能确认”，不能显示“已是最新”；后台失败安静处理，主动检查给明确结果。
- 新版在 TUI 内显示非阻塞提醒和用户可复制的手动安装指令，不抢焦点、不弹系统窗口。窄屏保留查看完整指令的入口；检测和展示均无下载、安装、执行 npm 或自动重启能力。正式命令到发行轮写入 README。
- 离线覆盖新/同/旧版本、预发布版本、错误/超时、错误包身份、未配置构建和安装器零调用；可见提醒用受控假新版预览供主人看样式，不要求发布虚假版本或消耗模型 token。真实 npm 证据单独报告。

这一方向由 Astra 本轮定界后，Luna 可以独立完成后续实现。**此处可能需要 Astra 把关**：以后若改为自动安装、切换包来源、远程下发可执行命令或变更安装/恢复信任边界；普通 npm 元数据查询、提示接线、测试和打包修复无需重复升级。

## 已交付方案：TUI Talos 主题

任务 `tui-talos-theme/r1`。目标：让 Endfield 族黄灰风格覆盖欢迎区之外的现有 TUI，先完成统一配色这一层，不重做布局和交互。视觉取值原则见 [design](design.md#tui-主题小轮)，源码入口见 [主题复用证据](adapters/minimax-code.md#tui-主题复用依据2026-09-29)。

| 项目 | Luna 执行范围 |
| --- | --- |
| 实现 | 在现有内置主题列表新增 `talos` / `Talos`，提供 dark/light 两套语义颜色，经原有 `/theme` 菜单预览、保存、切换。保持当前默认和已保存主题选择，本轮由主人显式选 Talos；验收后再决定是否将其作为发行默认 |
| 主要可写文件 | 引擎 `packages/tui/src/tui/theme/palettes.ts`；既有测试 `packages/tui/test/unit/tui/theme/palettes.test.ts`、`runtime.test.ts`、`custom-themes.test.ts`、`packages/tui/test/unit/tui/features/settings/theme-picker.test.ts`。仅补主题注册、切换和新主题覆盖所需断言，不改断言门槛 |
| 复用与保护 | 原主题和默认 fallback 不变；新增主题沿现有语义色影响输入、菜单、正文、工具/审批等已消费主题的组件。保留机械臂字符、现有代码语法高亮和成功/警告/失败/diff 语义。不上新框架、不新增渲染器 |
| 自验 | 跑上述现有主题套件，以及 composer 回归、类型、目标文件 lint、source inventory、构建；补新主题的深浅色可读性、切换恢复、无色输出覆盖。保持已有对比度门槛；技术结果自行判断，实际命令由执行者更新 README |
| 可见验收 | 按 README 从 fork 重建启动；用 `/theme` 选 Talos，观察主界面、输入和菜单；切换浅/深色、缩窄终端；回到原主题再切回。无需发送消息或测试 provider。工具/审批的颜色由离线组件测试验证，本轮不声称真实工具或审批重新验收通过 |
| 不在本轮 | 不修思考块、不改快捷键/折叠/滚动/状态逻辑，不改鉴权/provider/数据/ACP/命令名，不修 GUI，不清除所有 MiniMax 字符串，不改默认主题，不调用模型或 fetch/merge 上游 |
| 失败与停止 | 若必须改主题之外的业务模块才能达到目标，记录具体阻碍交回复核；不扩大为 TUI 重做。交付可见主题后停在主人验收点；只表示配色切片完成，不宣布整体 Endfield 设计完成 |

本节仅保留该已交付方案供追溯，不是当前执行入口；实际验收见 status。

## 已交付小轮：TUI 欢迎 ASCII 标题

任务 `tui-welcome-banner/r1`。这是主人在 Talos 主题验收通过后提出的窄范围修订：缩小机械臂，在上方加入 `TALOS` 的 ASCII 标题。复用现有欢迎 hero，不改主题、交互、布局框架或默认主题。

执行范围：`Talos-CLI` 只改 `packages/tui/src/tui/shell/welcome/design.ts`、`hero.ts`、欢迎维护说明及对应既有欢迎渲染断言。宽屏使用内置 5×5 ASCII 字形，中窄屏使用单行 `TALOS`，极窄屏保留 fallback；机械臂同时缩小。不得新增字体依赖，不得改 GUI、ACP、provider、思考块或命令名。

验收：显式 Node 24 构建后启动 fork，观察宽屏和窄屏欢迎页；ASCII 标题应在机械臂上方、无厂商字标、无换行溢出。相关欢迎渲染测试、standalone TypeScript、source inventory、构建和 diff 检查由 Luna 自验；主人只需看实际终端画面。完成后停。

## 历史设计的使用方式

[整理前完整计划](archive/2026-09-29/plan-before-reset.md)保留原浏览器五轮的详细契约、Tauri 等未来分析及旧小轮，**不是当前执行清单**。恢复 GUI 或桌面工作时，由本轮承担者按实际源码提取仍有效的要求，更新本页对应方案；仅架构决策需要 Astra。不得从历史“第 1 轮开始”重跑或把旧任务重新派给 Luna。

继续保留的重要承诺：浏览器刷新不重发动作、服务持有回合、动作去重与旧代次隔离、工具部分字段合并、真实审批效果、原 cwd 历史恢复、仅清理自有进程。技术证据集中于 [adapter](adapters/minimax-code.md)，运行命令集中于 [README](../README.md)，避免在路线图重复复制。
