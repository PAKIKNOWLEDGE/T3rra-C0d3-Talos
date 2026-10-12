# 当前状态 — Talos Desktop

更新：2026-10-12。候选与验收事实唯一记录；合同见 [plan](plan.md)，协作见 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-windows-package / r3 |
| 阶段 | **待用户重验（会话工具栏裁切修复 0.1.2）** |
| 本轮角色 / 来源 | 用户截图反馈删除/分叉等入口消失；Codex修R3布局直接回归，用户要求禁止自动界面操作 |
| 目标 / 方案入口 | [R3 Windows Tauri 安装候选](plan.md#下一小轮r3-windows-tauri-安装候选) |
| 允许范围 | 图标、Tauri/随包 Node/前端服务、系统目录、端点与退出、Windows产物 |
| 禁止范围 | CLI 写入升级、Electron、重做视觉/消息协议、自动公开发布、R4 |
| 验收 / 停止点 | 只修会话卡片裁切；交新包后停写，用户手动验四个入口与缩小窗口滚动 |
| 完成证据 | 22c0b4e；0.1.2 release/NSIS与安装exit0；安装CSS含完整行高规则、JS保留四个动作；本轮画面未验 |
| 下一接手 / 就绪性 | 用户验下方安装入口；Codex修直接回归，Cursor停写 |

## 接手、恢复与版本

- 规划 `50e1bbd`；视觉通过基线 `3a467e8`。用户要求停止时 Cursor 未提交，服务打包与 Rust 未通过。
- Codex 先保存完整暂停源码/文档为 **`97070eb` WIP**，没有丢弃 Cursor 工作。暂停记录可由该提交的 status 追溯。
- 旧候选 **`91aa1ff`** 因用户反馈首次启动一直未连接被退回；本轮可恢复基点为 `e2738c8`。首次启动修复候选 `86a9006` 的用户截图显示会话已待命，但工具栏不可见；本轮恢复基点 `78bbcce`。当前工具栏修复候选 **`22c0b4e`**，产物与其源码一致；之后只有本文档记录变化。冻结产品写入待用户验收。
- R3 交付 fail **0/2**（Cursor 未交付，用户主动要求接手不计失败）；本轮由 Codex 实现与自验，不冒称独立技术复核。
- 应用版本 **0.1.2 / Windows x64**；未签名本机安装候选，不是公开发行声明。

## 图标与实现

- [图标 PNG](../src-tauri/icons/icon.png)、[SVG 原稿](../src-tauri/icons/talos.svg)、[Windows ICO](../src-tauri/icons/icon.ico)：现有黄色与深色三六边形；没有复制游戏图片/标识。生成脚本 tools/gen-tauri-icon.py 使用 Pillow，仅图标重新生成时需要。
- Tauri 2 本地打包窗口；最小原生接口：选择目录、记忆目录、服务状态。网页无通用 shell 权限，后端回环随机端口/每次随机 WS 凭据。
- 随包 Node **v24.15.0 x64**，校验与官方 SHASUMS256 的 win-x64/node.exe 一致，锁文件 tools/runtime/node-win-x64.json；携带 Node/WS 许可文本。不要求用户运行 npm/tsx/Vite。
- 保留现有 TalosService/FactStore/Studio 链；不在产品包里放 CLI，引擎定位不得回退相邻源码仓。默认先开界面，无目录不启动 CLI；选择目录后复用 switch_workspace。
- 修复 Cursor 的 ws 动态 require、Rust 编译/API/状态共享、远程窗口权限路径；本地前端从应用资源加载，原生服务启动独立。安装目录 Windows verbatim 前缀规范化，避免 Node EISDIR。
- 正常退出发送服务关闭指令，Windows Job Object 仅拥有本应用服务树，兜底关闭子进程；CLI initialize 拒绝也释放自有进程。不按端口/进程名杀用户服务。
- 发布构建只带所需 demo/talos.css、text-scale.js 和两份字体；不带 demo模拟HTML/preview/游戏参考。保留既有开屏/文案/控件。
- 增加 typecheck:desktop 覆盖真实服务入口导入链；发现并修正 FactStore state 的 readonly 声明与原 restoreSnapshot 重新赋值矛盾，未改运行逻辑。原 typecheck 的入口限制继续如实保留。

## 构建产物与证据

| 字段 | 当前值 |
| --- | --- |
| 构建命令 | README：npm run build:desktop:win；Tauri beforeBuild执行生产服务类型检查/前端与服务构建 |
| NSIS | `C:/DEV/develop/T3rra-C0d3-Talos/src-tauri/target/release/bundle/nsis/TALOS_0.1.2_x64-setup.exe` |
| 大小 | **27,668,605 bytes（约26.39 MiB）** |
| NSIS SHA-256 | `77BB4813835B1C46CA16A65F8B14E00306880B2BEC8209CBE3920D93DFEC1FF3` |
| release exe | `src-tauri/target/release/talos-desktop.exe`；须与安装资源/Node共同部署，不单独拷贝exe冒充完整包 |
| 实际安装目录 | `C:/DEV/develop/T3rra-C0d3-Talos/.sandbox/talos-install-check-0.1.2`（NSIS有限本机安装验证） |
| 已装应用入口 | `C:/DEV/develop/T3rra-C0d3-Talos/.sandbox/talos-install-check-0.1.2/talos-desktop.exe` |
| 实际CLI | `C:/Users/pachu77/AppData/Roaming/npm/talos.cmd` / @pakiknowledge/tal0s-code **0.1.4**；使用其安装entry与随包Node启动Studio，未升级 |

以下完整运行/首次启动证据属于0.1.1候选 `86a9006`；0.1.2只修改CSS，新增包检查见下方工具栏修复记录。

- 【实测】check:all **退出0**：32文件/162项；cargo check、release/NSIS构建退出0；typecheck:desktop通过。
- 【实测】官方 Node 校验通过；图标已查看实际 PNG，ICO生成；Node/WS许可随最终安装产物存在。
- 【实测】NSIS安装 **退出0**；从最终安装目录启动，不在源码cwd运行：窗口标题 TALOS · 作业终端，自有node=1，loopback健康检查true；关闭后自有进程残留=0。未关闭用户既有开发/CLI服务。
- 【实测】`node tools/check-desktop-package.mjs --installed-dir .sandbox/talos-install-check-0.1.2`：真实安装Node/服务资源、字体/脚本可读，无认证WS拒绝、认证WS快照、服务关闭exit0与端口释放通过；生产不依赖源码checkout，验证脚本本身在仓库运行。
- 【实测】最终安装服务对 C:/DEV/develop/tmp/test 做一次真实 Studio initialize/会话载入：connection connected、session ready、historyLoading false、errors=0；**无turn/start或模型请求**。
- 【实测】安装服务注入仅对该子进程有效的缺失CLI路径：界面端点仍提供服务、快照error与恢复入口，无相邻源码回退，退出0。没有修改系统环境。
- 【限制】没有观察真窗口画面、没有交互验证原生目录选择/取消，未发付费模型；Rust目录接口编译通过不能代替用户真实选择。字体再分发许可仍按design记为公开发行前未核项；本候选不宣称发行全量通过。

## 本轮首次启动修复

- 【实测】用户本机没有已保存 workspace.json；从安装目录启动的 WebView 已与自有 Node 建立 WS，健康检查200。此次证据支持“尚未选择工作区被错误表示为未连接”，不能据此声称用户所有历史故障均已解释。
- 【源码】无目录启动保留真实 disconnected/无session快照；旧前端将它合并进通用“未连接/重新连接”。会话建立前的错误也被通用空态遮住，原生服务启动异常仅短暂提示。
- 修复只改变前端启动显示：启动中 → 等待工作区/主页面「选择工作区」 → 建立会话。主页面按钮复用既有原生选择与 switch_workspace；不伪造引擎连接，不改CLI/协议/已通过视觉。取消仍不派发动作。
- 无session的服务/引擎错误保留在主页面；原生服务失败给重新连接，CLI/目录失败给重新选择工作区。断开后恢复工作区提交按钮；旧会话已有错误展示保持原路径。
- 【实测】聚焦26项通过；check:all32文件162项、生产服务及新增启动helper类型检查通过。release/NSIS构建与新包安装退出0；实际文件版本0.1.1。
- 【实测】新安装Node/服务：首次无目录快照 → 无效相对目录 action_error → C:/DEV/develop/tmp/test 通过真实已安装Studio连接、ready且会话存在、historyLoading false、errors为空。脚本没有发prompt/turn模型请求；资源/认证WS/退出与端口关闭通过。
- 【实测】从TEMP启动新安装应用：窗口标题正常、自有Node=1、窗口与其服务Established=1、health200；关闭该验证窗口后host退出、自有Node残留0。未结束用户进程。
- 【未验】新空态实际画面、系统选择器选择/取消与退出再开自动恢复仍待用户操作；网络连接证据不冒称画面验收。本轮没有付费模型请求。

## 本轮会话工具栏裁切修复

- 【用户截图】0.1.1已进入待命；会话卡片下部文字被截断，分叉/重命名/归档/删除工具栏不见。
- 【源码】四个动作仍在 app/talos.js，product.css与构建CSS也包含其布局；没有删功能。侧栏列表的自动grid行可被flex可用高度压缩，而卡片overflow:hidden会裁掉下部工具栏。原生选择工作区按钮额外占用侧栏空间，使该缺陷暴露。
- 最小修复：app/product.css给现有.session-list指定grid-auto-rows:max-content；卡片按内容取高度，空间不足沿原overflow-y:auto滚动。没有调整颜色、字号、构图、引擎能力或会话动作语义。
- 【实测】check:demo通过；构建前端CSS含新规则，JS仍含四个动作入口。没有新增镜像单测，也未重复跑上轮全量162项；本轮仅CSS与版本/交付记录改变，生产服务类型检查由打包门执行。
- 【实测】0.1.2 release/NSIS、安装退出0；安装目录的CSS含修复，四个动作入口仍在JS；安装Node/资源/认证WS/退出关闭有限检查通过，无CLI模型请求。为保留旧候选且不干扰用户窗口，安装到独立.sandbox/talos-install-check-0.1.2目录。
- 【未验】用户明确禁止自动界面操作，本轮没有启动computer-use、浏览器或自动点击；最终画面、缩小窗口与手动操作由用户验收。静态包含性不当作渲染通过。

## 用户验收（本候选）

可以直接启动上述已装应用，或使用 NSIS 装到期望目录。**不用 npm run dev:product。** CLI需已安装并配置好provider。

1. 打开0.1.2 TALOS → 开屏结束后，首次无目录应显示「等待工作区」及主页面「选择工作区」；原有字体/布局保留。
2. 点击主页面「选择工作区」选测试目录 → 建立会话后进入待命；再从侧栏选择并取消，目录与记录不变。
3. 已连接时每张非执行会话卡片显示分叉/重命名/归档，以及CLI支持的删除；缩小窗口后列表可滚动，按钮和文字不被裁掉。点击分叉或删除可查看原确认流程，取消即可，不要求删除真实记录。
4. 退出再打开 → 正确恢复目录；若失败有清楚错误与重新选择入口。

只报步骤与现象即可，不需搬日志。通过后收口本机桌面候选，公开发布和高级能力仍由用户另行决定。

## 保留成果

V1开屏/空态、V2文案和V3侧栏控件已用户通过；相关合同/记录见 Git 50e1bbd 与基线3a467e8。R2-B的历史两次退回/接手不计作R3新失败，已有状态回归继续保留。
