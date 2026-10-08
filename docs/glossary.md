# Talos 词汇表

两仓文档共用同一套名字含义。用户说明与状态卡用本表消歧，不把不同层级的名字混写成一个「产品」。

| 术语 | 指什么 | 文档里怎么用 |
| --- | --- | --- |
| **Talos** | 对外产品品牌。终端 CLI 已发行；桌面 GUI 尚未发行。 | 面向用户的说明、安装与视觉叙事 |
| **Talos CLI** | 相邻引擎仓 `C:\DEV\develop\Talos-CLI`：TUI、`talos` 命令、headless、`talos acp`、provider、`~/.talos` | 命令、验证、发行、引擎待办见该仓 [status](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/blob/main/docs/status.md)（本地路径同上） |
| **Talos 桌面 / 本仓** | `T3rra-C0d3-Talos`：`demo/`、`app/`、未来 Tauri 外壳 | 视觉正本、GUI 状态卡、ACP 宿主侧契约证据 |
| **Perlica** | 模型可见的默认人格与显示名；不是供应商或型号声明 | 与「当前连接的模型」分开写 |
| **mavis** 等 | 内部 agent 键、技能门控、存储字段；调度用 | 标为「内部路由」，不得当文档作者或对用户的产品名 |
| **MiniMax Code** | 上游血缘、NOTICE/LICENSE 署名、部分 ACP/协议字段化石 | 不写「请安装 MiniMax Code」作为当前产品 |
| **Rhodes / T3rra** | 只读经验来源与历史仓库名 | 不进用户安装路径 |
| **Endfield** | 视觉参考族，不是产品名 | 仅 [design](design.md) |

## 读哪张状态卡

| 你在改什么 | 必读 |
| --- | --- |
| demo、`app/`、Tauri、GUI 视觉 | 本仓 [status](status.md) |
| CLI/TUI、提示词、发行、引擎验证 | Talos-CLI [docs/status.md](file:///C:/DEV/develop/Talos-CLI/docs/status.md) |

跨仓任务两张卡都要读；禁止用本仓 status 推断引擎是否已发版或已修提示词。
