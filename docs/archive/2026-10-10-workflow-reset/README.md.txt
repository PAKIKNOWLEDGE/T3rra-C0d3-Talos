# Talos GUI 与项目文档

本仓库维护GUI范本、`talos studio` 接驳与项目文档。可安装的终端产品在[独立CLI仓库](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI)，本地源码目录为C:/DEV/develop/Talos-CLI。两仓库相邻独立，不使用子模块，也不互相导入内部实现。

## 接手地图

先读[AGENTS.md](AGENTS.md)与[桌面状态](docs/status.md)；**接屎山或换人手**时必读 **[诚实接手说明（2026-10-10）](docs/handoff-honest-2026-10-10.md)**。动引擎再读 Talos-CLI 的 `docs/status.md`。再按需读[计划](docs/plan.md)、[工作流](docs/workflow.md)、[词汇表](docs/glossary.md)或[引擎证据](docs/adapters/talos-engine.md)。

| 文档 | 用途 |
| --- | --- |
| [handoff-honest-2026-10-10](docs/handoff-honest-2026-10-10.md) | 项目简史、架构、屎山原因、P0 缺陷、接手原则 |
| [status](docs/status.md) | 当前结果、限制和下一入口 |
| [plan](docs/plan.md) | 本轮范围与后续方向 |
| [workflow](docs/workflow.md) | 实施、验收、Git与文档规则 |
| [design](docs/design.md) | 已验收视觉正本与素材来源 |
| [lessons](docs/lessons.md) | 可迁移经验 |
| [glossary](docs/glossary.md) | 产品名与引擎名分层 |
| [talos-engine](docs/adapters/talos-engine.md) | 引擎 `talos studio` 接驳（按需） |
| [fulfillment-matrix](docs/fulfillment-matrix.md) | 用户动作 → studio 方法 → UI（Tauri 前全产品） |

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

产品壳在 [app/index.html](app/index.html)，样式与 [demo/talos.css](demo/talos.css) 共用正本（另加 `app/product.css` 少量壳差异）。可用 Vite 预览布局（不接引擎时 WebSocket 不会连接）：

```powershell
cd C:/DEV/develop/T3rra-C0d3-Talos
npm run dev:shell
```

打开 http://127.0.0.1:5193/ 对照 demo 目视验收。须用 `dev:shell`（或 `dev:product`），不要裸跑 `npx vite app`，否则 `/demo/talos.css` 与 Harmony 字体不会正确加载。

**Talos Desktop** 依赖本机已安装的 **Talos CLI**（`talos` 在 PATH 上，**0.1.x**）。Desktop 与终端 TUI 并存，不取代 TUI；未安装 CLI 时窗口应显示连接/环境失败，而不是假在线。

接观察服务（另需已配置 provider 才能发模型请求）：

```powershell
cd C:/DEV/develop/T3rra-C0d3-Talos
npm run check:env
npm run dev:product -- --cwd C:/path/to/your/workspace
```

浏览器打开 http://127.0.0.1:5193/ ，底栏应显示已连接。侧栏可**输入另一绝对路径**并点「切换工作区」以更换项目（浏览器版无系统文件夹对话框；安装版以后由 Tauri 提供）。发 prompt 会消耗 provider 配额。可选 `npm run spike:initialize` 仅握手。见 [status](docs/status.md)。

**带 0–5 产品签字**（studio 全链路，非 demo）：按 [plan 目视清单](docs/plan.md#下一小轮带-0-目视验收) 顺序操作；机读对照见 [fulfillment-matrix 机读证据](docs/fulfillment-matrix.md#机读证据非目视替代)。

若启动报 `EADDRINUSE` / 5194 占用，说明上一次的 `dev:product` 仍在后台（常见于**直接关终端窗口**、或崩溃后未退出）。先释放端口：

```powershell
npm run stop:product
```

等价手工：`netstat -ano | findstr :5194` → `taskkill /PID <PID> /F`（5193 若仍占用也一并结束）。然后重新 `npm run dev:product`。

正常退出请在**运行服务的那个终端**按 **Ctrl+C**（应看到 `Shutting down`），不要只关窗口。

## 文档与范本检查

本轮文档修改仅使用既有交接检查，视觉范本校验按需要执行：

```powershell
python tools/check-handoff.py
python demo/talos-check.py
```

产品实现变化另按package.json登记的适用检查执行；不因文档修改重跑模型、全库或安装演练。启动服务和真实模型请求必须在具体任务中说明用途，不作为例行交接操作。

## 历史操作说明

此前已完成的探针、发行准备和本机环境修复命令保存在[操作索引归档](docs/archive/2026-10-06/readme-before-doc-refresh.md)，只供定位旧证据。旧命令与阶段描述不覆盖当前status，也不要求新用户重现本机事故。
