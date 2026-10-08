# Talos 提示词审查报告

日期：2026-10-06（静态快照）。源码基点：CLI main **738c495**。身份 rebranding 已在 CLI **0.1.2** 合入；现行引擎事实见 Talos-CLI [status](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/blob/main/docs/status.md) 与 [verification](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/blob/main/docs/verification.md#talos-prompt-identity-rebrand-2026-10-07)。本报告不改引擎，不运行模型，不读取真实 profile、密钥和会话。

## 结论

模型看到的产品身份尚未完成中立化。默认TUI系统模板仍声明MiniMax Code及其开发方，运行时agent-context还注入Mavis/display name、mavis/routing ID等内部身份。终端界面改名不影响这些文本。重复等待回复则与轮询guard注入和可见回复规则叠加有关：提醒本身隐藏，模型回应显示，不能只从UI层删文字解决。

不是所有留存模板同时生效。CLI默认profile选V2；旧_default、_migration和mavis/features模板不能按文件存在就算已加载。memory/cron在命令行profile有关闭分支，按需技能也不一次性把正文全部装入上下文。

## 覆盖与限制

本轮逐文件提取73份非skills的文本资产，合计177278字符；它们包括persona元数据、模板、模式提示、迁移和辅助工作流，不是73条同时生效的system prompt。另索引389份技能说明/参考文档，合计2503354字符，其中43份SKILL.md。数据来自packages/local-runtime-v2/assets、packages/local-runtime/assets及存在的TUI assets；计数包含语言版本、兼容资产及非行为参考资料。

同时扫描packages和vendored pi源码，得到400个动态提示/description候选文件。这个数字是检索候选数，包含类型及非提示description，不能称为400条提示词或400文件全部完成人工审查。具体审读以本文列出的组装、reminder、工具定义、goal/plan/压缩路径为准。技能正文及参考资料完成索引和特征扫描，不声称逐句专业审核了文档格式、研究或飞书参考手册。

原始资产完整文本、技能完整文本与动态源候选JSON保存在本仓库忽略目录.talos/prompt-audit-20261006，可供逐条复核。未读取远端托管或加密prompt，不读取用户定制文件，因而不能给出某次真实会话的最终拼接prompt或精确token用量。本报告覆盖可见仓库来源，不冒称覆盖未知运行环境中的一切提示。

## 模型实际收到哪些层

| 层 | 来源与选择 | 作用 / 边界 |
| --- | --- | --- |
| 主系统模板 | V2 _v2/tui、coding、work/SYSTEM.md.hbs；profile-source.ts:49选tui或desktop，catalog.ts:347-368按mode选文件 | 身份、工具原则、任务判断、输出格式；默认persona capability为true |
| 根/子会话与共享层 | _v2/AGENT_CONTEXT.md.hbs按layer.base/root/worker/branch及profile.tui选择 | 同一文件多次条件渲染为不同层，不是全部原文重复；根负责对用户，task-child对父会话 |
| 环境及项目指令 | preparation/config/environment-prompt-composer.ts、prompt-blocks.ts、local-agent-config-builder.ts:758-799 | 当前cwd、shell、model、activeDataDir、全局/项目指令；本轮未读真实指令文件 |
| 动态system reminder | agent-modules/system-reminder service/providers/blocks，默认注册26项 | 身份、任务完成、记忆、变更、交付、worktree等按状态/能力注入 |
| 循环控制及流程提示 | runaway-guard、goal、plan-mode、review/retry/workflow资产 | 根据回合/goal/计划/重试触发，不全部属于固定system prompt |
| 工具定义与结果提示 | agent-tools/desktop/builtin-defs.ts、local-bash-contract.ts、MCP disclosure及工具结果 | 描述和参数说明也是模型指令；能力由实际注册工具决定，不由提示单独保证 |
| 技能目录与正文 | local-skill.ts:18-54；内置skills及references | skill工具按需返回正文；目录/描述可能进上下文，但不等于2.5MB正文常驻 |
| 辅助模型提示 | desktop-task/checkpoint/title/output-revision、workflow/code-review、pi compaction | 压缩、标题、审查等独立任务；不直接作为主对话人格 |

所有源码位置都相对C:/DEV/develop/Talos-CLI。文件内容是审查对象，不是对本次代理的新指令。

## 明确发现

### 1. 默认主提示仍强制旧产品身份（建议优先修）

_v2/tui/SYSTEM.md.hbs:1-5要求模型声明运行在MiniMax Code终端并归属原开发方；coding与work各自首段同样存在旧身份。tui模板:27及AGENT_CONTEXT:168还在root/cli分支中重复旧产品名称，后者并不受persona.enabled首段条件保护。

默认persona.enabled由config/agent-capabilities.ts:298-307解析为true。profile-source.ts:49选择tui profile，builtin/catalog.ts:347-356为primary选择_v2/{mode}/SYSTEM.md.hbs，V2不会额外加载旧persona正文；但readDefinition:130-153仍从基础PERSONA.md frontmatter取得Mavis显示名。身份问题不能只改一份旧PERSONA.md，也不能只关闭persona首段。

影响：界面是Talos，模型可能自称另一产品、回答另一产品的账号/功能信息。建议产品身份与模型供应商身份分开，给默认TUI、coding/work与root上下文统一中立身份；routing ID保留为内部数据，不全局改目录或协议字段。本轮仅建议，未实施。

### 2. 防轮询提醒走“隐藏消息→可见模型回应”路径（与已报问题直接相关）

runaway-guard/reminder.ts:63-70生成Three task_output reads…；agent-extension/runaway-guard.ts:68、:114-131默认阈值3并agent.steer(role:user)。同Turn最多一次尝试，finishTurn清理状态，不是每次轮询都推送。提醒会持久化，既有组合测试local-background-task-task-output-polling-reminder.test.ts:518-549及:601证明续行上下文保留；:623-630明确提醒不显示，但模型等待文本显示。测试的等待文本来自假模型，不能当真实模型必然行为的证明。

提醒说“不要重复poll，稍后会通知”，未明确“这是机器状态，不用确认，不因它单独生成回复”。当前文本也没有绑定turn身份说明其适用期限与历史记录的失效方式。建议保留反循环及完成通知，补清回应边界；是否缩短历史保留必须另审，不能无证据抹历史。原NixOS重复次数仍未复现。

### 3. 强制可见preamble可助长碎片回复（需要与等待规则一并设计）

preparation/prompt-blocks.ts:10-12的TOOL_CALL_PREAMBLE_REMINDER要求每个非平凡工具步骤前必须发非空可见文本；runtime-prompt-rules.ts:29-36在交互面插入。TUI SYSTEM的Preamble部分又要求简短分组、避免为琐碎读取单独发消息。不是逻辑上完全矛盾，但“必须有文字”比“只在有用时更新”更强，容易让模型把继续等待、读取状态当作需要确认的交流。

这不能证明原会话每次短回复由preamble造成；它是已确定的提示压力。建议明确机器提醒无需确认、被动等待不等于新的工具阶段，进度按事实变化更新，而不是简单删除所有进度说明。

### 4. 内部身份与产品人格缺少清晰隔离（建议与第1项合并修）

system-reminder/blocks.ts:105-115首回合注入display name、routing ID、agentRole；:206-219简版仍带显示名及路由名。providers.ts:193-198决定完整/简版。mavis/PERSONA.md:2为Mavis；builtin/catalog.ts:145-153把primary映射为orchestrator。

提示给了模型身份，但没有明确禁止把internal agentName/role当成文档作者或维护者。内部session ID、root/branch路由仍有用途，不能一删了之。建议以产品身份讲话，技术routing metadata明确仅用于调度；不作为文档署名/责任方，不从这些标签推断实际模型身份。

### 5. 规则多层叠加和条件资产需清理，但不是全删

- TUI/coding/work都有自己的communication、memory、delivery规则，共享AGENT_CONTEXT又含同类规则；实际条件渲染可能有重叠，应以渲染结果确认重复量，不用文件数量估token开销。
- prompt-blocks.ts:1-4把全局/项目指令描述为覆盖任何默认行为。这里是项目指令层，不是任意工具输出都获授权；不过措辞过宽，未来宜明确它不能覆盖安全、宿主权限和最新任务范围。没有实测可利用的越权，不称安全漏洞。
- coding/work的deliver-assets协议与默认TUI的Markdown绝对文件链接不同，是不同surface的协议。不能为了统一文案随意替换；只在模式/客户端不匹配时构成问题，目前未复现。
- 独立checkpoint提示严格要求八段协议、把历史当数据，不调用工具；保留这些防损规则，不和主模型人格一起清空。
- 被停用能力的skill/旧模式资产仍可能随构建拷贝。打包存在不等于可调用，但产品说明skills若被实际披露仍可能引导旧账号、厂商网站和服务；下一修复应对照actual skill roster，而非只搜索替换名字。

## 条件启用内容的判断

CLI profile-source.ts:53-54显式关闭命令行memory与cron，:73-77将features.mavis置false；不因此关闭persona。asyncAuditProvider在providers.ts:590-605检查mavisEnabled和cronEnabled，CLI正常路径不应被要求周期cron。memory多层提示、技能进化、旧team板提醒不能全部算当前CLI主动规则。用户自定义profile是否重开能力未读取。

默认system-reminder注册26项，按状态条件过滤：身份与peer/plan；memory技能/主题/更新与persona缺失；branch完成/pending/任务完成；bootstrap、worktree、team memory；identity/config/inbound更新；skill evolution；media交付；async audit；secret env。board nudge是另行追加的provider，轮询guard不是这26项之一。media提示按首回合再10→20→40间隔，async audit按首回合再5→10→20间隔且须cron；不存在“每次都全部注入”的依据。

Explore只读、不写交付文件，Verifier只判断不修，Worker做有边界的交付；角色拒绝用ROLE_MISMATCH。goal提示维持目标、完成审计、阻塞阈值与预算停止；当前代码仍有complete后立即stop的措辞，与用户期待最终收尾答复有张力，属于之前暂缓的#421生命周期范围，本轮不夹带修复。

Plan Mode严格限制变更，仅可写canonical plan；Read/Edit/Bash工具说明有重复，但文件校验、权限、终端字符清理、拒绝后不原样重试均应保留。专用审查提示要求只报本次引入问题和具体证据，可减少无边界检查，并非导致此轮问题的坏规则。

## 审查结论与后续边界

2026-10-07架构判断：产品身份残留是明确中立化漏项；机器提醒、可见preamble与内部身份语义边界需要一起处理，但静态关联不证明它们是原会话全部症状的唯一原因。

同Turn最多一次提醒与多次可见短回复之间仍有证据缺口。保留反循环/后台完成机制，不能直接删历史；提示澄清不能保证模型静默，字符串测试和假模型固定回复不能替代真实行为验收。

限定修复提案及验收矩阵见[plan](../plan.md#提示词边界修复提案)。本报告只保留来源和审查结论，不另建实施队列。资产索引不代表全部需改；本轮未实施、未运行模型或推送。

## 附录：资产索引

以下索引来自仓库文本，不表示每项均在默认CLI执行。

| 资产路径（相对CLI根） | 行数 | 字符数 |
| --- | ---: | ---: |
| packages/local-runtime-v2/assets/agents/_default/prompt-base-all.md | 121 | 7603 |
| packages/local-runtime-v2/assets/agents/_default/prompt-base-all.md.hbs | 255 | 13643 |
| packages/local-runtime-v2/assets/agents/_default/prompt-base-windows.md | 6 | 766 |
| packages/local-runtime-v2/assets/agents/_default/prompt-base-windows.md.hbs | 6 | 766 |
| packages/local-runtime-v2/assets/agents/_default/prompt-base-worker.md | 12 | 617 |
| packages/local-runtime-v2/assets/agents/_default/prompt-base-worker.md.hbs | 27 | 1229 |
| packages/local-runtime-v2/assets/agents/_default/prompt-session-branch.md | 3 | 224 |
| packages/local-runtime-v2/assets/agents/_default/prompt-session-branch.md.hbs | 30 | 1556 |
| packages/local-runtime-v2/assets/agents/_default/prompt-session-root.md | 4 | 282 |
| packages/local-runtime-v2/assets/agents/_default/prompt-session-root.md.hbs | 32 | 1552 |
| packages/local-runtime-v2/assets/agents/_migration/coder/PERSONA-zh.md | 10 | 251 |
| packages/local-runtime-v2/assets/agents/_migration/coder/PERSONA.md | 11 | 513 |
| packages/local-runtime-v2/assets/agents/_migration/coder/system-prompt.md.hbs | 42 | 2097 |
| packages/local-runtime-v2/assets/agents/_migration/general/PERSONA-zh.md | 11 | 257 |
| packages/local-runtime-v2/assets/agents/_migration/general/PERSONA.md | 11 | 464 |
| packages/local-runtime-v2/assets/agents/_migration/general/system-prompt.md.hbs | 49 | 2295 |
| packages/local-runtime-v2/assets/agents/_migration/README.md | 20 | 976 |
| packages/local-runtime-v2/assets/agents/_v2/AGENT_CONTEXT.md.hbs | 222 | 12323 |
| packages/local-runtime-v2/assets/agents/_v2/coding/SYSTEM.md.hbs | 161 | 11718 |
| packages/local-runtime-v2/assets/agents/_v2/explore.md.hbs | 38 | 1559 |
| packages/local-runtime-v2/assets/agents/_v2/tui/SYSTEM.md.hbs | 147 | 9778 |
| packages/local-runtime-v2/assets/agents/_v2/verifier.md.hbs | 32 | 1392 |
| packages/local-runtime-v2/assets/agents/_v2/work/SYSTEM.md.hbs | 173 | 13282 |
| packages/local-runtime-v2/assets/agents/_v2/worker.md.hbs | 27 | 955 |
| packages/local-runtime-v2/assets/agents/desktop-task/archive-title/system-en.md | 1 | 186 |
| packages/local-runtime-v2/assets/agents/desktop-task/archive-title/system-zh.md | 1 | 95 |
| packages/local-runtime-v2/assets/agents/desktop-task/checkpoint/system.md | 15 | 1093 |
| packages/local-runtime-v2/assets/agents/desktop-task/output-revision/system.md | 1 | 380 |
| packages/local-runtime-v2/assets/agents/desktop-task/retry/continuation.md | 4 | 334 |
| packages/local-runtime-v2/assets/agents/desktop-task/session-title/system.md | 41 | 2426 |
| packages/local-runtime-v2/assets/agents/explore/agent.md | 14 | 156 |
| packages/local-runtime-v2/assets/agents/explore/PERSONA-zh.md | 8 | 192 |
| packages/local-runtime-v2/assets/agents/explore/PERSONA.md | 8 | 324 |
| packages/local-runtime-v2/assets/agents/explore/system-prompt.md.hbs | 35 | 1392 |
| packages/local-runtime-v2/assets/agents/greeting-zh.md | 61 | 1247 |
| packages/local-runtime-v2/assets/agents/greeting.md | 61 | 3037 |
| packages/local-runtime-v2/assets/agents/mavis/features/cron.md.hbs | 23 | 1186 |
| packages/local-runtime-v2/assets/agents/mavis/features/delegation.md.hbs | 56 | 2058 |
| packages/local-runtime-v2/assets/agents/mavis/features/memory.md.hbs | 61 | 3401 |
| packages/local-runtime-v2/assets/agents/mavis/features/recoverable-deletion.md.hbs | 10 | 453 |
| packages/local-runtime-v2/assets/agents/mavis/features/task-management.md.hbs | 11 | 487 |
| packages/local-runtime-v2/assets/agents/mavis/features/web-search.md.hbs | 11 | 1253 |
| packages/local-runtime-v2/assets/agents/mavis/modes/coding/online/PERSONA-zh.md.hbs | 20 | 667 |
| packages/local-runtime-v2/assets/agents/mavis/modes/coding/online/PERSONA.md.hbs | 20 | 1570 |
| packages/local-runtime-v2/assets/agents/mavis/modes/coding/online/SYSTEM.md.hbs | 159 | 10224 |
| packages/local-runtime-v2/assets/agents/mavis/modes/work/online/PERSONA-zh.md.hbs | 20 | 667 |
| packages/local-runtime-v2/assets/agents/mavis/modes/work/online/PERSONA.md.hbs | 20 | 1570 |
| packages/local-runtime-v2/assets/agents/mavis/modes/work/online/SYSTEM.md.hbs | 161 | 10319 |
| packages/local-runtime-v2/assets/agents/mavis/PERSONA-zh.md | 7 | 329 |
| packages/local-runtime-v2/assets/agents/mavis/PERSONA.md | 7 | 505 |
| packages/local-runtime-v2/assets/agents/mavis/prompt-session-root.md | 4 | 282 |
| packages/local-runtime-v2/assets/agents/mavis/prompt-session-root.md.hbs | 4 | 282 |
| packages/local-runtime-v2/assets/agents/mavis/system-prompt.md.hbs | 97 | 5211 |
| packages/local-runtime-v2/assets/agents/verifier/agent.md | 17 | 201 |
| packages/local-runtime-v2/assets/agents/verifier/PERSONA-zh.md | 8 | 202 |
| packages/local-runtime-v2/assets/agents/verifier/PERSONA.md | 8 | 334 |
| packages/local-runtime-v2/assets/agents/verifier/system-prompt.md.hbs | 28 | 1216 |
| packages/local-runtime-v2/assets/agents/worker/agent.md | 18 | 210 |
| packages/local-runtime-v2/assets/agents/worker/PERSONA-zh.md | 8 | 187 |
| packages/local-runtime-v2/assets/agents/worker/PERSONA.md | 8 | 319 |
| packages/local-runtime-v2/assets/agents/worker/system-prompt.md.hbs | 22 | 794 |
| packages/local-runtime-v2/assets/agents/workflow/code-review/review-candidates.md | 120 | 5940 |
| packages/local-runtime-v2/assets/agents/workflow/code-review/reviewer-system.md | 75 | 4361 |
| packages/local-runtime-v2/assets/agents/workflow/goal/budget-limit.md | 16 | 632 |
| packages/local-runtime-v2/assets/agents/workflow/goal/continuation.md | 62 | 8047 |
| packages/local-runtime-v2/assets/agents/workflow/goal/objective-updated.md | 16 | 644 |
| packages/local-runtime-v2/assets/agents/workflow/goal/recovery-terminal-audit.md | 12 | 808 |
| packages/local-runtime-v2/assets/agents/workflow/goal/recovery.md | 11 | 710 |
| packages/local-runtime-v2/assets/agents/workflow/goal/terminal-audit.md | 9 | 553 |
| packages/local-runtime-v2/assets/agents/workflow/plan-mode/agent-entry.md | 72 | 4395 |
| packages/local-runtime-v2/assets/agents/workflow/prompt-hook/system.md | 0 | 0 |
| packages/local-runtime/assets/prompts/code-review/review-candidates.md | 120 | 5940 |
| packages/local-runtime/assets/prompts/code-review/reviewer-system.md | 75 | 4361 |

### 技能入口

43个SKILL.md入口如下，另346份参考/步骤/说明文件见忽略目录完整索引；只在实际披露/读取时影响模型，不默认全量注入。

- packages/local-runtime-v2/assets/agents/mavis/skills/control-in-app-browser/SKILL.md（32112字符）
- packages/local-runtime-v2/assets/agents/mavis/skills/minimax-code-product/SKILL.md（6596字符）
- packages/local-runtime/assets/skills/code-review/SKILL.md（2764字符）
- packages/local-runtime/assets/skills/cu-desktop/SKILL.md（10704字符）
- packages/local-runtime/assets/skills/deep-research/SKILL.md（11903字符）
- packages/local-runtime/assets/skills/deploy-website/SKILL.md（3996字符）
- packages/local-runtime/assets/skills/docx/SKILL.md（11382字符）
- packages/local-runtime/assets/skills/edit-deployed-website/SKILL.md（1683字符）
- packages/local-runtime/assets/skills/init/SKILL.md（6751字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-approval/SKILL.md（1063字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-attendance/SKILL.md（1182字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-base/SKILL.md（44449字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-calendar/SKILL.md（6167字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-contact/SKILL.md（745字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-doc/SKILL.md（7851字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-drive/SKILL.md（11130字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-event/SKILL.md（715字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-im/SKILL.md（8978字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-mail/SKILL.md（25143字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-minutes/SKILL.md（4409字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-openapi-explorer/SKILL.md（3165字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-shared/SKILL.md（4284字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-sheets/SKILL.md（10379字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-skill-maker/SKILL.md（1982字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-slides/SKILL.md（13930字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-task/SKILL.md（6223字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-vc/SKILL.md（5358字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-whiteboard/SKILL.md（7034字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-whiteboard-cli/SKILL.md（8782字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-wiki/SKILL.md（3488字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-workflow-meeting-summary/SKILL.md（2693字符）
- packages/local-runtime/assets/skills/lark-tools/cli-skills/lark-workflow-standup-report/SKILL.md（2852字符）
- packages/local-runtime/assets/skills/lark-tools/SKILL.md（20495字符）
- packages/local-runtime/assets/skills/llm-call/SKILL.md（2356字符）
- packages/local-runtime/assets/skills/mcode-tools-master/SKILL.md（5281字符）
- packages/local-runtime/assets/skills/pdf/SKILL.md（28631字符）
- packages/local-runtime/assets/skills/pptx/SKILL.md（12959字符）
- packages/local-runtime/assets/skills/resume-codex/SKILL.md（2349字符）
- packages/local-runtime/assets/skills/skill-creator/SKILL.md（8974字符）
- packages/local-runtime/assets/skills/skill-refiner/SKILL.md（5112字符）
- packages/local-runtime/assets/skills/visual-page/SKILL.md（9941字符）
- packages/local-runtime/assets/skills/x-link-reader/SKILL.md（3414字符）
- packages/local-runtime/assets/skills/xlsx/SKILL.md（26422字符）

### 原始文件及范围

- .talos/prompt-audit-20261006/prompt-assets-full.md：73份资产原文。
- .talos/prompt-audit-20261006/skill-assets-full.md：389份技能及参考资料原文。
- 同目录prompt-assets.json/skill-assets.json：路径、行数、字符数、条件/标题和完整文本。
- prompt-source-candidates.json：400个动态提示/description候选源码，用于补查，不是人工审查通过清单。

原始导出仅含仓库已公开源码/资产，未包含用户配置或对话。当前未冻结某个真实会话的动态工具列表，未联网查询远端prompt，未读取用户AGENTS/插件/MCP说明；这些运行时层不能以静态文件清单代替。
