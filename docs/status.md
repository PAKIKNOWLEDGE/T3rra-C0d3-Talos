# 当前状态 — Talos Desktop

更新：2026-10-12。本页是版本、验收、发布与任务阶段的唯一记录；合同见 [plan](plan.md)，协作见 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-release-closeout / docs-audit |
| 阶段 | 已完成；文档修复d528a1c已推送，产品v0.1.2不变 |
| 本轮角色 / 来源 | 用户指出talos-engine仍写旧WIP未验收状态，要求补做全面docs检查；Codex直接修正 |
| 目标 / 方案入口 | [文档一致性复核](plan.md#当前任务文档一致性复核) |
| 允许范围 | 全部现行docs/README的内容复核与修正、原文归档、文档链接/锚点检查、提交push |
| 禁止范围 | 产品/CLI修改、重新打包、改Release资产、模型调用、自动界面操作 |
| 验收 / 停止点 | 现行文档不保留旧执行阶段，事实单处维护，文件与章节链接检查通过后保存推送 |
| 完成证据 | 本轮覆盖18份现行docs与README；修改及检查见下表；检查通过：32份Markdown、226本地链接、现行章节锚点与demo基线；修复提交d528a1c已推送；后续仅本文档收口记录 |
| 下一接手 / 就绪性 | 无自动下一任务；UI-001–003待用户选择，字体来源资料待补 |

## 产品、验收与发布

| 事实 | 记录 |
| --- | --- |
| 产品源码 | 22c0b4e；其后本轮范围为文档/检查脚本，产品代码未变 |
| 版本 / 形态 | TALOS Desktop 0.1.2，Windows x64，未签名NSIS |
| 用户验收 | 2026-10-12用户明确“验收通过”，提供开屏与真实会话截图；不扩称所有高级能力已逐项验 |
| Release | v0.1.2，ID410530819，公开且latest；非草稿、非预发布；tag指向e03a353 |
| 发布时间 | 2026-10-12 19:34:41（Asia/Shanghai） |
| 安装资产 | TALOS_0.1.2_x64-setup.exe，27,668,605 bytes |
| SHA-256 | 77BB4813835B1C46CA16A65F8B14E00306880B2BEC8209CBE3920D93DFEC1FF3 |
| 其他附件 | SHA256SUMS与HarmonyOS-Sans-LICENSE.txt |
| 实际已用CLI | C:/Users/pachu77/AppData/Roaming/npm/talos.cmd；@pakiknowledge/tal0s-code 0.1.4；不等于当前npm latest声明 |
| MSI | 尚未构建/安装验收；手动构建命令只见README |

发布入口见 [README](../README.md#安装与使用)。产品源码、文档提交、Release tag分别说明，不能把文档更新伪装成重新打包或产品新验收。

【已有实测】0.1.2 release/NSIS构建与安装退出0，安装CSS含卡片完整高度规则，JS保留四个会话动作；安装Node/资源/认证WS/关闭检查通过。0.1.1的32文件162项、窗口连接、真实Studio初始化/会话载入与退出证据属于其对应候选，未在本次文档修复中重跑。详细记录见 [发布前快照](archive/2026-10-12-release/README.md)。

【本轮实测】读取GitHub releases/latest确认v0.1.2仍公开，draft=false、prerelease=false；NSIS大小与服务端digest等于上述记录。此前额外下载回读未完成，不宣称客户端下载校验通过。

## 文档复核范围与修正

这次按文件职责逐份检查18份现行docs与README；archive仅作不可变历史，不用旧阶段覆盖现行文本。此前只给旧接驳表加历史说明而未移走，属于漏改。

| 文件 | 本轮处理 |
| --- | --- |
| adapters/talos-engine | 移走旧WIP、未验收、未运行表；保留注明日期的协议来源SHA；对照生产源码纠正generic/记录替换/加载路径 |
| proposals/empty-task-layer | 移走“待产品接入”标题、拟做文件清单、预览排错；只保留设计理由、维护约束与生产入口 |
| status | 删除草稿阶段与正式发布混写、过时push描述、重复发布过程；只保留当前事实与本轮证据 |
| plan | 当前任务改为此次docs修复；产品路线不再复写版本/验收事实 |
| design | 区分demo/生产开屏/预览；移走临时来源与重复验收状态；本地参考不再做必需链接；修正README章节锚点 |
| tauri-shell | 删除已过期“R3进入条件/实施时决定”，改为宿主维护边界 |
| workflow | 明确用户指定或两次fail可由Codex接手；修正README检查章节锚点 |
| desktop-codex-parity | 删除已完成Tauri窗口的未来前置说法，保留产品边界 |
| handoff-honest | 去掉“本轮核实”的过时断言，保留归档指针 |
| licenses/README | 保留许可事实和资料缺项，发布阶段只引用status，不重写用户/代理争论 |
| fulfillment-matrix、glossary、lessons | 已读核对其职责与现行源码定位；保留动作索引、词义和工程约束，不增加进度表 |
| issues | 三个待修反馈与优先级保留，未伪称修复或新取证 |
| adapters/minimax-code、adapters/prompt-audit | 保留兼容迁移/历史审查入口，明确不是当前任务 |
| references/README、references/tui-frames | 保留本地素材与TUI历史参考边界，不当作当前GUI协议或验收 |
| README | 复核公开下载、版本、MSI与检查命令及截图；本轮无内容变更 |

原文移至 [复核前快照](archive/2026-10-12-docs-audit/README.md)。没有删除协议证据或许可证；历史行号与已解决问题只作追溯，不继续指导当前任务。

## 检查与限制

check-handoff新增现行本地Markdown章节锚点验证；此前只验证目标文件存在，未发现design/workflow链接到已删除的README章节。必需接驳文件也从旧迁移页改为talos-engine正本。改前扫描发现两个无效章节链接，现已修正；归档原文不按当前章节强制改写。

本轮仅运行文档检查与diff检查，不重跑产品/模型/画面验收。字体来源资料见 [资产记录](licenses/README.md)；三个产品问题见 [issues](issues.md)。此前清理删除受环境策略拒绝，未完成；本轮没有重试删除，没有cargo clean或关闭用户程序。完整过程保存在 [复核前状态](archive/2026-10-12-docs-audit/status.md.txt)，不把“正在运行的目录”继续当作未经本轮核对的当前事实。
