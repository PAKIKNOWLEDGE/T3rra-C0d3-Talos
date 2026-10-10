# Talos 词汇表

| 名称 | 本仓含义 |
| --- | --- |
| Talos CLI | C:/DEV/develop/Talos-CLI；用户已满意的终端产品与引擎，拥有 TUI、Studio、provider 和持久数据 |
| Talos Desktop | 本仓开发的 Windows 桌面工作台，使用相同引擎能力与已确认视觉 |
| Studio | talos studio，stdio JSON-RPC，当前所读源码协议 v2；Desktop 唯一引擎入口 |
| ACP | CLI 保留的编辑器客户端接口；不是本仓 Desktop 路线 |
| 宿主 | 管理 CLI 子进程、cwd 与系统 I/O 的桌面侧代码；当前为 Node 开发服务，Tauri 方案后续落实 |
| 投影 | 把引擎消息转换成显示记录，保留其内容、身份、顺序与语义 |
| 候选 | 绑定提交、检查证据和启动入口的待验版本；不等于 release |
| 技术复核 | Codex 独立核对实现是否符合当前任务合同 |
| 产品验收 | 用户确认候选中的真实使用与视觉；不替代执行者的技术自验 |
| Cursor 执行者 | 用户在 Cursor 中指派的实现代理；不凭型号决定权限 |
| Codex 规划与复核者 | 在 Codex 对话中设计任务、查证架构、复核候选的协作职责 |
| Astra / Luna | 旧职责叫法，仅供理解历史；当前流程不要求重复声明 |
| Perlica | 模型可见的默认人格/显示名，不是供应商或型号声明 |
| mavis 等 | 内部路由和兼容标识，不据此改变对外产品身份 |
| MiniMax Code | 上游来源与版权/NOTICE 语境；不作为当前安装产品名 |
| Rhodes / T3rra | 只读经验来源，不是本仓运行时依赖 |
| Endfield | 视觉参考族，具体正本见 [design](design.md) |

产品与引擎各有状态卡。本仓事实只见 [status](status.md)；引擎发行以其对应版本证据为准，不能由桌面源码推断已发布。
