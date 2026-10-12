# Talos Desktop 与 Studio 接驳

本页维护协议来源、生产消费路径和语义约束。桌面版本、安装CLI版本、检查和验收结果唯一记录在 [status](../status.md)，不在这里建立第二张状态表。动作索引见 [fulfillment-matrix](../fulfillment-matrix.md)。

## 协议依据

Desktop 唯一引擎入口是 `talos studio` 的 stdio JSON-RPC；宿主启动已安装CLI，不能复制引擎业务或直接导入其内部模块。协议正本为引擎仓库 `docs/studio-protocol.md` 与 `docs/studio-parity.md`。

已有CLI源码核对基点为 `d045efc92408fd444487098da9a7c04318365882`，Studio协议版本2。这是2026-10-10保存的协议来源，**不是当前CLI HEAD或实际安装包的版本声明**；本轮未重读引擎源码。旧行号表、旧WIP状态与当时问题保存在 [原文快照](../archive/2026-10-12-docs-audit/adapters-talos-engine.md.txt)。

修改引擎语义前，先读引擎自己的AGENTS/status，再核对对应版本的协议与符号。不能把旧源码行号当作新版本证据，也不能把源码HEAD等同于用户PATH中的可执行文件。

## 桌面生产路径

以下为本轮只读核对的桌面源码定位，不等于新增运行验收。

| 责任 | 生产入口 | 消费规则 |
| --- | --- | --- |
| 启动引擎 | [talos-studio-process](../../src/host/talos-studio-process.ts)、[runtime](../../src/service/runtime.ts) | 使用用户工作区启动Studio；失败显示原因，不假在线 |
| JSON-RPC与会话动作 | [talos-studio](../../src/adapter/talos-studio.ts) | 发送Studio方法，处理通知/返回；请求受理与回合终态分开 |
| 实时消息 | [studio-stream](../../src/adapter/studio-stream.ts)、[文本处理](../../src/adapter/studio-message-text.ts) | delta保留空格/换行；完整message按身份替换，思考与正文分别投影 |
| 历史记录 | [session-history](../../src/adapter/session-history.ts) | 按消息parts顺序恢复text/tool/text，不以正文相同去重 |
| 状态归并 | [FactStore](../../src/core/fact-store.ts) | 保留session/turn/message/part身份、进程代次及回合终态 |
| generic通知 | studio-stream的INTERNAL_GENERIC_EVENTS、GENERIC_NOTICE_EVENTS | 内部query_collapse_view忽略；仅白名单且含message的事件成为通知，不直接dump未知JSON |
| 记录替换/重同步 | studio-stream的messages-replaced、messages-rewound、resync-required | replaced映射携带的messages为session.history_replaced；rewound/resync映射history_resync，不把它们写成同一种重载操作 |
| 错误 | studio-stream与宿主错误路径 | 使用协议的message字段；辅助读取失败不伪造连接成功 |

## 加载依赖与责任边界

【源码】talos-studio的loadSession依次调用emitSessionBundle、requestHistory、syncActiveRun。emitSessionBundle包含commands/list及用量、账号、交互、辅助查询；requestHistory再调用hydrateSessionHistory。这里描述调用顺序，不把它写成已复现的性能故障。

- 引擎拥有会话持久化、回合、工具执行与权限；桌面拥有显示投影、用户选择与宿主生命周期。
- delta追加、完整消息替换、历史整体替换、回退/重同步必须按各自语义处理；不能统一为追加，也不能按正文相等去重。
- TUI投影可作语义参考，不进入桌面运行时。文本与事件原文和显示格式分离。
- 取消受理、审批回复与真实终态分别确认，不以按钮或卡片消失推断完成。

## 补证方式

变更哪条语义就核哪条协议来源，fixture标注来源SHA和输入形状。真实运行另记实际executable/版本与模型调用范围，脱敏证据归status；测试文件只是定位线索，不是引擎契约权威。已知产品缺陷只在 [issues](../issues.md) 维护，不从本页自动派发任务。
