# Talos GUI 与项目文档

本仓库维护GUI范本、ACP接驳与项目文档。可安装的终端产品在[独立CLI仓库](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI)，本地源码目录为C:/DEV/develop/Talos-CLI。两仓库相邻独立，不使用子模块，也不互相导入内部实现。

## 接手地图

先读[AGENTS.md](AGENTS.md)与[当前状态](docs/status.md)，再只读当前任务需要的[计划](docs/plan.md)、[工作流](docs/workflow.md)或[契约证据](docs/adapters/minimax-code.md)。状态、计划、命令各有一个入口，历史探针不是每轮待办。

| 文档 | 用途 |
| --- | --- |
| [status](docs/status.md) | 当前结果、限制和下一入口 |
| [plan](docs/plan.md) | 本轮范围与后续方向 |
| [workflow](docs/workflow.md) | 实施、验收、Git与文档规则 |
| [design](docs/design.md) | 已验收视觉正本与素材来源 |
| [lessons](docs/lessons.md) | 可迁移经验 |
| [adapter](docs/adapters/minimax-code.md) | 按版本标记的源码与实测证据 |

## CLI安装与使用

使用包要求支持的Node：>=22.19 <23或>=24.2 <27。

```sh
npm install -g @pakiknowledge/tal0s-code@latest --registry=https://registry.npmjs.org/ --ignore-scripts=false --include=optional
talos --version
cd /path/to/your/project
talos
```

输入/provider配置或选择模型，模型调用由选定供应商计费。默认配置与会话存放在~/.talos。Talos只提示更新，升级仍使用上述npm命令。本地从CLI源码运行时使用pnpm build和pnpm start；这不是GUI启动命令。

Windows检查及NixOS实际使用记录见status。NixOS两项自动检查限制保留，不需要为了使用重跑全库或购买模型请求。GUI、Tauri与默认联网搜索未在CLI发行中交付。

## GUI静态范本

已验收的正本是[demo/talos.html](demo/talos.html)。在外部终端启动静态服务并保持打开：

```powershell
cd C:/DEV/develop/T3rra-C0d3-Talos
python -m http.server 5192 --bind 127.0.0.1 --directory demo
```

访问 http://127.0.0.1:5192/talos.html 。这是模拟数据的视觉范本，不是引擎使用验收。需要复看时：

1. 打开页面，检查浅灰顶栏、石墨阅读区和黄色主操作。
2. 切换演示场景，检查内容与空态入口。
3. 打开/关闭工单详情，检查主阅读面未被长内容撑开。
4. 收放概况并缩窄窗口，检查主要操作可达。

退出静态服务在它所属终端按Ctrl+C。不要关闭其他会话的服务。字体与参考图分发边界见design。

## 浏览器产品

浏览器产品仍是未完成骨架：回复可见性、样张残留和刷新恢复尚未收口，当前暂停。不要把demo或事件页有数据当作真实对话体验已完成；恢复时以status确认的任务为入口。

## 文档与范本检查

本轮文档修改仅使用既有交接检查，视觉范本校验按需要执行：

```powershell
python tools/check-handoff.py
python demo/talos-check.py
```

产品实现变化另按package.json登记的适用检查执行；不因文档修改重跑模型、全库或安装演练。启动服务和真实模型请求必须在具体任务中说明用途，不作为例行交接操作。

## 历史操作说明

此前已完成的探针、发行准备和本机环境修复命令保存在[操作索引归档](docs/archive/2026-10-06/readme-before-doc-refresh.md)，只供定位旧证据。旧命令与阶段描述不覆盖当前status，也不要求新用户重现本机事故。
