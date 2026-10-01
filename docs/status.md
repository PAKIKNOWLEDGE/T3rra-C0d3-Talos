# 当前状态

更新：2026-10-01。唯一执行入口是本页交接卡；不以归档、旧聊天或README命令目录生成任务。

## 当前交接卡

| 字段 | 当前值 |
| --- | --- |
| 任务标识 / 修订 | upstream-discussion-workflow / r1 |
| 阶段 | 已完成（基本工作流约定，尚未实践合入） |
| 本轮角色 / 来源 | Astra；主人澄清只建立看PR、共同讨论、确认后合入的工作流 |
| 触发依据 | 需要可控的选择性上游同步，不能把流程设计误作自动挑选PR实施 |
| 目标 / 方案入口 | 简单讨论先行规则；[工作流](workflow.md#选择性接收上游-pr) |
| 允许范围 | GUI仓库workflow/plan/status；上游差异仅只读 |
| 禁止范围 | 不预选/排序实施PR、不改CLI代码、不合上游、不push、不发布、不新增复杂流水线 |
| 验收 / 停止点 | 基本三步规则写入现有workflow；具体技术步骤待实践再细化 |
| 完成证据 | 已写明看PR→和主人讨论→主人确认后合入；Luna日常处理、架构冲突才升级；保留5个上游提交不构成授权待办。本轮只读看过局部差异，不代表完成PR审查 |
| 下一接手 / 就绪性 | 无就绪合入任务；主人要求看PR后再提供讨论材料，不自动启动候选实施 |

## 现在是什么状态

**原F1–F6已关闭，Windows源码适用总闸全绿，并已产生真实可安装的本地Talos候选；@pakiknowledge/tal0s-code@0.1.0已执行公开发布，主人收到确认邮件。** 独立包身份接线、退役资源排除、只读新版提醒和Windows安装/重装/合成跨版本升级/卸载已落地。包名及普通启动/新版提示体验已确认；独立版本0.1.0与最终Windows发行检查已完成；主人改为发布后在NixOS安装测试；尚未声明该平台通过。

| 工作线 | 当前事实 |
| --- | --- |
| CLI/TUI | provider平级、talos命令、.talos目录、Talos主题/字标/三六边形已落地；专属登录与部分厂商通道退役。可见验收仅适用于主人实际通过的切片 |
| 核心使用 | 源码构建已通过本地假provider的配置/回复/read工具/历史继续；真实SDK+Runtime的审批文件结果、取消、正常与强制退出后的load验证已记录 |
| 工程保护 | CLI当前63bd98e，源码和安装候选均对应此提交；WIP30d23b8、38d53f3、6cac9c0、95ee1d1及后续修复提交保留。保存不受测试结果阻挡；不重写历史、不push |
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

| ID | 当前事实与剩余事项 |
| --- | --- |
| P1 包身份与内容 | 已完成：@pakiknowledge/tal0s-code 0.1.0、命令仅talos；开发workspace仍private，发行manifest为显式身份；许可保留、退役工具资源排除，源码/包/安装版本同提交。未创建Git发行标签 |
| P2 安装与支持平台 | 本轮Windows实际npm安装、native SQLite/ripgrep、22安装后核心通过/3平台跳过、同版重装/卸载PASS。此前763566c的合成跨版本替换/配置保持证据保留，本轮未重复。主人决定NixOS改为发布后测试，尚未确认通过；不装WSL |
| P3 只读新版提醒 | 源码适用回归通过；0.1.0安装包使用既有假registry检查准确@pakiknowledge/tal0s-code@latest手动命令，无内联安装。可见提示主人已验收。真实npm元数据只能发布后验证，不因此新增发行前请求 |
| P4 候选验收 | 63bd98e最终Windows full15闸与package闸PASS；此前普通TUI入口/假新版主人验收保留。本轮只改版本和候选入口显示，不重复视觉验收。不声明Unix通过；主人已另行授权执行npm发布 |

## 最新证据与可用材料

- 候选根目录：C:/DEV/develop/T3rra-C0d3-Talos/.talos/release-candidates/0.1.0-63bd98e；精确源码提交63bd98ee0d7500f9c172718fb65c125e54e35014。保存源码包、具名npm包、各自SHA256、source-verification、install-verification、package-audit.json、release-candidate.json及发行范围说明；原始日志默认忽略。
- full：15适用闸PASS，release-tools67通过/2跳过、capability5003通过/61跳过、Windows4/4、policy147通过/15POSIX跳过、status11/11、smoke20通过/1macOS跳过、BYOK2通过/2POSIX跳过。耗时625.3秒；原生Unix policy/sandbox不适用Windows，不当作通过。
- package：现有闸PASS，实际npm安装后的SQLite/ripgrep、smoke/BYOK22通过/3平台跳过、同版重装及卸载完成。此次未提供合成升级包，报告crossVersionUpgrade=false；旧跨版本证据不冒充本轮结果。
- 包SHA256 cfe95d726dd268e3217261933f0c655887a977de2f51851e47fd17768363e6f2；源码SHA256 44b21c417aaea16d81a5292a4169f7bc6377ed66d388780452967096d7a9920d。源码仅提交文件、不含Git历史/依赖/私人会话。
- 普通入口01-launch-talos.ps1已从实际npm安装包输出@pakiknowledge/tal0s-code 0.1.0及0.1.0；保留调用cwd和既有.talos配置。入口版本展示读取manifest，避免再次硬编码旧版本。启动和检查命令只在README。
- 本轮修改前两仓库干净：CLI0a7e13f/GUI3a854a5；版本保存63bd98e，GUI准备WIP8b03df3。不push、不发布、不操作真实模型配置。full与package分别核对用户注册表Path前后完全一致。

## 当前待主人事项

1. 本轮1、2项已完成且0.1.0候选主人已验收通过，技术检查由Luna验收，不要求主人读JSON或购买请求。正式包名和0.1.0已确认。
2. 第三项类Unix主机：OS/架构及后续执行安排尚未提供；准确同版源码已准备。本轮没有连接该主机或声明它通过。
3. 主人已授权并执行公开npm发布，latest为发布目标；Git发行标签未创建、未push。

## 纠偏决定与永久边界

取消无触发的工具生命周期专项仍有效；已有适用回归随实际改动/候选运行。不得从“未验”产生新任务。Git保存与质量验收分开、固定UTF-8/LF；新真实失败沿证据修，不退化为无限证明上游。无人值守授权仅允许现有修复/发行准备连续推进，未授权push/npm发布、付费模型或真实账号操作。

主人已有决定不变：第三方provider平级、命令talos、不保留mcode兼容别名、独立.talos、不内联安装只提醒npm手动升级、周期审查上游PR、不重做已验收欢迎/主题、不修已撤回思考块；搜索后置、GUI之后Tauri2，不用Electron。

## 阅读入口

本页→[待确认的平台事项](plan.md#待主人确认及平台验收)；本轮方案见[首发候选收口](plan.md#首发候选收口)，精确行为证据按需看adapter。操作命令只在README。无新授权不重跑已通过检查、不恢复暂停GUI。

## 本轮用户验收入口

0.1.0独立安装已保留在候选根目录prefix，普通入口为01-launch-talos.ps1。已验收外观/provider/主题无修改，主人已确认0.1.0候选通过，不要求重复视觉或付费验收；操作步骤仅在README。

环境恢复备份继续保存在.talos/environment-recovery，旧_conn_test.txt未动。默认启动不再写宿主PATH，工作流宿主环境防损规则继续适用。npm发布已执行；类Unix与发布后安装未验证，元数据读回暂404，主人收到邮件后要求停止查询。

## npm发布结果

2026-10-01：@pakiknowledge/tal0s-code@0.1.0，public，latest，官方registry。发布同一63bd98e候选，npm PUT200、退出0；主人确认收到邮件并要求停止查询。回执为候选目录npm-publish-result.json。首次元数据读回暂404，未验证读回内容完整性，不重复发布。下一入口只接NixOS安装反馈，操作命令只在README；未推送Git。

## 真实全局安装修复结果

安装到C:/Users/pachu77/AppData/Roaming/npm/node_modules/@pakiknowledge/tal0s-code，命令由正常全局npm shim提供，无需再使用项目验收入口。首次日志中SQLite安装脚本实际运行，问题不是ignore-scripts；刷新当前安装进程有效PATH后同一已发布版本成功，没有修改注册表或重新发布。现有离线smoke对真正全局cli执行，20通过/1macOS跳过，原生SQLite/ripgrep实际加载通过；用户数据未读/改，不发付费模型。当前已打开的其他终端仍可能持有旧环境，应完全退出宿主后重开；操作命令只在README。证据日志global-install-smoke.log保存在忽略候选目录。

## Git主线现状

CLI只保留本地main及远端origin/main，GitHub首页已核对为Talos README。此前41个提交完整保留在main历史；不是squash或强推。旧远端主线改名后由backup/upstream-main-20261001标签永久定位，临时archive/bootstrap-main已删除。0.1.0发布标签对应原始源码提交63bd98e，没有移动到新文档提交。

origin恢复普通全分支fetch映射，防止新工作分支不显示；upstream仅作为官方公开仓库的读取来源，禁止推送，没有执行fetch/merge/cherry-pick上游。本轮明确排除PR #381/#380/#379/#378/#376，未将其标已合并；保留于备份标签供后续单独评审。独立产品main采用已验收Talos树，未接收上游树差异。

仓库现名PAKIKNOWLEDGE/Talos-Code-CLI，origin已更新，本地目录仍C:/DEV/develop/Talos-CLI。GitHub旧下载站homepage已清空。真实MIT/第三方版权文本未改；许可状态说明仅更名LEGAL.md并保留打包。当前main为c7adea2；未重新发布npm。
