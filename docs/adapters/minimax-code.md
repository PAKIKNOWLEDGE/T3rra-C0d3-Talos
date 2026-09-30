# MiniMax Code 接驳证据入口

此页是按需查阅的证据库，不是每轮必读清单，也不派发任务。源码根目录 `C:\DEV\develop\Talos-CLI`，上游基线 `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`；每项证据只对其标注的日期、提交和运行路径负责。该仓自己的 AGENTS 管它的代码。

按问题选读：[原生 TUI](#原生-tui-与-gui-边界复核2026-09-29)、[配置隔离缺口](#配置离线回归实测2026-09-28)、[原生 provider](#原生-provider-与重复探针复核2026-09-28)、[ACP 契约](#单会话链路源码证据)、[真实 ACP 探针](#第-2-轮真实探针实测)。现状只见 [status](../status.md)。

## provider 入口与构建身份复核（2026-09-28）

【源码】相邻引擎工作树 `C:\DEV\develop\Talos-CLI` 已落地本轮提交 `e5e797dff4ab26400cbb233c242cf10e59536b1c`，本轮未改变 ACP、凭据协议或真实数据。以下是本轮实现依赖的源码映射：

| 位置 | 事实与实现 |
| --- | --- |
| `packages/tui/src/tui/features/provider/manager.ts:37`、`:103`、`:148-166`、`:205`、`:287-293` | provider 管理器原先只渲染已保存连接；本轮增加显式 `+ Add provider` 行、`a` 快捷键和 Enter/Space 选中动作，选中后通过回调离开管理器，不伪造 provider snapshot |
| `packages/tui/src/tui/controller/product/feature-flow.ts:935-941` | `/provider` 管理器的新增入口关闭当前面板并调用既有 `showProviderOnboarding()`；官方目录和 Custom provider 仍由 onboarding 负责加载 |
| `packages/tui/src/tui/features/provider/onboarding.ts:347-367` | onboarding 的 `Known providers` 模板和 `Custom provider` 手工入口原本已经存在，本轮复用，不重复实现 provider 保存协议 |
| `packages/tui/src/provider/application.ts:22-62` | snapshot 仍代表已保存连接与 MiniMax credential source；官方 catalog 不应从 snapshot 猜测，必须通过 onboarding 显式加载 |
| `package.json:2-6`、`scripts/build.mjs:137-146`、`packages/tui/src/build-info.ts:7-22` | 根包和构建产物的可见身份改为 `talos-cli` / `Built Talos CLI`；版本仍为上游基线 `0.5.7`，版本解析同时接受 Talos 产物名 |

【实测】2026-09-28，显式 Node `v24.15.0` 下：`pnpm build` 输出 `> talos-cli@0.5.7 build` 与 `Built Talos CLI 0.5.7 from 6267 source files.`；provider manager 定向单测 **23/23**；standalone typecheck 通过。未启动真实 TUI、未发送模型请求、未触碰 `.talos/` 用户目录。

【未验】主人尚未在真实终端进入 `/provider` 观察新增行，也未从该行进入官方预设和 Custom provider；这项可见验收通过前，不能宣称 provider 中立化完成。MiniMax 行仍可存在，但不再是唯一新增入口。

## provider catalog 平级性复核（2026-09-28）

【源码】相邻引擎工作树 `C:\DEV\develop\Talos-CLI` 基线提交 `bc5ad01441dafa153caf55cdd78893aca97b4621`，本轮工作树只改 provider catalog、管理页文案、对应测试，以及本地运行数据的源码清单隔离。实现依赖的源码映射如下：

| 位置 | 事实与实现 |
| --- | --- |
| `packages/local-runtime-v2/src/service/model-system/catalog/provider-presets/provider-presets.service.ts:20-24` | 禁用集合只保留 `minimax-cn`、`minimax-coding-plan`、`minimax-cn-coding-plan`；中性 `minimax` 不再因品牌身份从 catalog 过滤。 |
| `packages/local-runtime-v2/src/service/model-system/catalog/provider-presets/provider-presets.service.test.ts:227-249`、`:761-773` | 离线目录夹具验证 `minimax` 与第三方 preset 同时保留，并按既有区域顺序参与排序；没有为 MiniMax 增加置顶逻辑。 |
| `packages/tui/src/tui/features/provider/onboarding.ts:347-364` | 官方 preset 与 `Custom provider` 都映射到同一 `Provider catalog` 分组；仍复用原有保存、模型发现和测试连接流程。 |
| `packages/tui/src/tui/features/provider/manager.ts:133-164` | 管理页只描述已配置连接和内置登录；`+ Add provider` 明确进入统一目录，不把目录内容伪装成已保存连接。 |
| `.gitignore:1-7`、`scripts/source-inventory.mjs:11-20` | 本地 `.talos/` 运行数据不属于公开源码，加入忽略和清单扫描排除；未读取、提交或改写其中凭据、会话和日志。 |

【实测】2026-09-28，显式 Node `v24.15.0` 下：`pnpm build` 成功，输出 `> talos-cli@0.5.7 build` 与 `Built Talos CLI 0.5.7 from 6267 source files.`；provider preset、onboarding、manager 三个定向 Vitest 文件 **78/78** 通过；standalone typecheck 通过；`pnpm check:source` 通过（4276 files）；`git diff --check` 通过。未启动真实 TUI、未发送模型请求、未触碰 `.talos/` 内容。

【未验】主人尚未在真实终端从 `/provider` → `+ Add provider` 目视确认目录分组；本条不证明 MiniMax 登录、区域网络出口、默认数据目录、独立 npm 发行或完整第三方模型链路已经中立化。若本地 catalog 快照缺少 `minimax`，应记录数据源问题，不由 UI 假造。

## `/provider` 首屏目录复核（2026-09-29）

【源码】相邻引擎工作树 `C:\DEV\develop\Talos-CLI` 在 provider parity 修订后继续沿用 `models.dev` preset catalog；本次新增的是入口层语义，不改变 provider 协议或认证实现：

| 位置 | 事实与实现 |
| --- | --- |
| `packages/tui/src/tui/controller/product/command-flow.ts:1330` | `/provider` 现在直接调用 `showProviderOnboarding()`，首屏先展示 catalog，而不是先进入 MiniMax 连接管理器。 |
| `packages/tui/src/tui/features/provider/onboarding.ts:18-19`、`:59-66`、`:151-168`、`:347-379`、`:522-530` | 页面标题改为 `Provider catalog`；官方 preset 与 `Custom provider` 共用 `Provider catalog` 分组；`Manage configured connections` 作为独立入口打开已保存连接和内置登录。该入口不复制保存协议。 |
| `packages/tui/src/tui/controller/product/feature-flow.ts:774-839` | 目录仍先加载 provider preset，再读取当前连接；管理入口回到既有 `showProviderManager()`，不会创建第二套连接状态机。 |
| `packages/tui/src/provider/application.ts:41-64` | 未配置且未选用的 MiniMax API Key 不再写入 provider snapshot；MiniMax OAuth 只有在管理页中作为现有内置登录来源显示。 |

【实测】2026-09-29，显式 Node `v24.15.0` 下，provider onboarding、manager、provider application、feature-flow 定向 Vitest **99/99** 通过；standalone typecheck 通过；`pnpm build` 输出 `Built Talos CLI 0.5.7 from 6267 source files.`；`pnpm check:source` 通过（4276 files）；`git diff --check` 通过。未发送模型请求、未修改真实数据目录。

【未验】主人尚未在真实终端观察新的 `/provider` 首屏；本条不证明 provider catalog 网络刷新、第三方模型连接、MiniMax 登录或数据隔离已经完成。

## 原生 TUI 与 GUI 边界复核（2026-09-29）

【源码】根目录为 `C:\DEV\develop\Talos-CLI\`，以下 path:line 均相对于该根；HEAD `370c7646fdfd51ef8a812a4966538884b73db556`。本次只读取证和核对 Git，没有启动 TUI、跑引擎测试或调用模型。

| 位置 | 事实与限制 |
| --- | --- |
| `packages/tui/src/tui/app.ts:80`、`:82`；`packages/tui/src/tui/controller/projection/turn-live-projection.ts:47`、`:57` | 已组装 TranscriptStore/TranscriptView，投影处理助手流式文本、thinking、工具调用及消息；原生功能已存在，不需要按 GUI ACP 链重新实现 |
| `packages/tui/src/tui/controller/interaction/interaction-flow.ts:648`、`:653`、`:1203`、`:1212` | 已有权限选择页和 runtime.replyPermission 提交路径，带请求与会话身份处理；视觉改造应复用，不另造审批状态机 |
| `packages/tui/src/tui/features/interaction/permission-picker.ts:88`、`:90`、`:118`、`:127`、`:543` | allowOnce 显示为 Allow for this conversation；可不提供 always；主选择页 Esc 拒绝、Ctrl+C 停止，提交期间禁用输入。子页 Esc 可返回，所以不能把“Esc 拒绝”泛化到每个子页，也不能照抄文本示意图的 Esc keep waiting |
| `packages/tui/src/tui/theme/palettes.ts:365`；`packages/tui/src/tui/shell/welcome/hero.ts:11` | 默认主题 id 仍为 minimax，欢迎图使用已有语义颜色和宽度分支；欢迎页更新不等于所有主题/品牌改完 |
| `package.json:12`、`:15` | build 负责构建，mcode 脚本只运行 dist/cli.js；改源码后未重建可能仍见旧画面。版本号 0.5.7 不能单独证明 fork 构建身份 |

映射边界：TUI 组件直接使用自己的 runtime/投影；GUI 通过 ACP 适配后合并事实。两套界面的视觉参考和协议契约不可互换。【未验】本次不证明全部原生功能的运行正确性，也不判断完整 TUI 的设计已经通过。

## Talos 外部入口与发行边界（2026-09-28）

【源码】基线为 `C:\DEV\develop\Talos-CLI`，改动前 HEAD `5bf53da`。本轮读取并修改 `package.json`、`scripts/build.mjs`、`scripts/package-cli-release.mjs`、`scripts/verify-cli-release.mjs`、`scripts/publish-cli-release.mjs` 及对应离线测试。

- `package.json` 的本地脚本入口改为 `talos -> node dist/cli.js`，不再生成 `mcode` 脚本。
- `scripts/build.mjs` 写出的 `dist/package.json` 只声明 `bin.talos = cli.js`。
- `scripts/package-cli-release.mjs` 的发行 manifest 只声明 `bin.talos = cli.js`；MIT、NOTICE 和第三方许可证复制逻辑不变。
- 发行验证与 release notes 的命令示例改为 `talos --version`。包名、上游 repository 字段、数据目录和内置更新器本轮不改；Talos 计划不依赖内置更新器，后续以独立 npm 发行和周期性候选 PR 为边界。

【实测】显式 Node `v24.15.0` 下构建成功；`dist/package.json` 的 `bin` 只有 `talos`；`dist/cli.js --version` 返回 `0.5.7`；source inventory、standalone boundary 和 `test/source-sync.test.mjs`（52 通过、2 跳过）通过。

【未验】安装后 npm launcher 和 Windows 更新路径尚未验证；本条不能据此宣布完全去 MiniMax 化、数据隔离或 npm 已发布。

## TUI 主题复用依据（2026-09-29）

【源码】根目录 `C:\DEV\develop\Talos-CLI\`，HEAD `370c7646fdfd51ef8a812a4966538884b73db556`。本次只读，无模型请求、构建或运行验收。

- `packages/tui/src/tui/theme/palettes.ts:27`、`:56`、`:366`、`:455`、`:470`：内置主题已有 dark/light 调色板、默认值和注册列表；本轮 Talos 位于 `:366`，默认值和注册列表仍在 `:455`、`:470`。可添加 Talos 主题而不覆盖原主题、不改默认 fallback。
- `packages/tui/src/tui/theme/registry.ts:28`、`:65`、`:84`；`theme/controller.ts:78`：注册表列出主题，按传入选择和 appearance 解析颜色。已有用户选择必须保留，不能为了让新主题出现而改写配置。
- `packages/tui/src/tui/commands/catalog.ts:374` 注册 `/theme`；`packages/tui/src/tui/features/settings/theme-picker.ts` 已有预览、提交、取消与 appearance 选择。复用原菜单，不另建设置页。
- `packages/tui/src/tui/theme/runtime.ts` 的 `tuiColors`、`tuiSelectListTheme`、`tuiEditorTheme` 和 Markdown theme 读取动态语义色；`shell/composer.ts:4`、`shell/chrome.ts:10` 沿用该层。主题能影响欢迎页之外的组件，但不保证每个硬编码颜色都随之变化。
- `packages/tui/test/unit/tui/theme/palettes.test.ts:23` 起遍历所有内置深浅调色板，包含原配色兼容和对比度检查；相关 runtime/custom-themes/theme-picker 测试已在 `test/vitest-suites.json:177` 起登记。添加主题应保留原值兼容和阈值，不能将“预期新颜色”冒充渲染验收。

【实施边界】真实终端、无色/16 色适配与各组件的最终外观仍需主人验收；本轮机读结果只证明主题注册、颜色契约和切换路径。主人反馈新版本已解决思考块体验，仅记录需求撤回，不据此断言本机 fork 已同步该版本。

## 既有上游公共依据

## TUI Talos 主题实测（2026-09-29）

【实测】在 `C:\DEV\develop\Talos-CLI` fork HEAD `370c7646fdfd51ef8a812a4966538884b73db556` 上，新增 `talos` 内置主题，保留 `minimax` 默认主题和既有主题选择。改动仅涉及 `packages/tui/src/tui/theme/palettes.ts` 及两处既有测试断言；未新增文件、依赖或运行时状态。

验证结果：显式 Node `v24.15.0`（将 `C:\Program Files\nodejs` 置于 PATH）下，主题 palette、runtime、custom-themes、theme-picker、composer 共 5 个测试文件 **137/137** 通过；standalone TypeScript 通过；source inventory **4276 files** 通过；`pnpm build` 成功，产物报告 `Built MiniMax Code 0.5.7 from 6267 source files`；`git diff --check` 通过。首次未覆盖 PATH 的构建显示 Node `v22.15.0` engine warning，随后已用显式 Node 24 重跑成功，该 warning 不计入最终构建结果。

【主人待验】实际终端中通过 `/theme` 选择 `Talos`，观察欢迎区之外的正文、输入区、菜单、工具/审批提示的黄灰配色，再切换 dark/light、缩窄终端并取消返回原主题。未发送消息、未测试 provider、未改思考块、未改默认主题；本次机读结果不等于完整 TUI 视觉通过。

## TUI 欢迎 ASCII 标题依据与实测（2026-09-28）

【源码】欢迎视觉资产集中在 `packages/tui/src/tui/shell/welcome/design.ts`，`hero.ts` 按宽度选择 full/medium/micro/fallback；本轮复用这条管线，不改组件布局或主题系统。

【实测】工作树基线为 fork HEAD `370c7646fdfd51ef8a812a4966538884b73db556`。本轮将 full hero 调整为内置 5×5 ASCII `TALOS` 标题 + 更小机械臂，中窄屏降为单行 `TALOS` + compact arm，极窄屏保留 fallback。相关欢迎渲染测试的新增断言、standalone TypeScript、source inventory 和 diff 检查已通过；整套 `tui-app.test.ts` 仍有 17 项既有文案/本地化断言失败，未把它们归因于本轮或宣称整套通过。构建和主人目视尚未完成。

【主人待验】显式 Node 24 构建 fork 后观察宽屏、20–31 列中屏和极窄终端；标题应在机械臂上方、无厂商大字 logo、无横向溢出。只验画面，不发送消息。

| 等级 | 来源 | 只支持什么结论 |
| --- | --- | --- |
| 【文档】 | 上游 `README_ZH.md:126`、`README.md:126` | CLI 提供 `mcode acp` 入口；未证明具体方法、字段和恢复语义 |
| 【源码：清单】 | 上游 `package.json` | 本地源码版本字段为 0.5.7；不证明本机已安装 CLI 是该版本 |
| 【文档】 | 上游 `README_ZH.md` 的安装、数据目录、继续工作章节 | 存在 Windows 启动器、账号/BYOK、TUI 队列等说明；不能推导 ACP 路径具有相同行为 |
| 【文档】 | 上游 `LICENSE` 及 `LICENSE-STATUS.md` 入口 | 第一方默认 MIT；第三方、商标、字体等不能概括成同一许可。此次只读 LICENSE，未做分发审计 |

## 第 1 轮握手实测

核对日期：2026-09-28。使用显式 `C:\\Program Files\\nodejs\\node.exe` 运行仓库锁定的 `tsx` 与探针；未创建会话、未发送 prompt、未调用模型。CLI 启动器与入口由探针解析，不复制凭据。可重跑命令见 README。

| 等级 | 实测结果 | 说明 |
| --- | --- | --- |
| 【实测】环境 | Node `v24.15.0`，可执行文件 `C:\\Program Files\\nodejs\\node.exe`；mcode 入口 `C:\\Users\\pachu77\\AppData\\Roaming\\npm\\node_modules\\@minimax-ai\\code\\cli.js`；`mcode --version` = `0.5.7` | 与源码提交 `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46` 的版本清单一致；PATH 默认 Node `v22.15.0` 仍不满足要求，因此不能用裸 `npm run` 作为通过证据 |
| 【实测】initialize | `protocolVersion: 1`；`agentInfo: minimax-code / MiniMax Code / 0.5.7`；`loadSession: true`；MCP `http: true, sse: true`；prompt 的 image/audio/embeddedContext 均为 `false`；session capabilities 含 list/fork/resume/close；`authMethods: []`；stderr 为空 | 证明稳定 ACP v1 握手和 stdout/stderr 分离在本机可重复；不证明创建、prompt、取消、审批或恢复行为 |

探针映射：`spike/initialize.ts` 以源码确认的 `mcode acp` 入口启动子进程，使用 SDK `1.3.0` 的 `ndJsonStream`、`client.connect(stream)` 和 `connection.agent.request(acp.methods.agent.initialize, ...)`；stdout 仅交给 ACP 流，stderr 单独收集。当前脱敏 trace 只保留上述合成握手摘要，未保存用户会话或凭据。

## 第 2 轮探针依据

实施前复核日期：2026-09-28。MiniMax 源码 HEAD 仍为 `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`；以下先读源码与 SDK 类型，再运行真实请求。

| 来源 | 已确认的请求/事件 | 探针处理约束 |
| --- | --- | --- |
| 【源码】`packages/tui/src/acp/agent.ts:494-593`；SDK `schema/types.gen.d.ts:4647-4680` | `session/new` 接收绝对 `cwd`、`mcpServers`；MiniMax 先校验目录与认证，再返回 `{ sessionId, ...control }` | 测试 cwd 独立创建并传绝对路径；只把返回的 `sessionId` 作为后续身份，不猜 ID |
| 【源码】`packages/tui/src/acp/agent.ts:1068-1153`；SDK `schema/types.gen.d.ts:5095-5124` | `session/prompt` 接收 `{ sessionId, prompt: [{ type: 'text', text }] }`；运行中通过 `client/session/update` 推送；最终响应含 `stopReason` | 文本 update 按到达顺序追加；不按文本内容去重；记录 messageId/toolCallId（若有）和最终 stopReason |
| 【源码】`packages/tui/src/acp/agent.ts:1246`、`packages/tui/src/application/run-coordinator.ts:349`；SDK `schema/types.gen.d.ts:5855-5870` | `session/cancel` 是 `{ sessionId }` notification；原 prompt 请求最终返回 `stopReason: 'cancelled'` | 先记录取消发送，再等待权威 prompt 响应；未收到响应不宣称已取消 |
| 【源码】`packages/tui/src/acp/agent.ts:763-837`；SDK `schema/types.gen.d.ts:4840-4890`；上游测试 `packages/tui/test/unit/acp-agent.test.ts:1576-1646` | `session/load` 接收原 `sessionId`、原 `cwd`、`mcpServers`；先按时间顺序回放历史，再返回控制配置，响应不重复 sessionId | 新进程重新 initialize 后只使用持久化的 sessionId/cwd；load 响应不可覆盖原身份；回放通知与后续 prompt 分开记录 |
| 【源码：测试定义】`packages/tui/test/unit/acp-agent.test.ts:2285-2369`、`:3247-3263` | 权限请求通过 `client/session/request_permission` 发送动态 options，回复带实际 `optionId`；上游单测覆盖 allow-once、allow-always、deny 与简单问卷 | 未见真实请求前不宣称审批已触发；若触发，原样记录脱敏 options/optionId，重复或取消后的回复不重发 |

## 第 2 轮真实探针实测

实测日期：2026-09-28。脚本为 `spike/session-probe.ts`，使用 `.talos/round2-*` 下的可丢弃 cwd；每次启动独立 MiniMax 进程，未把原始流式日志写入仓库。合成输入均为本轮脚本固定文本，临时审批文件已在脚本结束时清理。

| 场景 | 真实结果 | 结论与限制 |
| --- | --- | --- |
| 正常文本 | `session/new` 返回 sessionId；prompt `Only reply with the exact text talos-ok. Do not call tools.` 返回 `stopReason: end_turn`；收到连续 `agent_message_chunk`，同一 messageId 的多个片段按顺序到达；stderr 为空 | 正常回合与流式通知已实测。原始 chunk 含 `<think>...</think>` 文本，产品如何处理该引擎输出仍需在 UI 轮次决定，不能把探针文本直接当最终显示文案 |
| 取消 | 同一会话第二个长 prompt 发送 `session/cancel` notification 后，原 prompt 返回 `stopReason: cancelled` | 取消权威结局已实测；本次取消在模型产生可见文本前生效，尚未证明“部分文本后取消”的组合 |
| 新进程 load/继续 | 新进程 initialize 后以原 sessionId、原 cwd 调 `session/load`；响应键为 `modes`、`configOptions`，不含 sessionId；先回放 2 条 user message 与 1 条 assistant message，再发送继续 prompt，返回 `stopReason: end_turn` | load 不依赖响应重复 sessionId；历史顺序和继续输入已实测。被取消的长 prompt 只回放 user message，没有伪造 assistant 结局 |
| 工具位置与部分更新 | 审批尝试中收到 `tool_call` / 多个 `tool_call_update`，同一 toolCallId 的状态从 `in_progress` 到 `completed`，locations 返回临时文件路径 | 工具身份、状态和位置通知已见；本轮尚未实现应用侧事实合并器 |
| 审批拒绝尝试 | 新会话、客户端预备选择拒绝，但实际 `client/session/request_permission` 次数为 0；文件真实创建，内容为 `acceptance-ok`，最终 `end_turn` | 当前账号/权限规则没有触发 ACP 审批，不能宣称拒绝生效；按计划停止该验收项，不改规则、不用模拟卡片替代 |
| 审批 allow-once 尝试 | 另一新会话、客户端预备选择 allow-once；实际 permission 请求仍为 0；文件真实创建，内容为 `acceptance-ok`，最终 `end_turn` | 只能证明当前设置下工具可直接执行；未证明 allow-once optionId、规则作用域或批准后行为 |

脱敏结论：正常、取消、load/继续、工具更新均有真实 trace；审批未触发是实测事实，不是探针缺失。后续若主人希望继续审批专项，先从现有权限配置和源码确认可触发条件，再用新会话复测。

## 单会话链路源码证据

核对日期：2026-09-28。以下均基于提交 `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`，版本清单 `0.5.7`；本次复核工作树干净。表中路径以只读源码根目录 `C:\DEV\develop\Talos-CLI\` 为前缀，行号对应此提交。除明确标为【实测】外，均未运行真实 CLI 或模型，相关单测只阅读、未执行。

“拟映射”指 [实施计划](../plan.md) 要建立的内部契约，目前无产品实现；完整运行时报文形状和脱敏 trace 仍须探针补齐。源码和安装包版本号一致也不自动证明构建来源一致。

| 等级与来源 path:line | 源码事实 / 报文形状 | 拟映射与缺失处理 |
| --- | --- | --- |
| 【源码】`packages/tui/package.json:23`；`packages/tui/src/cli/program.ts:107`；`packages/tui/src/acp/stdio.ts:17` | 依赖 SDK `1.3.0`，`mcode acp` 通过 stdin/stdout 使用 `ndJsonStream` | 使用稳定 SDK；协议版本取 SDK 常量与真实协商结果，不臆造固定版本。分帧和 Windows 启动仍待实测 |
| 【源码】`packages/tui/src/cli/run-acp-command.ts:35` | 建立运行时，将 console 输出重定向 stderr，输入输出传给 ACP 服务；有终止信号和 shutdown 路径 | stdout 为协议流，stderr 单独记录；子进程退出和 prompt 结局分开。真实启动时是否混入其他输出待测 |
| 【源码】`packages/tui/src/acp/agent.ts:357`、`:433` | 每个进程仅接受一个 ACP client 连接；initialize 返回 protocolVersion、agentCapabilities、agentInfo 和扩展元数据，保存 clientCapabilities | 浏览器刷新不得创建第二个 ACP 连接；保存实际能力，不把声明视为所有方法均实测通过 |
| 【源码】`packages/tui/src/acp/agent.ts:494`、`:561`、`:593` | new 使用请求 cwd 创建会话，响应包含 sessionId、modes、configOptions | 新建关联使用响应身份；cwd 来自已验证的请求目录。创建失败/取消清理不能算创建成功 |
| 【源码】`packages/tui/src/acp/agent.ts:763`、`:824`、`:837`、`:1711` | load 在返回控制配置前回放历史，响应不重复 sessionId；resume 只附着，不进行同样的历史回放；已有会话的 cwd 必须匹配持久化目录 | pending 保存目标 sessionId；恢复使用 load 与原 cwd。加载中的历史按请求代次隔离，失败不保留半份历史冒充完整 |
| 【源码】`packages/tui/src/acp/agent.ts:1068`、`:1083`、`:1153`、`:1207` | 活跃 prompt 存在时拒绝第二个普通 prompt；通过 session/update 通知输出；prompt 响应以 stopReason 表达 end_turn、cancelled、max_turn_requests，其他运行失败可变成协议错误 | 本地回合关联请求，禁止普通并发发送；最终响应与流式内容分别处理。不能把 TUI 队列或扩展 steering 当作普通 prompt 行为 |
| 【源码】`packages/tui/src/acp/agent.ts:1246`；`packages/tui/src/application/run-coordinator.ts:349` | cancel 注册为 notification，触发控制器与运行协调器中止；原 prompt 才返回最终结局 | 本地先进入 stopping；等待该 prompt 结局。超时、断连只表示未确认，不能自动标为已中止 |
| 【源码】`packages/tui/src/acp/updates.ts:24`、`:36`、`:113` | 文本 update 可带 messageId；tool_call 与 tool_call_update 携带 toolCallId，rawInput/rawOutput/content/locations 可缺失；上游投影自身有消息/工具去重 | 文本增量追加，不能按文本内容去重；工具按身份合并，只更新实际存在字段。标准输出未给应用可直接依赖的每次通知 turnId |
| 【源码】`packages/tui/src/acp/interactions.ts:563`、`:575`、`:880` | session/request_permission 带 sessionId、toolCall 和动态 options；回复 outcome 为 selected 时读取 optionId。allow-always 仅在运行时支持时提供；连接、附着和调度取消都影响请求 | 保存反向请求身份和实际选项，回复仅一次；signal 失效后关闭操作入口。客户端回复发送不等于文件写入完成 |
| 【源码】`packages/local-runtime/src/api/local-permission-approval-service.ts:140`、`:148`、`:160` | 有规则内容或整工具规则时，allowAlways 写 global；其他决策写 session，deny 写拒绝行为，其余写允许行为 | allow-once 与拒绝可能形成会话范围规则，不能宣称绝对只影响一次。真实持久化效果未测；验收拒绝与批准使用不同新会话 |
| 【源码】`packages/tui/src/acp/interactions.ts:662`、`:680` | 未提供表单能力或表单失败时，可将支持的简单问卷转成 request_permission 选项；不支持的问卷有 dismiss 路径 | 审批 UI 不能硬编码两按钮，需展示实际 optionId/name；复杂问卷能力尚不在首版承诺内 |
| 【源码】`packages/tui/src/acp/control-state.ts:22`；`packages/tui/src/acp/updates.ts:85`；`packages/tui/src/acp/agent.ts:1328` | 控制状态从运行时取得；usage 缺上下文或容量无效时可不生成；locations 来自预览/工具输入；计划投影受客户端能力等条件影响 | 配置只读展示，usage 缺失标明未报告；locations 仅表示涉及路径，不能证明修改。demo 三步计划不是可直接映射的真实执行步骤 |

SDK 稳定入口的包声明在规划时经 npm 包元数据及内存读取声明文件核对，未安装依赖；复现产品契约仍以第 1 轮实际安装的锁定依赖和握手为准。客户端不声明尚未实现的文件、终端、表单、计划或终端认证能力；这只是产品策略，不是“引擎永远不会发出反向请求”的证明。

关联源码单测入口为 `packages/tui/test/unit/acp-agent.test.ts`：`:1127` 握手/文本，`:1368` load/resume/close，`:1543` 历史顺序，`:2131` cwd，`:2269` 审批，`:2330` 非法永久批准，`:2636` 问卷，`:3269` cancel，`:5615` 单连接。以上为【源码：测试定义】，不是本项目测试通过或真实行为实测。

## 仍需查证与实测

从上游 README 的 ACP 入口出发，用 `rg` 找 CLI 命令注册与 ACP 实现，再按一条最小请求链读相关 handler 和类型。仅对计划用到的接口登记实际 path:line，不需要大规模探索，也不要凭包名猜路径。

实现前按需补齐字段及映射，真实探针后再添加【实测】证据；当前源码复核不能覆盖下表全部边界：

| 问题 | 需要确认的内容 | 当前 |
| --- | --- | --- |
| 启动与 initialize | 安装产物与源码来源对应、Windows 启动、真实分帧和能力协商 | 【实测】Node/CLI 版本、Windows 显式 Node 启动、ACP v1 能力协商及空 stderr 已通过；跨块分帧与异常退出仍未专项覆盖 |
| 创建与继续 | 实际字段、失败清理、cwd、session id、配置项 | new/load/resume 主路径已源码核对；未实测 |
| prompt / 工具 | 实际流式种类、部分更新、回合关联、结局与错误 | 主路径及投影已源码核对；未实测 |
| 取消 | 取消结局与超时恢复；未来队列/steering 的不同语义 | 普通 cancel 已源码核对；扩展仍需专项调查，均未实测 |
| 审批与文件 | 实际触发条件、持久化效果、真实 I/O、未声明能力时的行为 | 选项/规则作用域已源码核对；未实测 |
| 历史与删除 | 分页、跨 cwd、close 与删除的区别、恢复完整性 | load/resume 主路径已源码核对；完整生命周期及删除未核完，均未实测 |
| 模式 / 模型 / usage / 计划 | 配置作用域、缺失字段、真实计划语义与客户端能力 | 部分投影已源码核对；未形成完整映射，未实测 |

## 中立引擎 fork 评估取证（2026-09-28）

只读核对本机源码，HEAD 为 `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`、版本 `0.5.7`，读取前后工作树均干净。下表上游路径统一相对于绝对根目录 `C:\DEV\develop\Talos-CLI\`；Talos 自身路径另列。这次未构建 fork、未运行上游测试、未配置或调用自定义模型、未做网络流量审计。候选取舍见 [plan](../plan.md)，不将源代码能力或测试定义升级为本机实测。

| 等级与 path:line | 核对结果 | 映射到候选方案 / 尚未证明 |
| --- | --- | --- |
| 【文档】`LICENSE:3`、`:5`、`:12`；`LICENSE-STATUS.md:3`；`THIRD_PARTY_NOTICES.md:3` | 第一方默认 MIT，允许修改、合并、发行等，但须保留版权及许可文本；Sandbox Runtime、Pi、模型目录和内嵌产物各有声明 | 可独立品牌和发行；不以“全删 MiniMax 字符串”为完成指标。产品文案与许可证归属分开，未做完整分发审计 |
| 【文档】`README_ZH.md:88`、`:101` | BYOK 不要求先登录 MiniMax；第三方端点使用 `custom_provider` | 中立 provider 有现成基础；不等于当前 Talos 已走该路径 |
| 【源码】`packages/tui/src/application/login-gate.ts:29`、`:57`；`packages/tui/src/runtime/adapter.ts:345` | 访问门禁区分 token-plan 与 BYOK；托管认证同步和会员读取有条件门控 | 不必通过删除所有认证检查来接第三方；fork 应移除 MiniMax 专属托管路径，保留实际 provider 的凭据和工具权限语义 |
| 【源码】`packages/tui/src/provider/contract.ts:3`；`packages/tui/src/provider/application.ts:22` | 自定义 API 格式包含 `anthropic-messages`、`openai-completions`、`openai-responses`；provider 列表仍显式插入 MiniMax OAuth/API Key 项 | 复用通用协议适配与 provider 管理；中立产品需要清理专属入口及默认项，不能只替换标题 |
| 【源码】`packages/local-runtime-v2/src/service/model-system/resolution/model-resolver-byok.ts:75`、`:101`、`:180` | 自定义路由接收端点、密钥/受支持 OAuth、模型限制、headers 和兼容配置；无密钥且无 OAuth 会失败 | 模型服务认证仍必需；无鉴权本地服务器需单独设计支持，不能宣称现成具备。协议相同也不证明所有模型工具调用/思考块均兼容 |
| 【源码：测试定义】`test/byok.test.mjs:24`、`:435`、`:449`、`:473` | 测试使用本地假 provider，定义免托管登录的文本、历史继续、真实读文件工具结果回传 | 可作为 fork 回归基础，但本轮未运行，且不证明真实外部模型质量或所有网络出口均已隔离 |
| 【源码】`packages/tui/src/acp/agent.ts:433`、`:471`、`:2110` | ACP 握手品牌和终端登录入口由引擎给出；会话访问经既有登录门禁 | fork 可保留标准 ACP 与 Talos 隔离，改变真实 agentInfo 和错误文案；原引擎身份不得在诊断中伪报成 fork |
| 【源码】`packages/local-runtime-v2/src/service/model-system/resolution/file-api-gateway-auth.ts:16`；`packages/local-runtime-v2/src/service/plugin-system/app/cloud-client.ts:90`；`packages/local-runtime-v2/src/service/prompt-config/runtime/runtime-auth.ts:22`；`packages/agent-modules/permission/src/classifier/cloud-classify-client.ts:61` | File API、云连接器、云 prompt 配置、权限云分类有各自的认证/运行模式条件 | 是待逐项追踪的耦合点，不断言当前 ACP 会全部调用。中立发行需禁用/排除/替换相应集成；不能直接把审批、安全沙箱也删掉 |
| 【源码】`packages/config/src/telemetry-policy.ts:5`、`:11` | 遥测通道需显式 opt-in，全局 opt-out 优先，配置不可读时不授权上传 | 不应称上游强制遥测；fork 的具体网络独立性仍需完整出口清单和运行审计 |
| 【源码】`packages/config/src/data-dir.ts:5`；`packages/tui/src/update/install-source.ts:8`；`scripts/build.mjs:129`、`:145` | 默认数据目录 `.minimax`、旧 `.mavis`；发行/更新识别 MiniMax 包名；构建复制 mcode-tools | 中立 fork 需要独立数据命名空间与更新渠道，不能自动写入或迁移原账号/历史，也不能更新回原版 |
| 【源码】`scripts/lib/mcode-tools-artifact.mjs:8`、`:94`；【文档】`THIRD_PARTY_NOTICES.md:8` | 缓存缺失时构建从公开 `@minimax-ai/code@0.3.11` tarball 取固定版本 mcode-tools 并校验；保留其 notices | “源码开源”不等于此构建已完全摆脱厂商发行产物。需确认依赖功能、源码可构建性以及排除/替代方式；当前未检查该产物内部实现 |
| 【源码】`packages/tui/src/tui/theme/contracts.ts:11`；`packages/tui/src/tui/theme/custom-themes.ts:92`、`:183`、`:269`；【文档】`packages/tui/docs/theme-config.md:46` | TUI 有语义配色、深浅外观、自定义主题加载及监听机制 | Endfield 风格配色可从主题扩展做起；布局、字体、鼠标/键盘交互不等同于 Web CSS，需要单独可见验收 |
| 【源码：Talos】`C:\DEV\develop\T3rra-C0d3-Talos\app\index.html:27`、`:54`；`C:\DEV\develop\T3rra-C0d3-Talos\app\talos.js:55`、`:102` | 主页面多个 MiniMax 名称是 Talos 静态模板和渲染文案写死 | 仅改善 Talos 产品品牌不需要 fork 引擎；本次只读未改 UI |

【未验】新 fork 的独立构建、真实 custom provider 经 ACP 的完整工具/取消/审批/load 链路、厂商网络出口隔离、无凭据旧数据目录下启动、TUI 主题实际渲染、上游变更合入后的兼容性均未验证。

### 第三方预设与平级 provider 取证（2026-09-28）

这次主人确认：源码已有的第三方 provider 预设可以保留，但 MiniMax 不应在产品里拥有固定优先级。以下是实现“平级”的第一批边界；先改顺序与默认绑定，再决定是否裁剪厂商网络入口。

| 等级与 path:line | 读到的事实 | 当前处理结论 |
| --- | --- | --- |
| 【源码】`packages/tui/src/provider/application.ts:22-61` | `snapshot()` 先取自定义 provider，但返回数组固定按 Codex（如有）、MiniMax OAuth、MiniMax API Key、custom provider 的顺序拼接；MiniMax 的 `active` 只反映当前 MiniMax 来源 | 第一刀将 provider 视图改为统一排序/统一分组，不再因为 provider 类型把 MiniMax 固定插在前面；保留 active、readOnly、状态和凭据展示语义 |
| 【源码】`packages/local-runtime-v2/src/service/model-system/catalog/provider-presets/provider-presets.service.ts:20-34`、`:76-87`、`:256-273` | models.dev 预设明确排除四个 MiniMax provider ID；其余第三方预设保留，区域 pinned 列表只影响第三方预设展示顺序 | 第三方预设目录继续保留；区域推荐顺序先不删除，因为它不是 MiniMax provider 置顶，后续单独评估是否需要改为用户可选或完全字母排序 |
| 【源码】`packages/local-runtime-v2/src/service/model-system/catalog/provider-presets/provider-presets.client.ts:9-16`、`:113-134` | 中国区目录和 pinned provider 配置默认从 MiniMax 相关 origin 获取；失败时回落到本地区域默认数组 | 这是厂商网络耦合点，不与“provider 平级”混为同一改动；先记录并在独立网络出口审计轮处理，不能只改 UI 顺序就宣称中立 |
| 【实测】`packages/local-runtime-v2/src/service/model-system/catalog/provider-presets/provider-presets.service.test.ts`，使用 `vitest.oss.config.mjs` | 37/37 通过；第三方预设保留、区域默认排序、远程 pinned 覆盖、失败回落和超时处理均符合源码定义 | 预设排序机制可保留；是否去除 MiniMax 相关网络 origin 属于后续中立网络审计，不在本轮改动 |
| 【文档】`docs/examples.md:27-59` | CLI 已支持 `/model`、`/provider`、第三方预设和 `custom_provider`，成功测试后才保存并可设为当前模型 | 可复用现有第三方配置路径；后续探针优先验证 custom provider 的保存、默认选择和 ACP 使用，不要求用户先配置 MiniMax 登录 |
| 【源码】`packages/config/src/config.ts:1711-1721`、`:1869-1884`；`packages/config/src/byok-config.ts:260-300` | 只有 managed/prod runtime 新建配置时才写入 `minimax/MiniMax-M3`；非 managed 的 `pnpm dev`/npm 路径不预置模型，由 onboarding/provider 配置接管。managed runtime 会补齐 `provider.minimax`，但不会覆盖用户自己的 `custom_provider` | “平级 provider”不能靠改一处排序完成；Talos 独立发行应继续走非 managed 配置语义，若未来做生产桌面壳，再单独定义无默认模型或首个已验证 custom provider 的选择规则 |
| 【源码】`packages/tui/src/application/login-gate.ts:24-38`；【实测】`test/byok.test.mjs`（2026-09-28） | 登录门禁按当前模型来源区分：BYOK 不要求 MiniMax 登录；managed MiniMax 模型仍要求自己的登录。隔离 BYOK 套件完成保存 provider、设为默认、继续会话、真实读文件工具回传，并确认 managed 模型登录失败 | 第三方 provider 的认证边界已经可复用；该套件使用假 provider，不证明外部模型或完整隔离，不应删除通用登录/权限安全逻辑 |

因此，该轮的“平级”定义为：MiniMax、第三方预设和用户自建 provider 都是可见的 provider 来源；没有按类型固定置顶，也不因为缺少 MiniMax 登录就阻止使用已测试的 custom provider。已落地的第一刀是 `packages/tui/src/provider/application.ts`：provider 视图按名称和 ID 统一排序，不再固定把 MiniMax 放在 custom provider 前面；MiniMax 的 active、readOnly、状态和凭据语义保持不变。对应回归断言已补入 `packages/tui/test/unit/provider-application.test.ts`，显式 Node 24 下 targeted Vitest 19/19 通过。BYOK 假 provider 套件也已实测通过；后续第三方请求的有限证据见本页“真实 custom provider 文本实测”。

### 中立默认模型审计与隔离开关（2026-09-28）

本轮先读源码再决定最小改动。核对对象仍为 fork HEAD `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`、版本 `0.5.7`；以下结论是【源码】，尚未把 Talos 生产发行当作已验收。

| 等级与 path:line | 源码事实 | 本轮实现 / 限制 |
| --- | --- | --- |
| 【源码】`packages/config/src/config.ts:168-181`、`:1869-1884` | `isManagedRuntime()` 在 prod/staging 或显式 managed 时开启；非 managed npm/dev 路径不预置配置。managed 新建 `config.yaml` 时写入 MiniMax provider 和 `defaultModel: minimax/MiniMax-M3` | 保留上游 managed 语义；不把默认模型改空，也不影响当前开发路径 |
| 【源码】`packages/config/src/byok-config.ts:297-342`；`packages/config/src/config.ts:1987-2010` | managed 读配置时会补齐或保护 `provider.minimax`；用户自己的 `custom_provider` 不被这段覆盖 | 增加显式中立运行开关后，跳过自动补齐/保护，但保留用户已写入的 provider 与 defaultModel，避免隐式删除或迁移 |
| 【源码】`packages/config/src/config.ts:1643-1647` | managed 配置中的 MiniMax baseURL 会按当前区域同步 | 中立开关同时跳过该同步，防止把中立运行重新指向厂商 origin |
| 【未验】 | 中立开关下的真实第三方模型、工具、取消、load、审批和网络出口仍未验证 | 只做配置层安全闸，不能把开关存在当作中立发行完成；先补构建身份与配置继承的离线证据 |

本轮实现的开关名为 `TALOS_NEUTRAL_RUNTIME=1`。它是显式 opt-in，默认关闭；作用是让 managed/prod 运行时不自动创建或回填 MiniMax 默认 provider。已有用户配置保持原样，未配置 provider 时由上层 onboarding/provider 配置负责提供入口。该开关不删除通用凭据、权限、审批、沙箱或 provider 代码，也不承诺厂商云能力已被裁剪。

### 原生 provider 与重复探针复核（2026-09-28）

【源码】以下引擎路径均相对于 `C:\DEV\develop\Talos-CLI\`，提交 `cf8bd414b331b54f32d2bde2a3d66e56fdd7e565`，版本字段仍为 `0.5.7`；本次只读复核，不调用引擎或模型。

| 源码位置 | 事实与可用结论 |
| --- | --- |
| `packages/tui/src/tui/commands/catalog.ts:402`；`packages/tui/src/tui/controller/product/command-flow.ts:1330` | `/provider` 注册后打开已有 provider 管理器；不能把 CLI 的 add/test/list 子命令直接当成 TUI 斜杠命令 |
| `packages/tui/src/tui/features/provider/onboarding.ts:361`、`:420`、`:649`、`:681` | 已有 Custom provider、模型发现/手填、测试保存并使用；预设和自定义配置无需在 GUI 重造 |
| `packages/local-runtime-v2/src/service/model-system/connectivity/provider-request.ts:65` | 模型发现使用 HTTP `/models`（按 API 类型组合路径），不是已证明存在的 TUI `/models` 命令 |
| `packages/tui/src/cli/program.ts:168`；`packages/tui/src/cli/provider-command.ts:82`；`packages/local-runtime-v2/src/service/model-system/management/service-candidate-operations.ts:153` | CLI provider 入口可打开原生 TUI；`provider add --use` 通过 saveCandidate 先跑连接测试，并非纯本地写配置 |
| `packages/config/src/config.ts:1880` | 非 managed 环境新配置可从默认 home 数据目录读取并复制 config，还会调用原文件权限处理；`MINIMAX_DATA_DIR` 不单独保证无旧凭据读取/无旧文件操作。此分支先于中立开关判断，不能宣称该开关覆盖它 |
| `packages/config/test/builtin-model-fallback.test.ts:113`；`packages/config/src/config.ts:2054` | 保留配置测试写了 `provider.custom_provider`，真实解析入口为根级 `custom_provider`；原测试通过不证明正确 provider 被保留 |

【源码：Talos】提交 `cf0b97a` 的 `C:\DEV\develop\T3rra-C0d3-Talos\spike\custom-provider-probe.ts:36` 使用 inspectEnvironment；`src/host/environment.ts:35`、`:47` 默认从 PATH 解析已安装的 `@minimax-ai/code/cli.js`，只允许显式环境覆盖，不保证使用 fork。探针先执行 `provider add --use`，再发 `session/prompt`，存在连接测试和对话两段可能消耗模型额度的路径；不能将一次点击描述为仅一次生成请求。实际网络请求数、重试及计费 token 无账单或完整 trace 佐证，不推算数字。

【未验】上述源码风险不证明那次运行一定读取了旧凭据，也不证明 fork 代码一定未被显式选择；它们说明此前“隔离可靠”“已验 fork”的结论缺乏证据。后续测试应锁定构建身份并离线验证配置继承，而非重复真实连接。

### 配置离线回归规划依据（2026-09-28）

【源码】Astra 复核 `C:\DEV\develop\Talos-CLI` 的 HEAD 仍为 `cf8bd414b331b54f32d2bde2a3d66e56fdd7e565`，工作树干净。本次未运行引擎、测试或模型请求。

- `packages/config/test/builtin-model-fallback.test.ts:16` 已用临时 data dir 和显式 managed 模式；`:113` 的中立配置保留用例需改为根级 `custom_provider`，断言也应读取 `config.custom_provider`。应核对 URL、合成 key、模型及默认选择，并在 reset 后重读，不能只断言名称或默认模型字符串。
- `packages/config/src/config.ts:168` 显式 `__MAVIS_RUNTIME_MANAGED=0` 可覆盖 prod 默认；`:1880` 非 managed 分支先于中立分支读取默认 home 的配置；`:1890` managed + neutral 新配置仅写 logLevel；`:2054` 解析根级 custom_provider。`packages/config/src/byok-config.ts:67` 保留对象形状并规范 thinking 字段。以上是配置事实，不证明连接可用或完整数据隔离。
- `packages/config/test/config-file-permissions.test.ts:37` 提供 `os.homedir` mock 的现有做法，`:47` 后恢复 mocks/env。该文件的 POSIX 权限套件在 Windows 跳过；新配置内容断言应放在原 builtin-model-fallback 测试内并在 Windows 实跑，不复制平台 skip。测试 home 和 data dir 均须位于测试创建的临时根内，不触及真实 home。
- `test/vitest-suites.json:161` 已登记原测试；`vitest.oss.config.mjs` 从清单导入测试并将 workspace 包映射至源码。直接运行此测试验证 fork 源码配置行为，不需要启动系统 mcode 或构建 CLI。它也不证明将来运行的 CLI 产物来自该提交。

【未验】预期非 managed + neutral 仍会继承虚构 home 的配置；后续离线用例用于复现这项已知限制，不把“复制成功”称为隔离通过。更改继承策略、发行目录与构建身份另行规划。

### 配置离线回归实测（2026-09-28）

【实测】由 Luna 在 fork 工作树 `cf8bd414b331b54f32d2bde2a3d66e56fdd7e565` 上只修改 `packages/config/test/builtin-model-fallback.test.ts` 后运行：显式 Node `v24.15.0`、Vitest `4.1.11`，该文件 7/7 通过；引擎 standalone TypeScript 通过；`scripts/source-inventory.mjs` 通过（4276 files）。Talos 交接、demo 和 diff 检查也通过；本轮未启动 CLI、未发真实模型请求。

测试现在以根级 `custom_provider` 验证 URL、合成 key、模型、`defaultModel` 以及 reset 后重读一致。另两个用例使用分离的 fake home/data dir：managed + neutral 不复制 fake home、不种 MiniMax；显式 non-managed + neutral 仍复制 fake home 配置并解析出 synthetic key/default model。这复现并固定了现有继承行为，属于隔离缺口证据，不是中立隔离通过。生产配置代码未改，fork CLI 构建来源仍未锁定。

### TUI 视觉接线依据（2026-09-28）

本轮实施前读取相邻引擎 fork 当前 HEAD `b2c993022a1ee8ecaf90bb754ea66e65031ce5d4`，工作树干净。以下只覆盖欢迎页与主题渲染这一个视觉切片；不把品牌、鉴权、provider、命令改名或会话逻辑混进来。

| 等级与 path:line | 源码事实 | 本轮映射 / 未覆盖 |
| --- | --- | --- |
| 【源码】`packages/tui/src/tui/shell/welcome/design.ts:4-57`、`:59-85` | 欢迎页文案、入口提示、英雄图最小宽度和 ASCII 字样集中在一个 design 常量；`hero.ts` 读取其 `hero` 尺寸和图形数组 | 将欢迎页视觉数据替换为 Talos 机械臂与中立文案；保留窄屏降级和既有布局算法。真实终端视觉仍需运行验收 |
| 【源码】`packages/tui/src/tui/shell/welcome/hero.ts:11-38` | 英雄图按终端宽度选择 full/medium/micro/fallback，并使用主题颜色居中渲染 | 复用现有渲染管线，将 36 列机械臂作为宽屏与中屏图形；不新增终端绘图库 |
| 【源码】`packages/tui/src/tui/shell/welcome/component.ts:79-164` | 宽、堆叠、紧凑三种欢迎布局都读取同一 design 常量；紧凑标题仍单独写有 `MCode` | 本轮只清理欢迎页可见标题与文案；不改状态、输入、会话和审批组件。其它运行文案仍可能显示 MCode，属于后续去品牌轮 |
| 【源码】`packages/tui/src/tui/theme/runtime.ts:14-56`、`theme/palettes.ts:27-56`、`:365` | 主题运行时以语义颜色渲染，默认 palette id 为 `minimax`；欢迎图颜色来自 `brand`、`wordmarkHighlight` 等角色 | 本轮沿用现有颜色角色，不改默认 palette、主题选择持久化或对比度契约，避免把视觉接线扩成主题系统重构 |

实现边界：只改引擎 fork 的欢迎设计数据及其直接显示标题；不改登录门禁、provider 列表、ACP、数据目录、更新器、遥测或 CLI 入口。验证优先使用现有 TUI 单测与 TypeScript/source inventory；未启动真实 CLI，不发送模型请求。

### TUI 视觉接线实测（2026-09-28）

【实测】引擎 fork 提交 `107c9cf`（父提交 `b2c9930`）已落地本轮视觉切片：欢迎页改用 03 装配机械臂的 full/compact/micro 三档字符图，宽/堆叠/紧凑布局的可见标题和提示改为 Talos 中立文案，英雄图沿既有主题语义色的 warning 角色渲染。保留旧导出名作为兼容别名，未改主题默认 id、鉴权、provider、ACP、数据目录、更新器或命令入口。

原执行记录：Node `v24.15.0` 下主题 palette 测试 `26/26`、欢迎应用筛选 `4 passed`（330 项被筛掉）、目标文件 ESLint、standalone TypeScript、source inventory `4276 files` 和 `git diff --check` 通过；另用 `tsx` 对宽度 80/30/15/8 做纯渲染预览。26 项不是 26 个欢迎页测试，也不是完整 TUI 套件通过。当时未启动真实 CLI、未发送模型请求；后来欢迎页的主人验收结论见 status，本次文档整理未重跑上述测试。

### Talos 专属登录入口（2026-09-29）

【源码】Talos-CLI fork HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 工作树。`packages/tui/src/index.ts:24-33` 在加载 CLI 前调用 `configureTuiRuntimeEnvironment`，后者在 `packages/tui/src/cli/environment.ts:69-74` 设置 `TALOS_NEUTRAL_RUNTIME=1`。以下是专属 MiniMax OAuth 的可用入口，不等同于第三方 provider 的 API Key 配置。

| 入口与源码 | 行为 | 本轮处理与边界 |
| --- | --- | --- |
| 【源码】`packages/tui/src/cli/program.ts:114-145`、`packages/tui/src/cli/auth-command.ts:29-62` | `talos login` 和 `talos acp login` 调用同一个 `runTuiLogin`，后者创建认证应用并启动浏览器授权 | neutral 模式在认证应用创建前拒绝，两条命令均给出 `/provider` 提示；不改第三方 provider 凭据 |
| 【源码】`packages/tui/src/tui/controller/product/command-flow.ts:1270-1273`、`:1521-1548`、`:1550-1564` | `/login`、provider 重登录回调和 `/checkin` 缺登录引导都进入区域选择器，随后调用 MiniMax OAuth | neutral 模式在区域选择器前拒绝，三条可见路径同样不会进入浏览器授权 |
| 【源码】`packages/tui/src/tui/controller/product/feature-flow.ts:949-968`、`packages/tui/src/tui/app.ts:310`、`packages/tui/src/provider/application.ts:29-76` | provider 管理页的 OAuth 重登录回调指向 `startMiniMaxLogin()`，快照原有 MiniMax OAuth 行 | neutral 模式不传入该回调、不显示 OAuth 行，并拒绝 Token Plan；MiniMax API Key、Codex OAuth 和 custom provider 保留 |
| 【源码】`packages/tui/src/application/login-gate.ts:8-12` | 缺登录文案仍把用户引导到 `/login` 或 `talos login` | neutral 模式改提示为 `/provider`；保留非 neutral 原文案和原生鉴权实现 |

【实测，离线】显式 Node `v24.15.0` 下，登录和 provider 定向回归连同现有 command-flow、login-gate 测试 **72/72** 通过；standalone TypeScript、构建（`Built Talos CLI 0.5.7`）、源码清单（4277 files）与引擎 `git diff --check` 通过。使用临时数据目录启动新构建：`talos --help` 不列 login/logout；`talos login`、`talos acp login` 均返回退出码 1 和 `/provider` 提示。测试注入假端口确认 neutral 快照无 MiniMax OAuth、保留 MiniMax API Key/Codex OAuth/custom provider，并在调用底层端口前拒绝 Token Plan。未请求模型或读取真实账号。

【未验】真实 TUI 的菜单外观、第三方 OAuth 完整登录、旧配置中已选 Token Plan 的后续行为，以及所有间接云功能入口尚未由本轮证明。专属底层模块暂留以利审计和上游同步；不等于 Talos 发行已完成中立化。

### Talos 预设目录网络出口（2026-09-30）

【源码】Talos-CLI fork HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 工作树。`packages/tui/src/cli/environment.ts:73` 在 Talos 入口设置 `TALOS_NEUTRAL_RUNTIME=1`。

| 路径 | 已核对行为 | 本轮映射 |
| --- | --- | --- |
| 【源码】`packages/local-runtime-v2/src/service/model-system/catalog/provider-presets/provider-presets.client.ts:34-51,73-101` | CN 刷新先向 MiniMax origin 请求 descriptor，再取镜像目录和图标；EN 直接请求 `models.dev/api.json` | neutral 模式 CN/EN 均直接访问 `models.dev`；非 neutral 路径保留 |
| 【源码】同一 client `:106-136`、`provider-presets.service.ts:75-100` | 列表查询向 MiniMax `common_config` 请求置顶 provider IDs，失败才用本地区域数组 | neutral 模式直接用本地区域数组，不请求 `common_config` |
| 【源码】`provider-presets.service.ts:272-348`、`provider-presets.repository.ts:15-45` | 后台刷新写快照；读取本地与打包快照；快照含图标 base URL | 保持离线快照，但不复用旧镜像 ETag 或向界面提供旧镜像图标地址 |

【未验】遥测、诊断、反馈、云插件等其他厂商出口另轮审计；本轮不承诺全进程零 MiniMax 请求。

【实测，离线】注入 fetch 的预设目录测试在 Node `v24.15.0` 下 **39/39** 通过：CN neutral 仅向 `https://models.dev/api.json` 发刷新请求，不请求 MiniMax descriptor 或 `common_config`；直连成功写入 `models.dev` 图标来源，失败继续显示本地快照，旧镜像 ETag 不发送到直连请求，旧镜像图标 URL 不进入视图。standalone TypeScript 与源码清单（4277 files）通过。构建最初两次在清理旧 `dist` 时遇到 Windows `EPERM`；主人关闭旧程序后重试成功，产物报告 `Built Talos CLI 0.5.7`，可丢弃数据目录下 `--version` 和 `--help` 均退出码 0。未启动真实 TUI、未发真实网络请求或模型请求。

### Windows 权限自动闸依据（2026-09-30）

【源码】Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 工作树，实施前：`scripts/lib/vitest-suites.mjs:29-45` 明确禁止重复登记测试文件；已有 policy 组仅有 `packages/local-runtime/test/unit/local-permission-facade.test.ts`，所以新 Windows 命令复用该组，而非重复文件登记。`scripts/run-vitest-suite.mjs:9-38` 当前仅解析 group，保留 Windows TEMP 实路径和串行文件约束；新命令应校验实际 host，不用 -t 排除模式。

【源码】`packages/local-runtime/src/permissions/facade.ts:541-549,1092-1169` 的 Windows hard safety 位于 checker/core 前，回收 launcher 缺失、危险永久删除等返回 `safety-immune`；因此 POSIX 期待 checker 的 shred 日志/普通 `safety` 来源不能代表 Windows 公共契约。原 `rm /tmp`、POSIX rm 改写及路径 transforms 回归需在 POSIX 原生运行，Windows 则明确提供 .cmd/PowerShell 样本和已校验 launcher 字节，测试既有边界不改变生产行为。

【源码】`packages/agent-modules/permission/src/tools/fs-permission.ts:1076-1107` 工作区决定外部写入能力，先前 `echo ... > /tmp/...` 日志用例没有选择工作区。可移植用例应给会话 cwd 和相对目标，继续要求相同 allow 与 checker/core 日志结构，不能改为接受 ask/deny。缺失/篡改回收脚本、根删除及公共规则仍需对应平台断言。

【源码与实测，离线】同一HEAD后续工作树：`package.json:19` 提供 `test:windows-policy`，复用唯一登记的policy文件；`scripts/run-vitest-suite.mjs:10-21` 校验显式宿主约束，错误平台在加载Vitest前拒绝；`scripts/verify.mjs:60-61` 在Windows/full流程中登记新闸。没有在suite重复登记文件或使用 -t 字符串过滤。`test/source-sync.test.mjs` 原focused-gates与runner测试补匹配/不匹配平台断言，完整发布工具回归通过。

【源码与实测，离线】`packages/local-runtime/test/unit/local-permission-facade.test.ts` 按实际win32/darwin/linux执行平台断言：POSIX原用例保留并加真实chmod坏脚本对照；Windows新增 engine/core targets-only回收计划、default/auto/bypass/off早期硬拒绝及对应日志。原重定向日志夹具的 /tmp/home 边界不稳定且走不同规则，改用明确会话cwd的tee目标，精确断言已建模writeAuthorizedTarget日志，普通工作区外非temp目标ask。`packages/agent-modules/permission/src/tools/bash-checker.ts:709-723` 的 allowTempWrite 既有策略仍保留，不为过测试改变其语义或生产权限。

【实测】使用 Node v24.15.0 运行正式pnpm命令，143通过、15原生POSIX用例平台跳过、零失败；verifier两份Windows列表都含新闸。脚本前置不匹配平台、TEMP规范化和源清单唯一登记也有自动回归。实际结果见 [status](../status.md)。

【未验】原生类Unix policy结果仍未取得；早前Windows source contract中的fsutil/旧更新launcher失败本轮未修。只有测试与检查脚本变更，未改变生产权限；没有运行实际删除或联网模型。

### POSIX 删除回归的平台元数据夹具（2026-09-30）

【源码】Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 后续工作树：`packages/local-runtime/src/infra/ensure-trash-script.ts:29-44,121-153` 创建 POSIX 脚本并校验原字节与 stat.mode 的执行位；`packages/local-runtime/src/permissions/facade.ts:547-549,1199-1235` 把脚本健康检查放在 off/bypass 等模式之前，异常拒绝且不得回退永久删除。`packages/local-runtime/test/unit/local-permission-facade.test.ts:79-93,481-595,1419-1430` 明确模拟 darwin/linux，却仍使用 Windows 的 fs.statSync 元数据。NTFS 没有给出 POSIX execute bits，预期回收改写未能执行。

【r1 曾采用的实施约束，现由下方 Astra r2 复核替代】只在测试中为已登记的合成脚本标注 POSIX mode；不 mock 脚本字节/存在性，不返回虚假 available、不改变生产检查、不对全局文件放行。缺失/篡改/去执行位须保持拒绝。宿主路径解析仍是 Windows，不把其结果称真实 POSIX 执行验证。

【实测，Git Bash 核验】2026-09-30 使用本机 `C:\Program Files\Git\bin\bash.exe`（GNU Bash 5.2.15，x86_64-pc-msys）和 Node `v24.15.0` 对独立临时 printf 脚本验证。Git Bash 执行 `chmod +x` 后，自己的 stat 报 755，脚本正常打印合成标记；从 Git Bash 启动同一个 Windows Node 时仍为 `process.platform=win32`、mode=666、`stat.mode & 0111=0`，PowerShell 再读结果相同。没有执行删除、没有改仓库或用户配置。因此仅把测试启动 shell 改成 Git Bash，不会改变 POSIX 模拟分支所读的 Windows Node 文件元数据；真实 Bash 执行与 Node 平台模拟是两个证据范围。

【源码，Astra 复核】`scripts/verify.mjs:75-81` 的 `test:policy` 明确限定 `platforms: ['darwin','linux']`；`test/vitest-suites.json:202-204` 的 policy 组只有完整 `local-permission-facade.test.ts`。直接调用 Vitest 文件绕过了该平台分派。`test/windows-contract.test.mjs:21-34` 及其余用例主要覆盖 Windows 路径/旧更新安装，不自动证明 Windows 权限全覆盖。`scripts/run-vitest-suite.mjs:17-37` 还包含 Windows TEMP 实路径及串行文件策略，复验优先遵循现有 runner。

【既有报告，Astra 读取】r1 临时报告 `talos-permission-posix-targeted-r1.json` 仅用于说明未完成模拟：152个登记用例中8通过、1失败、143未选；失败在 POSIX off-mode 回收改写的 executionPlan.transforms 精确路径断言（当时测试行579）。r2 已撤销模拟 stat 和依赖用例；该报告不再作为当前通过证据。没有取得原生 Linux/macOS 测试；生产 facade/脚本未因本轮平台纠偏修改。

【复核结论】r1 mock 不再扩展为 Windows 上的 POSIX 模拟层。Luna 已精确撤销 stat 接线和依赖其通过的 Windows 反向用例，保留独立 cwd 修正；后续Windows权限入口已保留真实chmod的原生坏脚本用例，其原生结果仍待验证。当前 Windows 失败清单需按平台归因，不能全部称产品缺陷或全部忽略；执行范围见 [plan](../plan.md#当前小轮posix-回收脚本平台夹具)。

【未验】主人另一台类 Unix 机器的 OS/架构、文件系统、Node 和原生测试结果未知；Linux 与 macOS 不互相替代验收。Git Bash 探针没有执行真实删除，不能证明回收站后端功能。

### 权限写入测试的工作区归因（2026-09-30）

【源码】Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 后续工作树：`packages/local-runtime/src/permissions/facade.ts:1045-1061` 优先 session.workspaceDir，再 agent.defaultWorkspaceDir，缺两者时回退 os.homedir。`packages/local-runtime/test/unit/local-permission-facade.test.ts:77-101,2020-2038,2119-2144` fake dataDir 默认 mkdtemp(tmpdir)，会话查询总返回 undefined；两项写入用例没有指定工作区。Windows tmpdir 属用户 home 子目录，写入实际触发工作区边界允许，并非 temp 自动写入允许。

【源码】`packages/agent-modules/permission/src/tools/fs-permission.ts:1024-1045,1076-1107` 精确写入目标允许；temp 便利仅作用于 READ_ONLY_TOOLS，普通写入仍查工作区/允许路径/用户规则。`tools/fs-checker.ts:46-73` 依据目标与上下文调用路径权限。修正应明确测试的会话 cwd，让 dataDir 路径真正位于 cwd 外；保留生产 fallback 和原 ask/allow 断言，不能用改生产权限迎合错误夹具。

【源码与实测，离线】同一 HEAD 工作树，仅 `packages/local-runtime/test/unit/local-permission-facade.test.ts` 增加 sessionWorkspaceDir 测试注入：普通 dataDir 写入目标与选定 cwd 不重叠，default/auto 返回 ask；回合精确 plan.md 返回 allow，相邻 .bak 与撤销精确授权后的原目标返回 ask，不持久化规则。另设无 session/agent 工作区的 home 目标，固定原生产 fallback 及工作区允许行为；六项对照全部通过。完整套件逐名称确认仅删除原两项失败，没有新增或跳过；实际数字和剩余问题见 [status](../status.md#当前技术收口缺口权限-facade-13项剩余失败)。

【未验】本轮未修改权限生产逻辑，没有执行合成写入命令；不代表完整权限套件、home 信任范围或数据隔离已收口。

### Talos 权限云分类（2026-09-30）

【源码】Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 工作树，实施前依据（引擎仓库相对路径）：

| 路径 | 事实与处理约束 |
| --- | --- |
| `packages/agent-modules/permission/src/classifier/cloud-classify-client.ts:24-51,61-63` | 云分类只按 managed 决定是否启用，neutral 当前不覆盖；endpoint 为厂商 `/mavis/api/v1/permission/check` |
| `packages/agent-modules/permission/src/http-cloud-gateway-client.ts:56-100,165-172` | 分类器上传序列化工具输入、home/workspace 与 conversation context，取得上游 token；错误用现有 timeout/unavailable verdict 返回而非 allow，neutral 需发送前阻断 |
| `packages/local-runtime/src/permissions/facade.ts:774-826,851-915` | Auto 不可用分类器直接返回本地 baseAsk；规则与安全 deny 在此前已处理。本轮改变 gate，不修改规则或 ask gate，不自动开启 Full access |
| `packages/tui/src/tui/features/interaction/permission-mode-picker.ts:12-17` | Auto 原提示为 Ask only when risk is high；neutral 退役云判断后须如实说明本地检查/未知确认 |

【源码，下一隔离审计】`packages/local-runtime/src/permissions/facade.ts:999-1011` 仍把旧 `.minimax` home 的 skills/.builtin-skills 加入只读工具的技能资产路径候选。此为需审计的信任/隔离路径，不在本轮云分类切片中盲改，也不能宣称此前目录命名已经证明完全隔离。

【源码与实测，离线】同 HEAD 的后续工作树，`packages/agent-modules/permission/src/classifier/cloud-classify-client.ts:62` neutral 不启用 cloud classifier；`src/http-cloud-gateway-client.ts:57-59` 直调在 request/context/token/fetch 前返回原 `kind:timeout`、`cloud:unavailable`，而非 allow。`packages/local-runtime/src/permissions/facade.ts:813-821` 仍走既有 baseAsk，不改变核心规则/审批；`packages/tui/src/tui/features/interaction/permission-mode-picker.ts:122-127` Auto 的 neutral 说明为 `Local checks; confirm uncertain actions`。

【实测，离线】managed=true、neutral 下用 engine/core 两种 owner 检查合成 `npm publish`（不执行），假 gateway 即便会 allow 也未调用；本地显式 allow、deny 和危险根删除拒绝仍生效。直调分类器无 request 属性或 token 读取、无 fetch；非 neutral 仍按原协议解析 fake allow。完整权限 facade 新发现的既有失败已做仅撤回本轮改动的同环境对照，比较后原字节恢复；失败清单和检查结果只见 [status](../status.md#当前技术收口缺口权限-facade-13项剩余失败)，没有据此宣称权限全量通过。

【未验】未跑真实云分类或模型；Auto 新说明未做真实终端目视。尚未列完所有厂商出口，旧 home 技能信任路径及完整隔离另轮核对。

### 中立搜索的现有调用链与缺口（2026-09-30）

【源码】本轮为只读说明，Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 的后续工作树。`packages/local-runtime-v2/src/service/mcp/project-config.ts:20-55` 读取工作区 `.mcp.json`；`runtime/config-file.ts:6-9` 读取 profile 的 mcp.json；`tools/runtime-tools.ts:43-67` 将已配置 MCP 映射为回合工具；`packages/agent-tools/src/mcp-disclosure/plan.ts:30-65` 决定直接展示或延迟发现，后者由 `tool-search.ts:31-39` 与 `mcp-invoke.ts` 搜索定义再调用。`packages/local-runtime-v2/src/service/mcp/runtime/local-mcp.service.ts:814-849` 把调用参数路由到选定服务，失败明确返回，不提供假搜索结果。

【源码】`packages/tui/src/tui/controller/product/feature-flow.ts:1316-1347` 的 `/mcp` 是检查状态面板，并非搜索 provider 配置向导。`/provider` 管理模型服务，两者不是同一配置。原生 web_search 的自定义 adapter 是开发注入接口，不能声称普通用户已有搜索设置页。

【源码缺口】`packages/agent-tools/src/desktop/canonical-tool-policy.ts:53-72` 的 Explore/Verifier MCP ceiling 只接受 builtin-matrix web_search；`packages/local-runtime-v2/src/service/turn-system/agent-host/assembly/local-turn-tool-catalog.ts:176-183` 实际应用该筛选。因此主对话可接配置的搜索 MCP，不等于这些内置子代理也已支持；关闭 Matrix 后它们没有这条内置网络搜索。修复需要定义只读搜索身份/能力契约，不能简单放开所有 MCP 或修改审批。本轮不修改此策略。

【未验】尚未选定或配置真实搜索服务，未运行真实 MCP 搜索，也没有默认替代搜索、搜索配置 UI 或子代理中立搜索适配。原工具发现/调用源码只能证明接线方式，不代表开箱即用搜索已交付。

### Talos 内置 Matrix 与 mcode-tools（2026-09-30）

【源码】Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 工作树，改动前依据（路径相对引擎仓库）：

| 路径 | 行为与边界 |
| --- | --- |
| `packages/local-runtime-v2/src/service/mcp/initialize.ts:65-67`；`runtime/local-mcp.service.ts:290-307,947-975,1074-1094` | 内置 Matrix flag 与连接池控制服务注册/展示。服务禁用时已有过滤内部 v2 Matrix 标记的运行视图逻辑；应扩展 neutral，不能把自配同名服务删掉 |
| `packages/local-runtime-v2/src/service/mcp/runtime/builtin-matrix.ts:36-78,101-127,179-216` | builder 创建 stdio 子服务和工具列表，token override 将上游凭据传给子进程；neutral 应拒绝 builder/token、描述返回空 |
| `packages/agent-tools/src/desktop/matrix-client.ts:88-195`；`matrix-env.ts:11-48` | 厂商 Matrix 网关可 POST、PUT、GET；仅取消注册仍不能防直调，发送与 header 读取需 unavailable。用户自配 MCP 不使用这专属 client |
| `packages/tui/src/runtime/lifecycle.ts:158,323-340`；`runtime/embedded-host.ts:48-52` | beta.mcodeTools 可激活 integration，并通过 capability 投影提供工具；neutral 应覆盖 config，不能自动启动 broker |
| `packages/tui/src/runtime/mcode-tools-integration.ts:83-120`；`cli/mcode-tools-environment.ts:40-55,100-122`；`cli/mcode-tools-entry.ts:1-6` | prepare 校验产物、创建目录、启动租约 broker、改 PATH，子程序入口最终动态导入嵌入 cli.mjs；需在这些副作用前阻断 neutral |
| `scripts/build.mjs:83,129-131`；`scripts/lib/mcode-tools-artifact.mjs` | 构建仍打包厂商嵌入资源及内部 launcher；本轮只处理运行通道，资源排除/来源与许可证属于发行依赖审计 |

【源码补查】`packages/local-runtime/src/api/local-native-tools.ts:118-123` 在 product gate 开启时默认创建 native web_search；`packages/local-runtime/src/web-search/local-web-search-client.ts:16-42` 调用 LocalMatrixClient，后者 `packages/local-runtime/src/matrix/local-matrix-client.ts:21-33` 继承 DesktopMatrixClient。因此 HTTP 阻断已覆盖，但默认工具描述仍应在 neutral 撤下；显式注入的自定义 adapter 不属于厂商默认通道，保留。

【源码与实测，离线】同 HEAD 后续工作树，`packages/local-runtime-v2/src/service/mcp/initialize.ts:66-68` 与 `runtime/local-mcp.service.ts:292,948-973` 在 neutral 不注册、不显示内置 Matrix，并只过滤带内部标记的运行视图；用户同名服务保留，合成 mcp.json 字节不变。`runtime/builtin-matrix.ts:40,78,106,229-234` 在 builder、工具描述、token override 前保护。`packages/agent-tools/src/desktop/matrix-client.ts:93,109,127,151,175,200,298-303` 阻断直调 POST/上传/下载/header 获取，LocalMatrixClient 继承该行为。`packages/local-runtime/src/api/local-native-tools.ts:118-123` neutral 不创建默认 Matrix 搜索 adapter，明确注入的自定义 adapter 保留。

【源码与实测，离线】`packages/tui/src/runtime/lifecycle.ts:158-159,328` neutral 不调用云工具准备器；`runtime/embedded-host.ts:52-53` 保持 capability ceiling 为 false，不改持久化 beta 配置；`runtime/mcode-tools-integration.ts:84-89` 即使直调 requested=true 也不校验资源、不建 broker/目录或改 PATH。`cli/mcode-tools-environment.ts:54,110,146-151` 阻止环境直调激活；`cli/mcode-tools-entry.ts:4-11` neutral 返回明确不可用提示、退出码 1，跳过嵌入 cli.mjs import。离线回归证明零身份读取/fetch、通用 MCP 与原生工具保留；非 neutral 原租约和网络协议测试保留。POSIX socket 限制用例在 Windows 依原测试跳过，不虚报通过。结果见 [status](../status.md)。

【实测，本地产物】Node `v24.15.0` 构建后，在临时子进程设置 neutral 并调用内部 mcode-tools 入口，实际输出 `Upstream cloud tools are unavailable in Talos. Configure your own MCP server.`，退出码 1；未导入厂商程序，没有真实模型请求。该检查不证明已从产物移除厂商资源。

【未验】本轮不以注册关闭证明全进程无厂商请求，也不证明已去除厂商打包资源。第三方网络搜索可由自配 MCP 提供，不假造内置替代。

### Talos 插件市场与云连接器（2026-09-30）

【源码】Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 工作树，以下相对引擎仓库，实施前依据：

| 路径 | 链路与边界 |
| --- | --- |
| `packages/local-runtime-v2/src/service/plugin-system/initialize.ts:45-56,70-105,123-133,214-227` | registry、connector 共用 PluginSystemCloudTransport；初始 scope 读取上游账号，官方目录默认 origin 为厂商域；neutral 应不提供该账号 scope |
| `packages/local-runtime-v2/src/service/plugin-system/cloud-transport.ts:81-145,147-164` | 签名请求、账号 getter、fetch 与官方下载写盘均由这里管理，需要发送前明确阻断 |
| `packages/local-runtime-v2/src/service/plugin-system/plugin/runtime/registry-client.ts:60-155`；`packages/local-runtime-v2/src/service/plugin-system/app/cloud-client.ts:65` | 市场分页/工单式管理/下载授权及云 connector API 共用该 transport；阻断后返回协议内明确错误，不修改权限/审批 |
| `packages/local-runtime-v2/src/service/plugin-system/plugin/import/github-source.ts:8-29,276-290`；`initialize.ts:79-82` | 用户主动 GitHub importer 使用独立 fetch，不使用厂商 registry；需保持可用，不能用公共网络总开关误伤 |
| `packages/tui/src/plugin/application.ts:11-33,55-70`；`packages/tui/src/cli/plugin-command.ts:43-60` | 默认合并 official/local，CLI 来源列表也推荐两者；neutral 默认改 local，显式 official 给 unavailable |
| `packages/tui/src/tui/features/plugin/manager.ts:15-16,135-150,183-197,210-214,290-303` | 页面默认四来源及 MiniMax Official 标签；neutral 保留本地管理 tab，旧 official 缓存不出现在可操作列表 |

【源码与实测，离线】同一 HEAD 后续工作树，`packages/local-runtime-v2/src/service/plugin-system/cloud-transport.ts:83,107,148,166,413-423` 在认证/dispatch、下载和写盘前阻断 neutral，明确返回 `PLUGIN_CLOUD_UNAVAILABLE`；泛型账号读取器在 neutral 返回 undefined 而不调用上游 getter。`initialize.ts:44-49,75,88,107,125` 将 registry、connector、host connector 与 plugin scope 全接到该读取器，GitHub importer 保留独立 fetch。

【源码与实测，离线】`packages/tui/src/plugin/application.ts:15-36,59,77-81` 默认仅查 local 并防旧 mixed snapshot 暴露 official；明确 official 的查询/变更在调用 Runtime 前失败。`cli/plugin-command.ts:46-63` 只报告 local 来源和刷新；`tui/features/plugin/manager.ts:16-19,140-153,194,219-222,307` 保留 All/Installed/Local，计数与可操作项只来自本地，不推荐官方市场。源码所接的 cloud getter 不影响用户模型凭据或自配 MCP。

【实测，离线】四组既有回归覆盖 neutral 下无厂商身份读取/签名/dispatch，下载被拒绝且 target 文件不存在，异步响应后变成 neutral 也不写盘；本地列表/安装/启停/移除/刷新仍委托 Runtime。GitHub source 在 neutral 下通过独立假 API fetch 解析 commit，证明未被厂商 transport 阻断；不是实际远程安装测试。非 neutral 原鉴权、签名、限流式下载边界和 connector 权限用例保留。TUI 夹具证明本地 tabs/计数/启停正常；真实终端待主人验收，结果见 [status](../status.md)。

【未验】内置 Matrix MCP 云工具和 mcode-tools broker 是其他链，本轮只记录其存在，不实现。真实 GitHub 安装、插件执行与全进程抓包均不属于本轮离线证明。

### Talos 上游反馈上传（2026-09-30）

【源码】Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 的工作树，以下为实施前依据，路径相对引擎仓库：

| 源码路径 | 原行为与处置边界 |
| --- | --- |
| `packages/tui/src/tui/controller/product/feedback-flow.ts:32-72`；`packages/tui/src/tui/controller/product/command-flow.ts:1301` | `/feedback` 先检查上游账号再 prepare，创建确认上传面板；neutral 应在账号读取前返回说明，不作为模型正文 |
| `packages/tui/src/runtime/lifecycle.ts:522-544`；`packages/tui/src/runtime/adapter.ts:405-423` | adapter 委托工单服务及诊断 uploader；单纯隐藏按钮不够，直调服务仍可上传 |
| `packages/tui/src/runtime/feedback/service.ts:111-168,171-270,332-385` | prepare 保存草稿，submit 读认证并上传诊断、创建/确认 ticket；neutral 需在 prepare/submit 与发送边界阻断，cancel 保留清理能力 |
| `packages/tui/src/runtime/feedback/ticket.ts:18-21` | 默认工单 origin 使用上游 public gateway，路径为 `/minimax-cloud/api/v1/feedback/ticket`；本轮不替换为未经交付的 Talos 后端 |
| `packages/tui/src/runtime/feedback/diagnostic-upload.ts:71-90,155-190` | flush 日志、收集会话/文件、脱敏 ZIP，向厂商 `/matrix/api/v1/log/upload` 换取 presign，随后 PUT；neutral 需在采集之前阻断，异步后发送前再次检查 |
| `packages/tui/src/tui/commands/catalog.ts:348-354`；`packages/tui/src/tui/shell/welcome/design.ts:19,32` | 原目录与欢迎页仍推荐反馈上传；退役后须撤下该推荐，保留布局和其他功能 |

【源码与实测，离线】同一 HEAD 后续工作树：`packages/tui/src/tui/controller/product/feedback-flow.ts:36-39` 在账号查询前给明确说明；`packages/tui/src/runtime/feedback/service.ts:113,173,340,367,402,541-548` 用 `feedback_unavailable`、403、不可重试保护 prepare/submit、上传与工单发送/确认边界；cancel 保留清理能力。`packages/tui/src/runtime/feedback/diagnostic-upload.ts:75,79,92,163,187` 在采集之前、异步刷新/采集之后以及 presign/PUT 前阻断；`catalog.ts:350-357` 不推荐 neutral 反馈命令，但仍识别手动输入；`welcome/design.ts:19,32,41,49` 改推荐本地 `/doctor`，保持原布局。

【实测，离线】既有反馈测试覆盖 neutral 直调不读账号、不 flush/采集/上传，旧草稿提交拒绝而取消仍成功，异步期间切换 neutral 后不再创建工单或查询工单，不执行后续 PUT。完整 TUI 覆盖 `/feedback` 空参数和带描述均只写提示，runtime prepare/submit 与模型发送零调用。保留非 neutral 的原始脱敏、上传确认、取消和重试测试。结果见 [status](../status.md)；未请求真实上游网络或模型，真实终端展示待主人验收。

【未验】这一轮只处理上游反馈链；其他云出口、工具服务和完整数据隔离另轮核对。不覆盖独立外部进程/工具或显式用户配置的模型网络。

### Talos 自动遥测出口（2026-09-30）

【源码】Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 的工作树，改动前依据：

| 完整仓库相对路径 | 行为与映射 |
| --- | --- |
| `packages/tui/src/cli/environment.ts:67-74` | Talos 默认设置 neutral 标记，TUI/headless/ACP 共用入口 |
| `packages/tui/src/analytics/business-telemetry.ts:126-191,248-258`；`packages/tui/src/tui/launcher.ts:140-151,248-267` | 使用统计只尊重 config opt-in 和两项环境 opt-out，neutral 不阻断；发送到 hailuo/talkie/xingye 的 reporter |
| `packages/config/src/telemetry-policy.ts:11-22`；`packages/local-runtime/src/runtime/host-metrics.ts:108-142` | metrics 内建云 reporter 在 managed 且显式开启时创建；共享策略没有 neutral 条件。显式注入的自定义 reporter 是独立接口，不属于内建厂商出口 |
| `packages/tui/src/observability/incident-reporter.ts:308-325,373-420,511-513` | 故障记录按策略写 pending 或 local，上传前检查策略再取得账号认证；neutral 尚无独立约束 |
| `packages/local-runtime/src/error-reporting/reporter.ts:65-100,104-110` | runtime 故障诊断在入队和发送时检查同一 diagnostics 策略；阻断该策略可覆盖两个阶段 |
| `packages/tui/src/cli/telemetry-command.ts:26-67` | status/preview 用统计策略描述三类通道；neutral 下也可能显示可开启和上游请求预览，需要与实际阻断一致 |

【源码结论】本轮共享策略优先阻断 neutral，保留本地记录和非 neutral opt-in/脱敏行为；业务统计同时在 track/drain 再检查。需要离线证明所有内建上传路径零 fetch、旧 pending 不发送且 local 仍可记录。

【源码与实测，离线】同一 HEAD 的后续工作树：`packages/config/src/telemetry-policy.ts:16` 优先阻断 neutral；`packages/tui/src/analytics/business-telemetry.ts:132-134,157-160,191` 在策略、发送和收集处分别阻断；`packages/tui/src/cli/telemetry-command.ts:39-54` 报告无法 opt-in、不提供请求预览。四个既有 privacy 文件新增 neutral 回归：配置全开仍不创建统计客户端/发送请求，收集后切换 neutral 丢弃排队事件，故障诊断不取得上游账号认证、不补传旧 pending，保留新 local 记录；非 neutral 原有脱敏与 opt-out 测试通过。结果见 [status](../status.md)。

【实测，本地产物】支持的 Node `v24.15.0` 构建后，独立临时 data dir 中合成 config 设三类 telemetry 为 true；`telemetry preview` 实际返回三通道 `configured:true`、`enabled:false`、`blockedBy:TALOS_NEUTRAL_RUNTIME`，以及 `optInAvailable:false`、`optInSetting:null`、`request:null`。输出说明 local diagnostics 保留。没有真实网络、凭据或模型请求；这证明该产物入口政策和反馈，不是全进程抓包验证。

【未验】反馈是独立用户操作上传通道，云插件、工具服务与其他厂商请求未包含本轮。不能将遥测阻断宣称为完整进程无厂商出口。

### TUI 回归归因依据（2026-09-30）

【实测】Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 的后续工作树，Node `v24.15.0` 重跑 `packages/tui/test/unit/tui-app.test.ts` 得到 306/332 通过、26 项失败。离线假 runtime，没有真实模型请求。原始机器报告留在临时目录，不提交。

【源码】相关显示事实：`packages/tui/src/tui/shell/welcome/design.ts:4-7` 使用已验收的 `Field notes`；`packages/tui/src/tui/platform/terminal-title.ts:40` 使用 Talos；`packages/tui/src/tui/features/inspection/product-inspection.ts:201` 标题为 `Talos status`；`packages/tui/src/tui/controller/interaction/questionnaire-continuation.ts:102` 为 `Answer sent · Talos is continuing…`。测试仍期待旧文案。模型 ID 与可选 provider 名称不是产品品牌，不随意替换。

【源码】`packages/tui/src/tui/features/session-mutation/copy.ts:13-39` 从系统 `Intl.DateTimeFormat().resolvedOptions().locale` 选语言；`copy.en.ts:180-182` 与 `copy.zh-Hans.ts` 提供等价失败文案。当前中文机器上的英文硬编码断言导致历史/回退失败，不能据此判定恢复逻辑损坏。测试需要显式语言夹具并覆盖中英文交互，保留原功能断言。

【实测】同版本工作树只修改 `packages/tui/test/unit/tui-app.test.ts` 的测试夹具和产品文案预期：`:51-65` 在每个用例固定 host locale 并在结束时恢复 spy；`:6915-6956` 分别覆盖 en-US/zh-CN 的普通/全屏历史显示与 Esc 返回。原 26 个失败的对应测试全部通过，完整重跑无跳过；保留原请求参数、历史唯一性、错误重试和非成功回退断言。`Intl` 仅在测试中替换，真实 TUI 跟随系统语言的行为未改变。未使用翻译模块 mock，没有真实 provider 请求；完整结果见 [status](../status.md)。

### Talos 旧更新入口（2026-09-30）

【源码】Talos-CLI fork HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 的工作树。以下路径相对引擎仓库。Talos CLI 启动先设置 `TALOS_NEUTRAL_RUNTIME=1`，随后才动态加载命令实现。

| 入口 | 已核对行为 | 本轮边界 |
| --- | --- | --- |
| 【源码】`packages/tui/src/index.ts:31`、`packages/tui/src/update/prefix-update.ts` | 每次启动调用 `prepareMcodePrefixProcess()`，可能处理旧 npm-prefix 更新状态 | 待按 r2 隔离旧更新准备；当前源码仍有调用 |
| 【源码】`packages/tui/src/cli/program.ts:145-150`、`packages/tui/src/cli/main.ts:153-156`、`packages/tui/src/cli/update.ts:21-35` | `talos update` 可创建上游更新应用、检查并安装原包 | 待改为只读状态入口；包身份未定期间只能解释未配置，不能进入旧更新应用 |
| 【源码】`packages/tui/src/tui/launcher.ts:475-478,824-833`、`packages/tui/src/tui/app-composition.ts:399-413` | TUI 启动会调用更新检查；重启可调度旧 prefix activation | 待切断旧回调与 activation；未来自己的只读检测按独立契约接入 |
| 【源码】`packages/tui/src/tui/commands/catalog.ts:136-142`、`packages/tui/src/tui/controller/product/command-flow.ts:1060` | `/update` 可进入旧安装流程 | 待保留分发并改为状态提示，帮助不得再承诺自动安装 |
| 【源码】`scripts/build.mjs:145-146`、`scripts/package-cli-release.mjs:65-69,79` | 本地产物身份为 `talos-cli`、private；发行 manifest 仍为 `@minimax-ai/code`、private、上游 repository，只有 bin 已是 `talos`；打包要求已提交且干净的工作树 | 改名 CLI bin 不等于可发布自己的 npm 包。正式包名、版本及发行身份必须在发行准备轮确认并统一；不能凭 GitHub 用户名推断 npm scope |

【源码复核，Astra 规划轮】当时只读检查确认上述旧调用仍存在；此前可见 Talos 更新文案不证明更新器已退役。该轮未修改引擎代码或运行 npm 查询。自己的更新目标尚未确定，不能查询占位包或以 MiniMax registry 结果证明 Talos 版本。

【源码与实测，Luna r2】同一 HEAD 的后续工作树中，`packages/tui/src/index.ts:30-31` 改为直接运行 CLI，不再准备 prefix 更新；`packages/tui/src/tui/launcher.ts:459-462,795-809` 不再向 TUI 注入旧 `inspect/apply`，普通重启直接启动子进程；`packages/tui/src/cli/main.ts:153-157,279-281` 的 `talos update` 只写未配置状态；`packages/tui/src/tui/controller/product/update-flow.ts:8-27` 的 `/update` 只写相同含义的状态。`app-composition.ts` 中可选的未来通知渲染钩子仍在，但 Talos launcher 不提供旧检查回调。旧 `cli/update.ts`、`update/application.ts` 和 `update/prefix-update.ts` 留在源码中，现有产品入口无调用链。Node 24 构建后的 `dist/cli.js update` 输出 `Talos 0.5.7: this build has no Talos npm update source configured. Use the current source build; Talos does not install updates automatically.`；`--help` 说明为 `Show Talos update status`。这是本地产物实测，不是 npm 查询或真实发布验证。

【未验】独立 npm 包未发布；真实 registry、安装升级、跨版本新版提醒均未验证。检测器可以在包身份确认后、首发之前用假响应开发；规划见 [plan](../plan.md#npm-发行与版本提醒)，该方案不是已实现事实。

### 只读更新构建检查依据（2026-10-01）

【源码】Talos-CLI HEAD 30d23b8（本地WIP），版本0.5.7。完整路径 C:/DEV/develop/Talos-CLI/scripts/check-standalone-boundary.mjs:11-28 仍要求 update/application 输出字节；与前述已退役产品入口冲突。C:/DEV/develop/Talos-CLI/scripts/lib/retired-sources.mjs:28-30 只有原native宿主禁入，尚未限制旧更新安装模块。

【源码】C:/DEV/develop/Talos-CLI/packages/tui/src/cli/main.ts:151-155,277-279 直接输出未配置只读状态；C:/DEV/develop/Talos-CLI/packages/tui/src/tui/controller/product/update-flow.ts:18-23 为相同TUI状态入口。修检查时要求二者实际有输出字节，并从完整构建输入图拒绝旧安装链，保留已有权限、反馈、插件等required检查。

【实测】2026-10-01，Node24.15.0，本地提交cf2a6fb：release-tools64通过/2平台跳过；合成图正反例覆盖缺失/零字节入口、四种旧更新模块和原native宿主零字节再入图；4277文件清单、实际build和standalone均通过。本地产物update只输出未配置来源与不自动安装，不查询网络。

【未验】未运行完整verify、原生POSIX或实际终端UI；此约束不是npm发布、新版查询、安装升级的证据。

### 旧 home 技能信任隔离依据（2026-09-30）

【源码】审查仓库 `C:\DEV\develop\Talos-CLI`，HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4`，版本 `0.5.7`；有此前未提交改动，HEAD 只表示基点。以下初始行号对应本轮修改前源码。

| 完整路径与行号 | 事实与处理要求 |
| --- | --- |
| `C:/DEV/develop/Talos-CLI/packages/local-runtime/src/skills/roots.ts:22-68,71-119` | canonical skill roots 来自 dataDir；工作区 `.minimax/skills` 是受 external 总开关与来源开关控制的外部来源；home 外部来源为 `.claude/.codex/.agents`，没有固定 home `.minimax/skills` fallback；但 `workspaceRootsToScan`（141-158）在发现上层 `.git` 时返回沿途父目录，可能把 home 当 workspace 根，中立模式需排除这一隐式旧 home 来源，保留其他项目来源 |
| `C:/DEV/develop/Talos-CLI/packages/local-runtime/src/skills/builtin.ts:385-405` | builtin candidates 为显式环境路径、包资源与开发 cwd；没有自动 home `.minimax` fallback。显式环境路径属于用户主动配置，不能当隐式继承 |
| `C:/DEV/develop/Talos-CLI/packages/local-runtime/src/skills/registry.ts:203-233` | registry 直接消费配置根并以根集合为缓存键，需用假 home 验证真实注册而非只断言字符串 |
| `C:/DEV/develop/Talos-CLI/packages/local-runtime/src/permissions/facade.ts:984-1014` | read/glob/grep/list 的 sandboxAllowPaths 会同时信任 dataDir 和 home `.minimax` 技能目录；中立模式应去掉后者的隐式放行 |
| `C:/DEV/develop/Talos-CLI/packages/agent-modules/permission/src/tools/fs-permission.ts:665-701,890-913` | private runtime 保护同时识别 dataDir 与旧 home `.minimax`，但把 skills、agent workspace、internal whitelist 等作为可读例外。中立模式必须保留旧树保护并取消例外；直接删旧保护根会弱化已有私密数据安全边界 |

【实测】2026-09-30：Node 24.15.0 下 fake-home 技能/配置/数据目录与权限、TUI 五套件514通过、17平台跳过；类型、源码清单、构建通过。修复涉及 roots.ts:85、facade.ts:1002、fs-permission.ts:680-699；保留旧数据保护、显式批准与指定 dataDir，排除 home 父目录扫描的隐式导入。测试注册读取的技能与读权限均为合成夹具。

【未验】真实用户技能、类 Unix 原生权限、所有数据路径与干净提交检出未验证；未请求真实模型或网络。

### Talos 默认数据目录与旧 home 继承（2026-09-29）

【源码】Talos-CLI fork HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 的工作树；以下路径相对 `C:\DEV\develop\Talos-CLI\`。本切片不改变 ACP 报文或 provider 凭据格式。

| 源码位置 | 已核对的行为 | 本轮映射及未知项 |
| --- | --- | --- |
| 【源码】`packages/tui/src/runtime/data-dir.ts:1-58`、`packages/tui/src/index.ts:24-33` | `resolveDefaultTuiDataDir` 借用 config 的 `.minimax` 基名；CLI 入口先选路径，再交给 `configureTuiRuntimeEnvironment`。TUI、headless、ACP 共用 `prepareTuiDataDir` | 默认路径需改为 `.talos`，显式 `MINIMAX_DATA_DIR`/`MAVIS_DATA_DIR` 仍按原优先级使用；真实用户目录不用于测试 |
| 【源码】`packages/tui/src/cli/environment.ts:40-74`、`packages/config/src/config.ts:1327-1359`、`:1489-1523` | 准备函数把选中路径写入两个公开环境变量；配置层优先读取显式目录 | 默认目录选择一旦改为 `.talos`，配置、凭据和会话均应由原有同一数据目录参数落盘；需用离线测试确认 |
| 【源码】`packages/config/src/config.ts:1864-1900`、`packages/config/src/data-dir.ts:5-44`、`:287-392` | 非 managed 且缺 config 时，先调用带迁移/兼容链接副作用的 `resolveDataDir({ homeDir: os.homedir() })`，再可能复制该目录的 `config.yaml`；neutral 判断在其后 | neutral 非 managed 必须跳过这个旧 home 探测和复制；旧数据不迁移、不删除。非 Talos 路径维持原继承行为 |
| 【实测，既有离线回归】`packages/config/test/builtin-model-fallback.test.ts:159-195` | managed+neutral 不继承 fake home；non-managed+neutral 会复制 fake home 的合成 custom provider | 将后者改为“不继承”回归，同时覆盖 Talos 默认路径、显式目录和新目录内保存/重读；尚未证明真实数据或跨版本迁移 |

【实测，本轮离线回归】`packages/tui/src/runtime/data-dir.ts` 默认选择 home 下 `.talos`，profile 为 `.talos-<profile>`；显式 `MINIMAX_DATA_DIR` / `MAVIS_DATA_DIR` 仍按既有优先级覆盖。`packages/config/src/config.ts` 在 neutral 非 managed 缺配置时直接返回，不执行旧 home 的 `resolveDataDir` 与复制。假 home 中 `.minimax/config.yaml` 使用合成 key，测试确认新目录未继承、旧内容未改，随后在新目录写入合成 custom provider 并 reset/reload 成功；非 neutral 对照仍继承。显式 Node `v24.15.0` 下定向 Vitest 18/18、standalone TypeScript、源码清单 4277 files、`scripts/build.mjs`（`Built Talos CLI 0.5.7`）和 `git diff --check` 通过。未启动真实 TUI、未读真实用户数据、未请求模型；这不证明其他模块不存在间接旧数据读取。

### TUI 欢迎字形与退出语源码复核（2026-09-29）

【源码，Talos-CLI HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4` 的工作树】`packages/tui/src/tui/shell/welcome/design.ts:81-87` 原先的 compact arm 是五行实心块；`hero.ts:46-53` 将它放在 42 列字标右侧。主人在实际终端截图中确认图案缩小后不可辨，随后否决线条机械臂。现行工作树的 `design.ts` 保存 GUI 顶栏标识的六行 ASCII 三六边形和两行窄屏简版；`hero.ts` 在 64 列以上让它与六行字标并排。这是 TUI 图形取舍，不涉及 ACP 报文或模型行为，真实视觉结果仍待主人验收。

本轮先读 Talos-CLI fork HEAD `8a90a0f6aa152c22300d6eb1a8e2c5cce611cee4`，未启动 TUI、未发送模型请求。以下路径均相对于 `C:\DEV\develop\Talos-CLI\`。

先纠正一个对象边界：上一段记录的是当前 Talos 替换后的 5×5 `TALOS` 字形；主人截图中的巨大 `MINIMAX CODE` 横幅来自上游原始欢迎页，不能用当前 Talos 字形的结论代替。

| 等级与源码位置 | 读到的事实 | 当前结论 / 未覆盖 |
| --- | --- | --- |
| 【源码】`packages/tui/src/tui/shell/welcome/design.ts:59-73`；【用户提供素材】`C:\DEV\develop\tmp\ANSI.txt` | `TALOS_TERMINAL_ASCII_WORDMARK` 现在直接保存 6 行、每行 42 列的 Unicode 块字符；构建时不读取外部文件 | 当前 Talos 字标属于 ANSI Shadow 风格的静态字形资产；运行时不加载字体包，也不依赖该临时文件 |
| 【源码，历史基线】`git show 2aed5ca:packages/tui/src/tui/shell/welcome/design.ts:59-84`；对应源码提交 `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46` | 上游原始欢迎页把 `MINIMAX_CODE_TERMINAL_WORDMARK`、`_MEDIUM_WORDMARK`、`_MICRO_WORDMARK` 直接写成 `███╗...`、`╚═╝...` 等 Unicode block/box-drawing 字符数组；没有字体文件或 figlet runtime import | 截图中的巨大横幅就是这组硬编码字符。它的外观接近常见的 ANSI Shadow/块字风格，但源码只能证明“硬编码 Unicode 字符数组”，不能证明作者调用了某个外部字体 |
| 【源码，历史基线】原始 `hero.ts`（同一提交）及 `design.ts:51-55` | 原始阈值为 `fullMinWidth: 91`、`mediumMinWidth: 44`、`microMinWidth: 11`；`hero.ts` 使用 `wordmarkHighlight → brand → wordmarkShadow` 六行渐变渲染 | 截图是宽屏 full wordmark；其蓝色多层效果来自主题渐变，不是字体渲染器。提交 `107c9cf` 的 Talos 欢迎改造才把这组横幅换成机械臂和当前 Talos 字形 |
| 【源码】`packages/tui/src/tui/shell/welcome/hero.ts:12-45` | 宽度 `>=42` 才渲染 6 行完整 wordmark；6 行按 `wordmarkHighlight → brand → wordmarkShadow` 渐变；`20-41` 只渲染单行 `TALOS`；`10-19` 只渲染微型机械臂；低于 `10` 回退为 `T` | 42 列阈值用于容纳新字标；渐变保留块字轮廓的可读性；窄屏仍有明确降级 |
| 【源码】`packages/tui/src/tui/launcher.ts:71`、`:897-900` | 退出消息由单一常量拼入 `formatTuiExitMessage()`；会话提示（若有）先输出，结束语最后单独换行输出 | 本轮只替换可见结束语；会话继续提示仍沿用现有逻辑，未把内部命令入口改名混入本轮 |
| 【实测】 | 退出语已改为 `-- 3NDM1N15T4T0R OFFL1NE --`；定向 Vitest **2/2** 锁定无会话与带会话两种格式。显式 Node `v24.15.0` 下 standalone typecheck、`pnpm build`、`pnpm check:source`（4277 files）和 `git diff --check` 均通过 | 仍需主人启动新构建并退出做可见验收；未做真实模型请求 |

### 真实 custom provider 文本实测（2026-09-28）

【主人反馈】主人在 `/provider-setup.html` 中使用 provider origin `https://api.xiaomimimo.com`、模型 `mimo-v2.6-flash` 和 `openai-completions`，页面显示“连接成功，模型已返回 talos-custom-ok”。这是当时所运行路径的成功反馈。提交 `74df78b` 的 `src/service/ws-server.ts:132` 起使用进程退出码和整段 trace 子串判定成功，未对结构化 ACP 结果逐项验真；本次未重读原始 trace，不能升级为 fork 构建、隔离或完整独立运行证明。API key 不写入此文档。

保留该成功反馈，不要求主人重测。它不覆盖 fork 工具执行、取消、load/继续、审批及网络出口隔离；已安装 CLI 的第 2 轮 ACP 证据仍按前文范围有效。

## 记录格式与纪律

每项包含：源码 commit + path:line → 请求/响应或通知形状 → 内部事件/字段映射 → 缺失与有损处理 → 可重跑脚本和脱敏 trace → 仍未覆盖的边界。先写源码依据，再测行为；只见报文不足以推导所有语义。

已有探针位于 `spike/`；原始 trace 默认忽略。真实测试前确认临时 cwd、模型/凭据前置与数据落点；不复制用户 token 或真实会话进项目。无消费需求的字段先不扩内部契约。未知方法不能靠“ACP 应该支持”硬接，opencode 专属 HTTP fallback 不迁入。

### provider / 登录 / 数据边界交接证据（2026-09-28）

本节把当前下一轮所需的事实集中在一个入口；它不是“去 MiniMax 化完成”声明。相邻引擎仓库为 `C:\DEV\develop\Talos-CLI`，此前记录的 fork 版本字段为 `0.5.7`，本节只整理已有源码与离线结果，不启动引擎、不请求模型。

| 等级 | 证据 | 当前可下的结论 | 仍未证明 |
| --- | --- | --- | --- |
| 【源码】 | `packages/config/src/config.ts:168-181`、`:1869-1884`、`:1987-2010`；`packages/config/src/byok-config.ts:297-342` | managed/prod 新配置仍会自动补 MiniMax provider 和默认模型；`TALOS_NEUTRAL_RUNTIME=1` 可跳过自动补齐/区域 baseURL 同步，但保留用户已有配置 | Talos 发行是否应自动启用；中立开关是否覆盖全部 home/凭据继承路径 |
| 【源码】 | `packages/config/src/config.ts:1880`；`packages/config/src/data-dir.ts:5`；`packages/tui/src/cli/environment.ts` | `MINIMAX_DATA_DIR`/`MAVIS_DATA_DIR` 影响数据目录选择，但非 managed 初始化分支仍可能先读取默认 home；默认目录基名仍是 `.minimax`，旧目录为 `.mavis` | 新独立目录是否落地；旧账号/会话是否会被读取、复制或迁移；失败恢复和显式迁移入口 |
| 【源码】 | `packages/tui/src/provider/application.ts:22-61`；`packages/local-runtime-v2/src/service/model-system/catalog/provider-presets/provider-presets.service.ts:20-34,76-87,256-273` | provider 视图已按名称/ID统一排序；第三方预设保留；MiniMax 不再因类型固定置顶 | MiniMax OAuth/API Key 是否仍应在 Talos 默认界面可见；区域 pinned 网络源是否需要移除或改为用户可选 |
| 【源码】 | `packages/tui/src/application/login-gate.ts:24-38`；`packages/tui/src/tui/features/provider/onboarding.ts:361,420,649,681` | BYOK/custom provider 可走原生 `/provider`，不要求 MiniMax 登录；managed MiniMax 模型仍有自己的登录门禁 | Talos 首版要隐藏、禁用还是保留 MiniMax 专属入口；第三方真实网络与完整 ACP 工具链 |
| 【实测，继承上一轮记录】 | `provider-application` targeted Vitest `19/19`；配置离线回归 `7/7`；使用 `vitest.oss.config.mjs`、Node `v24.15.0` | 排序、根级 `custom_provider`、URL/合成 key/模型/defaultModel 重读，以及 managed+neutral 不复制 fake home 的行为已有可复跑离线证据 | non-managed+neutral 仍会继承 fake home；这是一项隔离缺口证据，不是隔离通过；未证明真实模型、审批、取消、load 或网络出口 |

本节记录已有证据，不设角色审批。开关接线、数据隔离和专属登录退役的当前执行范围见 [plan](../plan.md#当前小轮cli-中立化)，进度与下一入口见 [status](../status.md)。

【实测，源码落地】Talos-CLI 提交 `c677a6925f32bb79e962c85259ab7fd5d69d51c9` 在 `packages/tui/src/cli/environment.ts:67-74` 将 `TALOS_NEUTRAL_RUNTIME=1` 写入 TUI 启动目标环境；同一函数仍设置显式 data dir、区域、构建环境和 managed 标记。该切片只改变启动时的配置 profile 选择：managed 运行不再自动种入或恢复 MiniMax 默认 provider，用户已有显式 provider 仍由配置层读取。它没有改默认目录 `.minimax`、没有阻止显式 `MINIMAX_DATA_DIR`、没有迁移或删除旧 home，也没有证明真实 provider、网络出口、工具或审批链路。
