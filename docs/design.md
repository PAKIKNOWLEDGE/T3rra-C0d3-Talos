# Talos Desktop 视觉正本

## 已确认资产

桌面沿用用户确认的视觉。后续只按明确问题局部修改，不重新设计。

1. 正本：[demo/talos.html](../demo/talos.html)、[CSS](../demo/talos.css)、[JS](../demo/talos.js)。这是已验收的模拟数据交互范本。
2. 本地参考：`docs/references/newend1.png` 至 `newend6.png`，不入Git且不是新checkout必需文件；见 [参考说明](references/README.md)。
3. 产品壳：[app/index.html](../app/index.html)、[app/product.css](../app/product.css)、[app/product-motion.css](../app/product-motion.css)。与 demo 共用基础样式；产品验收事实只见 [status](status.md)。

4. 产品开屏：[app/product-splash.css](../app/product-splash.css)，采用浅灰点阵、黄色斜切面、深色三六边形与字标。开屏和空态行为见 [维护约束](proposals/empty-task-layer.md)。[预览](../preview/empty-landing/index.html) 只作构图参考，不覆盖生产布局或状态。

## 需要保留的视觉结果

浅灰结构顶栏、石墨阅读区、黄色主操作；顶栏与两侧提供方向，中间记录是主要阅读面。具体数值以 CSS 为准，不复制第二套 token 表。

保留已确认的顶栏/标题/输入区高度、侧栏宽度、阅读留白、右栏信息密度、长标题省略。本地字体、进场、会话切换、浮窗、控件反馈及 reduced-motion 降级均属正本。

消息修复可以更正内容和必要 DOM 接线，不能顺手改颜色、重排三栏或增加装饰。新状态使用现有视觉语言；容纳不下时先说明产品取舍，不能把阅读区挤满。

## 产品接入

demo 的计划、用量、文件、模式、模型、会话与审批是模拟数据。产品数据来自 Studio 或宿主；没有来源就保留诚实空态和恢复入口，不补造读数。

工具过程默认摘要、详情按需展开。删除、覆盖等确认使用壳内同视觉的对话框，不以浏览器 alert/confirm 充当已完成产品交互。新增/改变控件更新现有 app/ui-manifest.json；登记只证明接线意图，不证明运行和渲染。

流式更新不得反复触发进场、抢输入焦点或强迫阅读位置跳动。局部视觉回归按改动场景检查；没有视觉改动和新失败，不重做整套视觉验收。

TUI 视觉与验收归相邻 CLI，本仓不再维护一套 TUI 开发计划。旧字符稿仅在 [历史参考](references/tui-frames.md) 留存。

## 资产与分发

HarmonyOS Sans SC Regular / Bold 位于 demo/fonts 与 app/fonts。字体使用声明、官方许可及来源资料缺项唯一维护在 [资产记录](licenses/README.md)，发布结果见status；不在本页重复定义发布阶段。

六张游戏参考 PNG 仅本地设计比对，已忽略，不默认进入源码或产品包。不删除现有本地参考；新 checkout 缺参考时报告缺项，不能从相近图片编造视觉验收。

启动命令只见 [README](../README.md#本地开发)，验收结果只见 [status](status.md)。重构前设计全文已保存于 [归档](archive/2026-10-10-workflow-reset/README.md)。
