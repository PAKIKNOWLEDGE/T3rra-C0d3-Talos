# 桌面动作与 Studio 接线索引

本页按需定位用户动作与 RPC。它不是完整 Studio 方法表、完成度表或自动实施队列；当前只执行 [plan](plan.md) 的一个任务。协议正本在 CLI docs/studio-parity.md，消息语义依据见 [接驳证据](adapters/talos-engine.md)。

“已有接线”只表示源码中有路径，不等于技术复核或用户验收通过；后者只记 [status](status.md)。

| 用户动作 | Studio / 宿主入口 | 桌面定位与必须保留的语义 |
| --- | --- | --- |
| 连接工作区 | studio/initialize；宿主 cwd | host/talos-studio-process、service/runtime；失败可读，不假在线 |
| 列出会话 | session/list | adapter/session-index；列表错误与空列表分开 |
| 新建/打开/恢复 | session/create、load、resume；session/messages | adapter/talos-studio、session-history；恢复失败可重试，不伪造历史 |
| 查看运行中会话 | session/activeRun、turn/watch | 运行状态与终态区分；不串会话 |
| 删除/改名/归档 | session/delete、rename、archive | 权威结果确认后刷新目录 |
| 结束附着 | session/close | 关闭与删除不是同一动作 |
| 发送任务 | turn/start | 稳定 turn/message 身份，正文原样 |
| 停止任务 | turn/cancel | 受理与实际终态分开 |
| 实时记录 | turn/event、turn/completed | studio-stream、FactStore；delta 追加、完整 message 更新 |
| 重新打开记录 | session/messages | session-history；按 parts 顺序恢复，不按正文去重 |
| 模式/模型/思考配置 | session/setMode、config/options、config/set、models/list | 引擎返回值为事实；待生效与当前生效分开 |
| 斜杠补全 | commands/list | slash-commands、app/slash-prompt；命令类型先分类 |
| 内建管理斜杠 | 桌面 execute_slash 分派到对应 Studio 方法 | studio-slash；不把管理命令当自然语言塞进 turn/start；技能调用按协议单独核对 |
| 审批 | permission/list、permission/reply | approval 状态；选项来自引擎，拒绝/允许的真实效果不能由卡片消失推断 |
| 用量/上下文 | inspection/usage、context；可选 usageSummary、usage/commits/subscribe | usage-from-studio；缺字段保持缺失，辅助失败不覆盖连接事实 |
| 账号只读 | account/status | studio-account；不造第二套登录 |
| 问卷/计划审查 | questionnaire/getPending、getPlanReview、reply、dismiss | studio-questionnaire；实际 pending 与可操作选择 |
| 文件提及 | workspace/files/list、search | workspace-file-list；无源时说明，不造候选 |
| 排队/插话 | queue/*、turn/steer | studio-inspection、talos-studio；队列不等于并行生成 |
| 分叉/回退/编辑 | session/forkOptions、fork、rewindPreview、rewind、editMessage | studio-fork、talos-studio；预览/确认与执行结果分开 |
| Git/技能/MCP/诊断等检视 | workspace/git、inspection/*、backgroundTasks/list、plugins/listInstalled 等 | 辅助查询与主记录隔离；有入口才按需接，不为覆盖 RPC 铺 UI |
| 窗口/系统选目录 | Tauri / OS | 宿主职责；不新建引擎协议 |

源码路径相对 src/，app/ 除外。新能力进入当前任务时才写清具体事件、状态和失败行为；不要复制整个引擎接口表。

## 消息接驳约束

“未知 generic → 用户通知”已被源码对照否定，应按已核实产品语义选择展示。数据保留与默认展示分开；内部 query_collapse_view 不进聊天正文。

现有 test/studio-helpers.test.ts、test/session-history.test.ts、test/timeline-fact-store.test.ts 是相关测试入口。其他按名称分带的测试仅作历史组织，不决定执行顺序。机读证据与用户验收均依 [plan](plan.md) 和 [workflow](workflow.md) 绑定候选。
