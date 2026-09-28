# MiniMax Code 接驳证据入口

此页只记录证据与待验证问题，不记录实施进度。读取日期：2026-09-28。源码只读目录 `C:\DEV\develop\minimax-code`，本轮 HEAD：`2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`。该仓自己的 AGENTS 管它的代码；不要把上游发布同步规矩误当 Talos 的工程流程。

## 当前已有证据

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

核对日期：2026-09-28。以下均基于提交 `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`，版本清单 `0.5.7`；本次复核工作树干净。表中路径以只读源码根目录 `C:\DEV\develop\minimax-code\` 为前缀，行号对应此提交。除明确标为【实测】外，均未运行真实 CLI 或模型，相关单测只阅读、未执行。

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

只读核对本机源码，HEAD 为 `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`、版本 `0.5.7`，读取前后工作树均干净。下表上游路径统一相对于绝对根目录 `C:\DEV\develop\minimax-code\`；Talos 自身路径另列。这次未构建 fork、未运行上游测试、未配置或调用自定义模型、未做网络流量审计。候选取舍见 [plan](../plan.md)，不将源代码能力或测试定义升级为本机实测。

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
| 【源码】`packages/tui/src/application/login-gate.ts:24-38`；【实测】`test/byok.test.mjs`（2026-09-28） | 登录门禁按当前模型来源区分：BYOK 不要求 MiniMax 登录；managed MiniMax 模型仍要求自己的登录。隔离 BYOK 套件完成保存 provider、设为默认、继续会话、真实读文件工具回传，并确认 managed 模型登录失败 | 第三方 provider 的认证边界已经可复用；下一步只需做真实外部 provider 探针，不应删除通用登录/权限安全逻辑 |

因此，本轮的“平级”定义为：MiniMax、第三方预设和用户自建 provider 都是可见的 provider 来源；没有按类型固定置顶，也不因为缺少 MiniMax 登录就阻止使用已测试的 custom provider。已落地的第一刀是 `packages/tui/src/provider/application.ts`：provider 视图按名称和 ID 统一排序，不再固定把 MiniMax 放在 custom provider 前面；MiniMax 的 active、readOnly、状态和凭据语义保持不变。对应回归断言已补入 `packages/tui/test/unit/provider-application.test.ts`，显式 Node 24 下 targeted Vitest 19/19 通过。BYOK 假 provider 套件也已实测通过；真实第三方模型请求仍未运行。

### 中立默认模型审计与隔离开关（2026-09-28）

本轮先读源码再决定最小改动。核对对象仍为 fork HEAD `2aed5ca703c3359dd028af51e6c4cbc6a5e15c46`、版本 `0.5.7`；以下结论是【源码】，尚未把 Talos 生产发行当作已验收。

| 等级与 path:line | 源码事实 | 本轮实现 / 限制 |
| --- | --- | --- |
| 【源码】`packages/config/src/config.ts:168-181`、`:1869-1884` | `isManagedRuntime()` 在 prod/staging 或显式 managed 时开启；非 managed npm/dev 路径不预置配置。managed 新建 `config.yaml` 时写入 MiniMax provider 和 `defaultModel: minimax/MiniMax-M3` | 保留上游 managed 语义；不把默认模型改空，也不影响当前开发路径 |
| 【源码】`packages/config/src/byok-config.ts:297-342`；`packages/config/src/config.ts:1987-2010` | managed 读配置时会补齐或保护 `provider.minimax`；用户自己的 `custom_provider` 不被这段覆盖 | 增加显式中立运行开关后，跳过自动补齐/保护，但保留用户已写入的 provider 与 defaultModel，避免隐式删除或迁移 |
| 【源码】`packages/config/src/config.ts:1643-1647` | managed 配置中的 MiniMax baseURL 会按当前区域同步 | 中立开关同时跳过该同步，防止把中立运行重新指向厂商 origin |
| 【未验】 | 中立开关下的真实第三方模型、工具、取消、load、审批和网络出口仍未验证 | 只做配置层安全闸；真实 provider 探针仍是下一步，不能把开关存在当作中立发行完成 |

本轮实现的开关名为 `TALOS_NEUTRAL_RUNTIME=1`。它是显式 opt-in，默认关闭；作用是让 managed/prod 运行时不自动创建或回填 MiniMax 默认 provider。已有用户配置保持原样，未配置 provider 时由上层 onboarding/provider 配置负责提供入口。该开关不删除通用凭据、权限、审批、沙箱或 provider 代码，也不承诺厂商云能力已被裁剪。

### 真实 custom provider 探针入口（待运行）

【源码】`packages/tui/src/cli/program.ts:170-257`、`packages/tui/src/cli/provider-command.ts:45-111`：CLI 支持 `provider add --base-url --api-format --model --api-key-env --use`；`--use` 先测试首个模型，成功后才保存并选为默认，失败不保存。`packages/tui/src/cli/environment.ts:48-72` 与 `packages/tui/src/runtime/data-dir.ts:20-36` 表明 `MINIMAX_DATA_DIR` 是进程级数据目录覆盖入口，探针可用独立临时目录隔离已有账号。

Talos 新增 `spike/custom-provider-probe.ts`，先用上述 CLI 在临时数据目录保存并选择 provider，再用同一目录启动 ACP，执行 `initialize`、`session/new` 和纯文本 `session/prompt`。脚本只接受 API key 环境变量名，不接受命令行明文密钥；输出只保留 provider origin、模型名、stopReason、更新计数和回复前缀。环境变量不完整时只做 preflight，不发请求。当前仍是【未验】真实外部 provider；工具、取消、load、审批与网络出口审计不因脚本存在而通过。

## 记录格式与纪律

每项包含：源码 commit + path:line → 请求/响应或通知形状 → 内部事件/字段映射 → 缺失与有损处理 → 可重跑脚本和脱敏 trace → 仍未覆盖的边界。先写源码依据，再测行为；只见报文不足以推导所有语义。

未来 `spike/` 和 `traces/` 尚未创建。真实测试前确认临时 cwd、模型/凭据前置与数据落点；不复制用户 token 或真实会话进项目。无消费需求的字段先不扩内部契约。未知方法不能靠“ACP 应该支持”硬接，opencode 专属 HTTP fallback 不迁入。
