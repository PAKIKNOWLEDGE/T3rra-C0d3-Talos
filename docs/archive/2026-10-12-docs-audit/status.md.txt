# 当前状态 — Talos Desktop

更新：2026-10-12。验收、授权与发布事实唯一记录；任务见 [plan](plan.md)，分工见 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-release-closeout / 0.1.2 |
| 阶段 | 用户验收/文档收口通过；v0.1.2已公开发布并设为latest，非草稿、非预发布 |
| 本轮角色 / 来源 | 用户明确授权文档/push/release，并再次要求立即公开已验收0.1.2 |
| 目标 / 方案入口 | [发布收口](plan.md#当前任务发布收口) |
| 允许范围 | 文档/用户截图/发布说明、push、Release、有限临时构建交付物清理 |
| 禁止范围 | 改产品/CLI、自动修三个issue、自动界面操作、cargo clean、结束用户进程 |
| 验收 / 停止点 | 文档与公开Release状态一致；保留已知问题与资产资料待补项 |
| 完成证据 | 产品22c0b4e；0.1.2用户明确通过；文档收口e03a353已推送；Release410530819已公开，latest=v0.1.2，资产大小/服务端SHA-256一致 |
| 下一接手 / 就绪性 | 无自动下一任务；字体来源待补，UI-001–003待用户选轮 |

## 已验收产品

- **产品候选 `22c0b4e` / Windows x64 / 0.1.2**。后续`992e003`仅文档记录；本轮不改产品。
- 【用户验收】2026-10-12用户明确“验收通过”，提供开屏与真实会话截图；会话卡片四个入口已可见，完成一次真实操作。截图加入README，不能据此扩称所有高阶功能已验。
- 【实测】0.1.2 release/NSIS构建、安装退出0；安装CSS含卡片完整高度规则，JS保留分叉/重命名/归档/删除入口。安装Node/静态资源/认证WS/关闭与端口释放检查通过，无模型请求。
- 【历史实测】0.1.1通过32文件162项、生产服务类型检查、实际窗口WS连接、真实安装CLI初始化/载入会话及自有进程退出。0.1.2只改CSS，不冒称再次执行这些检查。
- CLI实际已用安装入口：`C:/Users/pachu77/AppData/Roaming/npm/talos.cmd`，包`@pakiknowledge/tal0s-code`0.1.4；本仓未升级引擎。
- Tauri2本地前端+随包Node v24.15.0 x64+现有Studio服务；CLI独立前置。首次目录入口与卡片裁切直接回归已修；旧候选/完整证据在[收口前快照](archive/2026-10-12-release/README.md)。

## 发布资产与限制

| 字段 | 当前事实 |
| --- | --- |
| 仓库 | PAKIKNOWLEDGE/T3rra-C0d3-Talos；main |
| 产品版本 | 0.1.2；未签名Windows x64安装候选 |
| NSIS资产名 | TALOS_0.1.2_x64-setup.exe |
| 大小 | 27,668,605 bytes |
| SHA-256 | 77BB4813835B1C46CA16A65F8B14E00306880B2BEC8209CBE3920D93DFEC1FF3 |
| push | e03a353已推送且remote HEAD核对一致；本文档补记随后另存推送 |
| Release | v0.1.2已公开，ID410530819，target e03a353；draft=false、prerelease=false、latest=true；NSIS/校验清单/字体许可均uploaded |
| 资产资料待补 | 现有HarmonyOS Sans SC WOFF2来源/未修改条件尚未证明；官方许可已取到，见[资产记录](licenses/README.md) |
| MSI | 本轮未构建未安装；手动构建/复制命令见README |

用户明确要求立即公开已验收0.1.2；本轮完成公开发布。此前代理自行将WOFF2来源记录缺项设为阻塞并停在草稿，已纠正；来源资料仍如实记为待补，不能将缺少记录写成已证明禁止使用。产品字体/代码与已验收安装包没有改变。

## 文档收口

现行README改为产品介绍、真实截图、安装/开发/检查/MSI构建入口；plan撤掉已完成V/R3的执行队列；status收起重复候选事故。修正tauri-shell的“尚未运行”、glossary的未来宿主说法、提案的未集成状态；workflow明确手动画面验收。旧协议证据保留原日期，不伪造新核验。

新增[待修问题](issues.md)唯一记录三个反馈；README只提示并链接。清理重复ignore规则。check-handoff不再要求未跟踪的六张本地参考PNG，否则干净clone会与资产边界矛盾；demo基线/必需字体/交接链接检查仍保留。

## 清理范围

构建缓存保留；不执行cargo clean。上传核对后清理自有NSIS/发布可执行输出、app/dist、dist-desktop及未使用旧安装验证目录。当前用户仍运行`.sandbox/talos-install-check-0.1.2/talos-desktop.exe`，不能删除正在使用的目录，也不结束用户程序；关闭后可另行清理。node_modules、Cargo build/deps/incremental缓存、用户.talos、会话/凭据、视觉预览与本地参考保留。

## 本轮检查与交付记录

- 【实测】check-handoff通过：31份Markdown、205本地链接、15必需文件与demo基线；git diff --check通过。静态检查不证明外部链接、字体再分发或渲染。
- 【实测】main从origin/main的0e00fb7推进到e03a353（含此前已验收的本地提交与本轮文档），推送成功并核对远端SHA。没有修改产品、调用模型或启动自动界面操作。
- 【实测】Release草稿v0.1.2/ID410530819，isDraft=true、target为e03a353完整SHA；NSIS与校验清单state=uploaded。GitHub资产digest等于记录的77BB...1FF3，大小27,668,605一致。
- 【未验】额外gh download回读未在有限等待内完成，已中断自有下载；不能声称下载后校验通过，上传资产核对依据为服务端digest。
- 【实测】MSI参数从已安装Tauri CLI help确认--bundles msi；本轮未打MSI，构建缓存与用户运行窗口均保留。该句仅属此前草稿阶段；公开发布结果见下方补记。
- 【受阻】清理删除被环境策略拒绝，包含明确路径重试；本轮没有删构建产物、没有cargo clean。当前运行的0.1.2目录本来也应保留。


## 公开发布补记

- 【授权】2026-10-12用户再次明确“马上补发布”；不重新打包、不替换已验收产品。
- 【实测】公开时间2026-10-12 19:34:41（Asia/Shanghai）；v0.1.2/Release410530819，draft=false、prerelease=false；GitHub releases/latest返回同一v0.1.2。
- 【实测】NSIS仍为27,668,605 bytes，服务端SHA-256仍77BB4813835B1C46CA16A65F8B14E00306880B2BEC8209CBE3920D93DFEC1FF3；校验清单与官方字体许可附件均uploaded。
- 发布入口：https://github.com/PAKIKNOWLEDGE/T3rra-C0d3-Talos/releases/tag/v0.1.2 。README直接指向本版下载；三个待修问题保留，未声称已修。
- 本轮只同步README/plan/资产记录/status与Release说明；没有模型或自动界面调用。清理限制与MSI未验边界不变。
