# Codex 对标 × Talos ACP × 第一期预期

更新：2026-10-09 **r2**（Grok 4.6 子代理重跑）。拍板用，**不是**实现待办。

证据：

- Codex：【文档】OpenAI 公开页（本轮联网子代理核对）
- 引擎：【源码】`C:\DEV\develop\Talos-CLI\packages\tui\src\acp\agent.ts`（本轮 explore 子代理核对）
- 桌面：【源码】本仓 `src/`、`app/`（本轮 explore 子代理核对）

【未验】本机 `session/list` 分页与标题字段的实测。

## 架构差一句

Codex 桌面背后是 **自家线程后台**（CLI / IDE / App 容易同一条活）。Talos Desktop 是 **本机 `talos acp` 子进程**，一进程 **只许一个客户端**。可以对标 **工作室长什么样**，不能对标 **云同步那套后端**。

---

## Codex 是这样（用户可见，26 条浓缩）

来源：Introducing the Codex app、developers.openai.com/codex/app/*、help.openai.com。

| 组 | 用户得到 |
| --- | --- |
| 项目 | 开本机文件夹当项目；一窗多项目；可钉、可搜；也可不绑仓库开 Chat |
| 活 / 历史 | 每项目多条线程；钉/改名/归档；过滤与时间线；手机 Remote 遥控本机会话 |
| 并行 | 多条同时跑；同仓用 worktree 隔离；可 spawn 子 agent；会话可弹出独立窗 |
| Worktree | 新会话选隔离副本；Hand off 回本机；在 worktree 建分支/开 PR |
| Git 审查 | 审查面板看 diff；行评；stage/revert；commit/push/PR；`/review`；GitHub PR 插件 |
| 终端 | 每线程内嵌终端，agent 可读输出 |
| 云 / 定时 | Cloud 隔离环境电脑可休眠；Scheduled 心跳或新开一条 |
| CLI 交接 | 接过 CLI/IDE 历史与 `config.toml`；`codex resume` / fork |
| 技能 / MCP | 侧栏 Skills；设置里 MCP；与 CLI 共用 |
| 投料 | 拖文件/图；`@` 路径；语音 |

---

## 我们引擎能做到这样【源码】

`agent.ts` 关键行：`initialize` ~433；`session/list` ~625；`load` ~763（**回放历史**）；`resume` ~837（**不回放**）；`new` ~494；`fork` ~641；`close` ~900；`prompt` ~1068（**每会话同时一条**）；单连接 ~357；`promptCapabilities` image/audio/embed **全 false** ~447；`additionalDirectories` **一律拒绝** ~1695；`toAcpSessionInfo` 给 list：`sessionId`、`cwd`、可选 `title`/`updatedAt` ~1738；`setConfigOption` 支持权限模式 / 模型 / **thinking effort** ~956。

| 用户动作 | 引擎 |
| --- | --- |
| 列这个文件夹里的旧活 | **有** `session/list`（cwd 须绝对；含子归档；内部子 agent 不展示） |
| 点开旧活、看见聊天记录 | **有** `session/load` 回放 |
| 刷新后同 ID 重连、不重刷记录 | **有** `session/resume`（桌面未用） |
| 新建一条 | **有** `session/new` |
| 从某条分叉 | **有** `session/fork`（桌面未做 UI） |
| 发话 / 停止 | **有** prompt / cancel |
| 换模式、换模型、改思考档 | **有** setMode / setConfigOption |
| 斜杠命令 | **有** `available_commands_update`；发送仍是文本 `/name` |
| 工具 + 问你同不同意 | **有** |
| 两路同时生成 | **无**（单 prompt + 单连接） |
| 拖图 / 语音 prompt | **无** |
| 一个会话挂两个文件夹 | **无** |
| Worktree / 云 / 定时 | **无**（不是 ACP 一等公民） |

---

## 我们桌面今天实际给用户什么【源码】

| | 今天 |
| --- | --- |
| 换文件夹 | **有**（手输绝对路径，重启子进程） |
| 自动接着 **一条** | **有**（`.talos/gui-session.json` 隐式 load/new） |
| 侧栏活列表 / 点选 / 新建按钮 | **没有**（徽章 static，count 只有 00/01） |
| 发话、停、模式、模型、`/` 补全 | **有** |
| 工具路径 + 批准卡片 | **有**（不是 diff 台；批准无「记住」） |
| 计划栏、真用量条 | **假占位**（未订 plan/usage 通知；条宽写死 42%） |
| 读文件/内嵌终端给引擎 | **没有**（`clientCapabilities: {}`） |

---

## 对照：Codex 这样 → 我们第一期这样

| Codex | 第一期 Talos Desktop | 依据 | 做不到时对用户说 |
| --- | --- | --- | --- |
| 多项目抽屉 | **一个路径**，可换 | 已有 switch | 不是多项目工作台 |
| 项目下线程列表 | **做**：`session/list` + 侧栏 | 引擎有，UI 无 | 失败就报错，不装有历史 |
| 点开继续（带记录） | **做**：`session/load` | 引擎回放 | load 失败留在当前条 |
| 新建 | **做**：`session/new` | 引擎有 | — |
| 钉/归档/改名 | **不做** | list 无这些字段为产品主路径 | 列表只显示标题/时间 |
| 多条同时跑 | **不做** | 单 prompt | 「一次只能生成一条；先停再切」 |
| Worktree / Cloud | **不做** | 无协议 | 隔离请用 TUI/CLI |
| Diff 行评 / 应用内 Git | **不做** | 宿主未做 Git UI | 右栏仍是涉及文件 |
| 内嵌终端 | **不做** | 未声明 terminal | 用系统终端 |
| 定时 / 云后台 | **不做** | Codex 后端 | 无入口 |
| CLI 与桌面无缝同线程 | **弱**：同一 sessionId 可 load，无 `/app` | 无 app-server | 「不是同一套云线程」 |
| 拖图 / `@` | **不做** | capabilities false | 纯文本 + `/` |
| Fork 树 | **不做**（引擎有 RPC） | 第一期不铺 UI | 以后再说 |
| 图形 MCP / Provider | **不做** | 走 TUI | 去终端 `/provider` |
| 思考档 thinking effort | **不做 UI**（引擎有 option） | 控制面半截 | 不假装没有；也不塞进第一期 |

---

## 第一期就这些（7 条，给 Astra 收）

用户做完应能说：**「这个文件夹里我以前聊过哪些，能点开接着聊，也能新开。」**

1. 连上后左侧列出 **当前路径** 下的活（标题或时间）；没有则空态 + 新建。
2. 点一条 → 中间是 **那条记录**（load 回放），能再发话。
3. 能 **新建**；列表多一行。
4. 能看出 **当前选中哪一条**，和顶栏一致。
5. 一条在跑 → **不能**再同时生成；须停或等完再切，并写清原因。
6. **换路径** → 列表换成那个路径的活。
7. list / load / new 失败 → **看得见错**，不静默。

**第一期禁止扩**：并行、worktree/云、diff 台、终端、MCP 页、附件、fork、Tauri、归档钉住、计划栏造真、thinking 下拉。

引擎已有、第一期故意不做：`fork`、`resume`（无回放）、`setConfigOption` 的 thinking/permission、客户端 fs/terminal。Astra 若加项，须单开一句「为什么第一期就要」。
