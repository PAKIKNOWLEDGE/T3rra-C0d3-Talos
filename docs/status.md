# 当前状态 — Talos Desktop

更新：2026-10-12。验收、授权与发布事实唯一记录；任务见 [plan](plan.md)，分工见 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-release-closeout / 0.1.2 |
| 阶段 | 用户验收通过；发布收口中，公共安装包受字体来源缺项阻塞 |
| 本轮角色 / 来源 | 用户明确授权Codex审docs、写README、放入两张图、push/release与有限清理 |
| 目标 / 方案入口 | [发布收口](plan.md#当前任务发布收口) |
| 允许范围 | 文档/用户截图/发布说明、push、Release、有限临时构建交付物清理 |
| 禁止范围 | 改产品/CLI、自动修三个issue、自动界面操作、cargo clean、结束用户进程 |
| 验收 / 停止点 | 文档与Release状态一致；字体缺项不掩盖，停在可核对交付状态 |
| 完成证据 | 产品22c0b4e；0.1.2用户明确通过；本轮文档/发布记录待保存 |
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
| push | 本轮待执行并核对remote HEAD |
| Release | 本轮准备草稿；公共安装包未发布，不能宣称已公开可下载 |
| 发布阻塞 | 现有HarmonyOS Sans SC WOFF2来源/未修改条件尚未证明；官方许可已取到，见[资产记录](licenses/README.md) |
| MSI | 本轮未构建未安装；手动构建/复制命令见README |

Release草稿用于保留候选与资产校验；待字体来源/再分发条件核实后才能公开安装包。用户公开发布授权已记录，不重复索取同一授权，但授权不能替代第三方字体来源证据。

## 文档收口

现行README改为产品介绍、真实截图、安装/开发/检查/MSI构建入口；plan撤掉已完成V/R3的执行队列；status收起重复候选事故。修正tauri-shell的“尚未运行”、glossary的未来宿主说法、提案的未集成状态；workflow明确手动画面验收。旧协议证据保留原日期，不伪造新核验。

新增[待修问题](issues.md)唯一记录三个反馈；README只提示并链接。清理重复ignore规则。check-handoff不再要求未跟踪的六张本地参考PNG，否则干净clone会与资产边界矛盾；demo基线/必需字体/交接链接检查仍保留。

## 清理范围

构建缓存保留；不执行cargo clean。上传核对后清理自有NSIS/发布可执行输出、app/dist、dist-desktop及未使用旧安装验证目录。当前用户仍运行`.sandbox/talos-install-check-0.1.2/talos-desktop.exe`，不能删除正在使用的目录，也不结束用户程序；关闭后可另行清理。node_modules、Cargo build/deps/incremental缓存、用户.talos、会话/凭据、视觉预览与本地参考保留。

本轮离线检查与清理实际结果在完成后补记；没有自动界面或真实模型调用。
