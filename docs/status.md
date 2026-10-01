# 当前状态

更新：2026-10-01。唯一执行入口是本页交接卡；不以归档、旧聊天或README命令目录生成任务。

## 当前交接卡

| 字段 | 当前值 |
| --- | --- |
| 任务标识 / 修订 | cli-user-acceptance / r1 |
| 阶段 | 待主人验收 |
| 本轮角色 / 来源 | Luna；主人已确认包名@pakiknowledge/tal0s-code，本轮要求准备验收候选 |
| 目标 / 方案入口 | 真实包名本地安装与两个验收启动入口；[验收方案](plan.md#本地用户验收候选) |
| 允许范围 | 现有干净CLI3055bc5构建/本地打包安装、验收启动脚本、fake新版预览及文档，不改引擎行为 |
| 禁止范围 | 不发布/push、不替换全局mcode、不读取/复制token、不自动发模型请求，不决定首发版本 |
| 验收 / 停止点 | 独立prefix实际安装、真实包名/launcher及安装后核心回归；可直接启动普通体验与假新版预览，交给主人后停 |
| 完成证据 | CLI3055bc5未改；@pakiknowledge/tal0s-code 0.5.7已独立prefix安装，普通cmd wrapper经实际npm talos.cmd输出0.5.7，离线preview update输出假0.5.8和准确手动命令。安装后smoke/BYOK22通过/3原平台跳过，无真实模型请求。Node当前PATH已为24.15.0；此前失败来自准备脚本调用，不是生产故障；本轮未重装/全库 |
| 下一接手 / 就绪性 | 无就绪下一任务；本轮完成后待主人体验反馈与正式版本/平台结果 |

## 现在是什么状态

**原F1–F6已关闭，Windows源码适用总闸全绿，并已产生真实可安装的本地Talos候选；正式npm尚未发布。** 独立包身份接线、退役资源排除、只读新版提醒和Windows安装/重装/合成跨版本升级/卸载已落地。剩下正式包名/版本确认、类Unix原生证据及可见提醒的主人目视，不能冒称全平台发布批准。

| 工作线 | 当前事实 |
| --- | --- |
| CLI/TUI | provider平级、talos命令、.talos目录、Talos主题/字标/三六边形已落地；专属登录与部分厂商通道退役。可见验收仅适用于主人实际通过的切片 |
| 核心使用 | 源码构建已通过本地假provider的配置/回复/read工具/历史继续；真实SDK+Runtime的审批文件结果、取消、正常与强制退出后的load验证已记录 |
| 工程保护 | CLI当前3055bc5；WIP30d23b8、38d53f3、6cac9c0、95ee1d1及后续修复提交保留。保存不受测试结果阻挡；不重写历史、不push |
| npm | 正式npm未发行；显式自有包身份、候选stage资源、Windows安装升级卸载、只读提醒已验证，演练身份不是正式名字 |
| GUI/桌面 | GUI暂停：已有demo正本，产品回复不可见/样张残留与刷新恢复问题未解决。Tauri 2路线保留，不影响当前CLI修复顺序 |

## 已知失败清单

下列计数来自2026-10-01首次大回归的失败症状，不是本轮复跑计数。其capability当时4935通过/46失败/61跳过；local-bash-output的5失败后已由7/7回归关闭。剩余条目不能据此断言全是测试过时，也不能猜测当前全套通过数。

| ID | 已有证据 / 具体范围 | 当前处置与停止条件 |
| --- | --- | --- |
| F1 主题14项 | custom-themes 2、palettes 1、runtime 6、theme-picker 5；期待旧默认/兼容/取消行为 | **已关闭**。六文件组118/118；Talos默认/预览恢复/冲突与旧保存设置映射验证，旧调色板原断言保留，生产视觉未改 |
| F2 语言14项 | tui-session-history-flow 1、tui-session-mutation-panels 13；中文输出与英文预期冲突 | **已关闭**。对应两文件固定en-US默认夹具，中文显式locale用例保留，历史动作/回退/布局断言未删除；与F1同组通过 |
| F3 文案10项 | acp-agent 5、headless-runner 2、tui-terminal-presentation 1、chrome-flow 1、feature-flow 1 | **已关闭**。五文件211/211通过，类型/target lint通过；显示品牌/提示更正，协议身份、认证拒绝、能力、状态序列保持。未恢复旧登录 |
| F4 平台3项 | observability 2路径分隔符；wsl-attachment-paths 1转换失败 | **已关闭**。CLI5287f4c，26通过/11原有平台跳过，target lint通过；真实宿主路径夹具修正，生产实现未改 |
| F5 Windows source-contract 4项 | 卷探测1；旧managed updater安装3 | **已关闭**。CLI d3f7e6c：实际Windows 4/4、release-tools65通过/2平台跳过，source通过；fsutil失败回退只读CIM且fixed/NTFS仍严格，旧安装器改真实禁入/零安装覆盖。P2包安装未因此完成 |
| F6 lint 2项待复验 | plugin/application变量遮蔽和tui-app对象构造已局部修补 | **已关闭**。本轮lint:tui全量通过，已有两项补丁无需新修改 |

有效失败必须有根因、处置和复验证据才能关闭。不得静默删掉、skip、降低阈值或用“上游本来如此”搪塞；退役/平台不适用须有具体依据和仍适用的覆盖。新失败或可证实的回归风险可追加，只有“未验”不得追加。具体任务准入见workflow。

## 发布欠账

| ID | 明确依据与待交付 |
| --- | --- |
| P1 包身份与内容 | 工程完成：显式name，缺失/上游身份拒绝、默认private，正式prepare须明确--publishable；独立repo/talos-only入口，stage排除退役cloud入口/embedded资源。实际候选896文件、约12.65MB、134许可文件，无node_modules/.talos/Git数据。正式name/version待主人确认 |
| P2 安装与支持平台 | Windows763566c候选真实npm安装/talos.cmd/SQLite/ripgrep/22核心通过、同版重装、0.5.7→合成0.5.8替换/配置保持/升级后BYOK/卸载PASS。两个包代码相同，用于安装机制演练，不是两个已发布版。类Unix原生policy/安装仍待本人另一机；不装WSL、不擅自减少支持平台 |
| P3 只读新版提醒 | 已实现并纳入最终full：实际manifest读取、private源码不查、发行TUI异步一次、/update及CLI查询、请求去重、稳定版本比较、离线/错误/超时明确未确认。安装包CLI用假registry验证正确name/手动命令，无安装调用。实际npm元数据与TUI目视提醒仍待正式身份/主人 |
| P4 候选验收 | 763566c生产基点15Windows适用full闸PASS（5003能力通过/61已有跳过）；后续3055bc5仅增加Windows package profile，工具回归66/2跳过、source4279通过。未宣称Linux/macOS、远程发布或目视通过；不能将工具改动借用为另一次full结果 |

正式npm包名/scope、独立版本策略在P1集中确认；现在不要求主人提供账号或重填模型。GUI/Tauri和已同意后置的搜索不插进CLI首发任务。

## 最新证据与可用材料

- **d3f7e6c**：F5真实卷检查及退役安装器替代覆盖通过，F6全量lint通过；此提交完整15Windows闸首次全绿。原F1–F6计数为历史症状，现不再猜测剩余失败。
- **763566c**：包含安装版本识别修复和只读更新生产接线；最终full15闸PASS，capability5003通过/61跳过，Windows source-contract4/4、policy147通过/15POSIX跳过、status11/11、smoke20通过/1macOS跳过、BYOK2集成/2POSIX跳过。生产使用的是真实Runtime，本地fake provider，不花付费token。
- **3055bc5**：仅将已支持的真实Windows安装闸登记进现有package profile；--list输出test:release-package、release-tools66通过/2跳过、source4279通过，不新增生产功能。
- 实际候选763566c的安装回执为PASS，SHA256 a744d8a89cd28e9d757af484fd37acd731ae3186d670902821a002065ca5c164；合成升级包SHA256 6b2fe57e6f2fc1abd7fee8c0e2ab7c9d1207c8477f3b052ec5e636110615f6f9。运行安装后原有smoke/BYOK22通过/3跳过，升级后BYOK再次通过，同版重装和卸载真实完成。
- 材料保存在忽略目录 C:/DEV/develop/T3rra-C0d3-Talos/.talos/release-candidates/763566c：两个测试包及校验、同版源码及SHA256、source-verification/verification.json、install-report/package-install.json、package-audit.json和禁止直接发布说明。原始日志仍在TEMP，不入Git。
- 源码快照763566c SHA256 3551186e86c937716bae430f6f57087b69761d8068e8b533ac9cd7806ad3eefe，导出不含Git历史、依赖和用户数据，供另一主机原生检查。它不包含随后仅工具平台登记的3055bc5差异，平台候选最终确认时需同步准确源码，不混用提交。
- 新版检测初轮15假fetch分支、TUI/CLI两文件351通过；新增4身份负例随后纳入完整capability通过。生产没有下载/执行安装器，旧安装链构建禁入保留。TUI外观未改，新增提醒未声称主人目视已验。
- 更早配置/审批/取消/正常与异常load回归保留，详见adapter；不再重复专项。Windows跳过的POSIX信号与macOS权限仍不是通过，用户另一类Unix平台未测。

## 当前待主人事项

1. npm包名已确认@pakiknowledge/tal0s-code；首个Talos独立版本/标签仍待确认。当前具名验收包暂为0.5.7，原@talos-local-fixture/cli及合成0.5.8均不发布。
2. 另一台类Unix主机的OS/架构、受支持Node/pnpm与原生运行结果；现有源码快照准备好，没有擅自连接主机。
3. 对当前CLI与受控假新版提示做目视确认；技术安装/JSON不交给主人兜底。GUI仍暂停，不让GUI旧失败混进CLI验收。

## 纠偏决定与永久边界

取消无触发的工具生命周期专项仍有效；已有适用回归随实际改动/候选运行。不得从“未验”产生新任务。Git保存与质量验收分开、固定UTF-8/LF；新真实失败沿证据修，不退化为无限证明上游。无人值守授权仅允许现有修复/发行准备连续推进，未授权push/npm发布、付费模型或真实账号操作。

主人已有决定不变：第三方provider平级、命令talos、不保留mcode兼容别名、独立.talos、不内联安装只提醒npm手动升级、周期审查上游PR、不重做已验收欢迎/主题、不修已撤回思考块；搜索后置、GUI之后Tauri2，不用Electron。

## 阅读入口

只读本页→[plan待确认事项](plan.md#待主人确认及平台验收)→必要源码证据。操作命令在[README](../README.md)，已有探针不是任务清单。旧地图保留在archive供追溯，不作下一入口。

## 本轮用户验收入口

独立安装目录 C:/DEV/develop/T3rra-C0d3-Talos/.talos/acceptance/pakiknowledge-3055bc5，安装回执acceptance-install.json，候选archive及校验在同目录；生成模板在tools/cli-acceptance-templates入库，数据/依赖/原始日志不入库。普通和预览操作命令、步骤只在README，见“当前具名CLI验收”。

正常体验入口使用现有home/.talos配置（不是复制密钥）：用户保存provider/设置会影响该既有配置；测试cwd为可丢弃workspace。离线预览使用独立preview-data/preview-home，不需要key，不用于真实对话；假0.5.8未发布，禁止执行示例升级命令。普通模式不自动发模型prompt，用户主动使用才可能消费API额度。

本轮曾在TEMP脚本两次错误调用cmd导致失败；Astra直接核对npm shim可用，原PATHNode22遗留后已由主人修为24.15.0。只修准备入口，不修改npm生成shim或绕过它充当成功；普通wrapper经call实际shim已验证。源码/安装前证据仍按准确基点保留，目视验收未做。
