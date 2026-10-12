# Talos Desktop

Windows 优先的 Talos 桌面工作台，沿用已确认的 Endfield 视觉，通过本机 talos studio 使用 Talos CLI。CLI 是独立终端产品；本仓包含浏览器产品壳和桌面接驳，Tauri 发行形态仍在开发。

## 开发协作入口

用户在 Codex 确定方向与复核，Cursor 执行当前任务，用户验收真实使用。

- [当前状态](docs/status.md)：本轮、候选与验收。
- [当前任务与路线](docs/plan.md)：执行什么、做到哪里停。
- [工作流与复制提示词](docs/workflow.md)：分别给 Cursor 和 Codex 的操作。
- [代理规则](AGENTS.md)：仓库边界。
- [视觉](docs/design.md)、[Studio 证据](docs/adapters/talos-engine.md)：任务按需引用。

不用先读历史事故，也不用把 Codex 聊天全文复制到 Cursor。执行提示词引用仓库文件即可。产品是否通过以 status 中绑定提交的记录为准。

## 环境

需要 package.json 声明的 Node 版本：>=22.19 <23 或 >=24.2 <27，npm，以及文档/范本检查使用的 Python。

在仓库根目录安装项目依赖：

~~~powershell
cd C:/DEV/develop/T3rra-C0d3-Talos
npm ci
~~~

产品连接需要本机已配置的 Talos CLI，且支持 Studio v2。CLI 安装、provider、登录和升级由 [CLI 项目](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI) 负责。不要为日常验收自动升级用户已满意的 CLI。

## 启动浏览器产品

先选择实际存在的绝对工作区路径；需要真实生成时，使用用户已配置好的 provider。将下面示例路径替换成该工作区：

~~~powershell
cd C:/DEV/develop/T3rra-C0d3-Talos
npm run check:env
npm run dev:product -- --cwd "C:/path/to/workspace"
~~~

检查环境通过后再启动服务。用户在外部终端运行并保持打开，访问 [http://127.0.0.1:5193/](http://127.0.0.1:5193/)。界面为 5193，内部观察服务为 5194。发送任务会按 provider 计费。

正常退出在所属终端按 Ctrl+C。端口占用时先确认是否已有验收服务；不要杀未知进程，也不要重复起第二份。已确认属于本项目的遗留进程可使用现有 npm run stop:product，执行前查看其影响端口；它不是每次启动的前置命令。

候选验收前核对版本：

~~~powershell
git rev-parse HEAD
git status --short
~~~

产品代码必须对应 status 的候选；候选之后仅有文档提交时应有明确说明。不要一边验旧服务，一边修改它读取的产品代码。

## 仅看视觉

产品壳布局预览：

~~~powershell
npm run dev:shell
~~~

访问 [http://127.0.0.1:5193/](http://127.0.0.1:5193/)。单独的壳没有引擎连接；不应把它当成功对话证据。不用裸 npx vite app，以免丢失共享样式/字体。

已验收的静态正本：

~~~powershell
python -m http.server 5192 --bind 127.0.0.1 --directory demo
~~~

访问 [http://127.0.0.1:5192/talos.html](http://127.0.0.1:5192/talos.html)。demo 全部为模拟数据，只证明视觉。

## 检查命令

| 命令 | 实际用途与限制 |
| --- | --- |
| npm run check:env | 查看宿主与 CLI 定位；不是生成测试 |
| npm run spike:initialize | 启动真实 Studio 并握手；不能证明对话或画面，不是日常接手必跑项 |
| npm run typecheck | 现有 tsc 配置；入口为 spike 及其导入依赖，并非所有产品/测试文件 |
| npm run test:core | package.json 明确列出的离线测试；含 mock，不证明真实引擎 |
| npm run check:demo | 静态范本结构检查，不证明产品画面 |
| npm run check:handoff | 当前文档链接、交接字段、demo 快照等检查 |
| npm run check:all | 上述类型、核心测试、demo、handoff 串行聚合；前项失败后续不执行 |

R1 的首轮定向检查可以用已安装 Vitest，执行者按实际影响调整清单并记录理由：

~~~powershell
npm exec -- vitest run test/studio-helpers.test.ts test/session-history.test.ts test/timeline-fact-store.test.ts test/engine-events-fact-store.test.ts
~~~

实现后的候选按 plan 跑适用检查。某项已经在同一候选通过且没有新影响，不重复跑。环境拒绝启动不等于断言失败；应记录退出码与未运行范围，不能宣称全绿。需要越过工具沙箱时走工具授权，不通过删检查规避。

仅文档改动：

~~~powershell
npm run check:handoff
git diff --check
~~~

本机参考 PNG 按资产约定不入 Git；新 checkout 如缺少所需参考，按 [design](docs/design.md) 处理，不能把缺图当当前渲染已经验收。

## 产品交付与分发

Windows 桌面候选使用 Tauri 2，保留同一套产品界面和 Studio 接驳。安装包携带 Node v24.15.0 x64 与桌面服务；Talos CLI 需已安装、配置好 provider，并可由本机 PATH 定位。桌面不会自动升级 CLI。实际候选、产物哈希与验收范围见 [status](docs/status.md)。

安装并启动 TALOS 后，选择工作区目录；取消选择保留现有状态。首次没有目录时不连接 CLI，不以安装目录作为工作区。正常关闭窗口即可退出自有后端与 CLI 子进程。

### 构建 Windows 安装候选

需要 Windows x64、锁定的 Node v24.15.0、Rust/MSVC 工具链与 WebView2；采用 package-lock/Cargo.lock。在仓库根目录执行：

~~~powershell
npm ci
npm run build:desktop:icons
npm run build:desktop:win
npm run check:desktop:package
~~~

build:desktop:win 由 Tauri beforeBuildCommand 生成前端和服务；校验随包 Node 与 tools/runtime/node-win-x64.json 的官方 SHA-256 一致。图标脚本需要 Pillow；正常源码包已包含 PNG/ICO，无需每次重生成。服务产物不依赖 npm/tsx 或开发服务。

release 程序位于 src-tauri/target/release/talos-desktop.exe，NSIS 位于 src-tauri/target/release/bundle/nsis/TALOS_0.1.0_x64-setup.exe。资源与 Node 与安装应用一起部署；单独拷贝 exe 不能替代安装包。check:desktop:package 有限启动自有随机端点，验证静态资源、认证 WS 和关闭，不发送模型请求。

桌面前端从本地打包资源加载；Node 后端仅绑定 loopback，WS 使用本次随机凭据。原生接口只开放目录选择、目录记忆和服务状态；网页没有通用 shell 权限。

字体许可与本地参考图使用范围见 [design](docs/design.md#资产与分发)。源码保存、用户验收、推送和公开发布是不同动作，不能互相代替。
