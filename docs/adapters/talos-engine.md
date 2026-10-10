# Talos Desktop 与 Studio 的接驳证据

本页记录源码依据和桌面消费差异，不记录进度。任务见 [plan](../plan.md)，验收见 [status](../status.md)。协议正本是相邻 CLI 的 docs/studio-protocol.md 与 docs/studio-parity.md；本页不复制完整 RPC 表。

## 版本与证据边界

2026-10-10 本聊天只读核对：

| 对象 | 版本与范围 |
| --- | --- |
| CLI 源码 | d045efc92408fd444487098da9a7c04318365882；C:/DEV/develop/Talos-CLI；工作树干净 |
| 桌面源码 | 94c02ec WIP 恢复点；该提交保存此前工作树，未完成产品验收 |
| Studio 契约 | 【源码】protocol.ts 的 STUDIO_PROTOCOL_VERSION = 2 |
| 实际安装版 | 本次未核验；旧文档记录 0.1.4，不等同于本次实测或 npm latest |
| 真实模型/画面 | 本次未运行；用户已报告正文粘连和 JSON 噪音 |

CLI 的 status 尚保留旧 ACP/0.1.3 交接记录，与当前 Studio 源码不是同一时间切面。不得因此把 Desktop 改回 ACP，也不得把源码 HEAD 等同于用户 PATH 中的可执行文件。本轮只读引擎，不替引擎修改状态卡。

下面 CLI 位置均相对 C:/DEV/develop/Talos-CLI；对应上述 SHA。行号随版本改变，实施时核对符号和实际文件。

## 已存在的运行入口

| CLI 位置 | 【源码】结论 |
| --- | --- |
| packages/tui/src/cli/run-studio-command.ts:64 | 以 surface: studio 创建运行时 |
| packages/tui/src/studio/runtime.ts:4 | StudioRuntime = TuiRuntime |
| packages/tui/src/studio/server.ts:136 | turn/event 携带外层 sessionId、turnId 和 TuiStreamEvent |
| packages/tui/src/studio/server.ts:411 | session/messages 调用 runtime.listMessagePage |
| packages/tui/src/studio/server.ts:462 | turn/start 进入 executeTuiInteractiveTurn，沿用交互回合执行 |
| packages/tui/src/studio/server.ts:531 | turn/watch 接运行时 watchSessionTurn；通知与恢复结局仍需桌面正确消费 |
| packages/tui/src/runtime/stream-events.ts:104 | TuiStreamEvent 定义 delta、message、generic、替换/回退、错误等 |
| packages/tui/src/runtime/stream-events.ts:574 | readString 保留字符串内容，不 trim 正文 |

【源码】桌面 [宿主](../../src/host/talos-studio-process.ts) 已启动 studio，并由 [适配器](../../src/adapter/talos-studio.ts) 消费 JSON-RPC。应在这条路线修正消费语义；没有从已确认故障推出更换协议的依据。

## 消息语义与桌面差异

| 项 | CLI/TUI 源码依据 | 桌面当前差异 |
| --- | --- | --- |
| 增量正文 | turn-live-projection.ts:47、301，原片段进入 queueTextDelta | 【源码 R1】studio-message-text.ts 仅剥 thinking 块；delta 原样追加；空格片段保留 |
| 完整消息 | turn-live-projection.ts:57、312，按消息 ID 更新内容 | 【源码 R1】assistant.replace 按 messageId 覆盖正文，不重复 delta |
| 历史顺序 | turn-history-projection.ts:83，顺序遍历 parts | 【源码 R1】session-history.ts 按 parts 顺序投影 text/tool/text |
| 身份 | 实时通过 turn/message 关联 | 【源码 R1】FactStore 仅按 messageId 合并；不以正文相等去重 |
| 通用事件 | turn-projection.ts:164 | 【源码 R1】query_collapse_view 不进入 UI；其余 generic 仍可能 JSON |
| 完整记录替换 | turn-projection.ts:142、146 | 【源码 R1】messages-replaced/rewound/resync-required 触发 session/messages 重载 |
| 错误 | stream-events.ts:107 使用 message | 【源码 R1】error 帧读取 message 字段 |

表中 TUI 投影文件位于 packages/tui/src/tui/controller/projection/。以上是源码对照，不声称已在当前安装包复现每项差异。

### 消费边界

- 引擎拥有会话、回合、工具执行、权限与持久记录；桌面拥有显示投影、用户选择与宿主生命周期。
- 文本与身份先无损保留，再按视觉格式化。思考、正文、工具、系统事件各按语义消费，不能为了适配旧气泡模型丢字段。
- 完整 message 与 delta 是不同操作；去重依赖身份与已核实的重放语义。不能用“之前出现过相同文字”消除记录。
- TUI 投影是语义参考，不直接把其内部模块导入桌面，不把整个 TUI 源码复制成第二个运行时。
- 未知事件可留脱敏开发诊断；进入用户界面需要明确用途和文案。保留数据不等于默认显示 JSON。
- 启动、重连、取消受理和真实终态分开记录；不能从请求成功或按钮消失推断业务已结束。

## 基本路径的其他具体发现

【源码】talos-studio.ts 的 loadSession 先 await emitSessionBundle，再 hydrateSessionHistory；emitSessionBundle 继续 await refreshSessionAuxiliary，其中包含技能、MCP、诊断、上下文、后台任务、插件与目标等读取。这形成辅助查询阻塞历史加载的路径。尚未测量实际延迟，不将其写成已复现性能事故。

【源码】宿主、JSON-RPC pending 与超时/退出恢复是否满足桌面候选要求，应在涉及这些路径的任务内核对；本页不宣称整层已可靠，也不派发泛化全库审计。

## 如何补证

改动涉及哪个语义，就补哪条来源、映射和有损项。合成 fixture 标注来源 SHA 和输入形状；真实运行另记 executable、版本、工作区条件及是否调用模型。脱敏后只留下可复现的最小事件和结果，不提交私人会话。

动作与 RPC 查询入口见 [fulfillment-matrix](../fulfillment-matrix.md)。现有测试文件是线索，不是引擎契约权威；先核源码，再更新与本轮相关的断言。
