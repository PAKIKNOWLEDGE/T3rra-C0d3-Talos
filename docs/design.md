# Talos 视觉地图

## 正本与参考层级

1. 当前可运行正本：[demo/talos.html](../demo/talos.html)、[CSS](../demo/talos.css)、[JS](../demo/talos.js)。它是主人已验收的小型交互范本，包含最后一次疏密调整。
2. 主人提供的游戏图：[newend1](references/newend1.png)、[newend2](references/newend2.png)、[newend3](references/newend3.png)、[newend4](references/newend4.png)、[newend5](references/newend5.png)、[newend6](references/newend6.png)。主要取材为 newend5 的装配站工作区层次、newend1 的任务列表、newend3 的工业浮窗。
3. 历史来源是 `C:\DEV\develop\tmp\OPUS5-5`，随后独立整理到 `C:\DEV\develop\tmp\T3rra-C0d3-Talos`。现有文件已完整带入本项目；历史位置只是来源说明，不是日后启动或改版的必需依赖。

不使用旧 `end.html` 覆盖当前正本，也不混入 Rhodes 的 ARK 令牌。产品首次实现优先保留这里的空间关系；风格名不能替代实际 HTML/CSS。

## 已定的视觉方向

浅灰结构顶栏、石墨阅读区、黄色主操作、稳定的工作台构图。顶栏与两侧提供方向，中间记录是主要阅读面。具体数值以 CSS 为准，不另抄一份令牌表制造分叉。

最后一轮降低顶栏、标题区与输入区高度，收窄侧栏，增加记录区留白，减少右栏重复状态，长标题单行省略。这些改动已通过；产品接入不要因多画几个状态又把空白挤满。

保留本地字体、全局进场与会话切换动效、浮窗开合、控件反馈和 reduced-motion 降级。交互节奏比堆装饰更重要。新组件类名要有归属，避免不同组件复用泛名引起布局冲突。

## demo 与产品不是一回事

样张的计划、usage、文件、模式、模型、会话、审批和完成态全部为演示。它只证明布局意图，不能证明 MiniMax 支持对应字段；其中的允许补充指令也不构成产品排队策略。

产品接驳前按可见元素列数据来源与缺失行为。能追到真实事件的接入；无源的保留结构但写明缺失或暂不显示，不能伪造读数。删除大块样张内容时要重新平衡布局，不能退回空洞细线 HUD。

工单保持摘要 + 按需详情；审批的选项、作用域、实际 I/O 必须由契约决定。新建、模型切换、目录选择等按钮在产品里要有真实结果或可见错误。演示用场景按钮不能直接作为生产控制留在发布包。

## TUI 设计讨论

TUI 采用对话流式终端方向：主阅读区留给连续对话和代码，工具详情与菜单按需展开。不要照搬 GUI 三栏或预设常驻侧栏；GUI 的已验收范本不因此改动。

欢迎区使用取材于游戏元素的小幅字符图案，配普通产品名称；不做大号 ASCII 字母字标。依据主人指定的 `cli-ascii-logo` skill，使用 Unicode 块字符及黄色前景。参考目录为 `C:\DEV\develop\tmp\Manuel-ref-image`，批次为 `END1.jpg`、`endfield2.jpg`、`end3.jpg`、`end4.jpg`、`end5.webp`、`end6.png`、`end7.png`；均仅作设计参考，不是产品发布资产。

欢迎图选定 03 装配机械臂，字符正本为 [tui-arm.txt](references/tui-arm.txt)，采用黄色前景、普通字号 Talos 名称。图案借鉴参考图的工业设备和生产设施语汇，属于原创简化轮廓，不声称还原某一游戏模型。画布为 36 列 × 12 行；欢迎、对话/工具、审批三种静态画面范本见 [tui-frames.md](references/tui-frames.md)，真实终端效果仍需后续接线验收。其他候选不再作为默认方案。

本机临时预览在忽略目录 `.talos/tui-art/`；`alternatives.py` 生成四案的纯文本、ANSI 色彩版、严格 ASCII 降级、单张字符栅格 PNG 及 `alternatives.png` 对比图。PNG 只预览字符外观，不证明真实终端渲染；未接入引擎。接手不依赖这些临时文件，应使用已落盘的机械臂字符正本。整体配色、密度、菜单、输入区仍待可见验收；图案通过不等于整个 TUI 通过。

## 资产与分发

字体是随 demo 搬迁的 HarmonyOS Sans SC Regular / Bold，文件在 `demo/fonts/`；系统字体仅引用，不复制 Windows 字体文件。旧项目已知未附 HarmonyOS 授权原文，本轮也未核验：本地范本沿用，公开分发前需取得原许可或由主人指定替代，不把“免费商用”当完整许可证据。

六张参考图为主人提供的游戏界面，仅本地设计比对；不声明拥有游戏素材，不默认随公开源码或产品分发。本地 Git 已忽略参考 PNG，但文档与目录说明保留；若将来做可移植的公开交接，先处理可分发参考物，不留断链冒充完整。

预览、复验动作统一见 [README](../README.md)；验收结论只在 [status](status.md)。
