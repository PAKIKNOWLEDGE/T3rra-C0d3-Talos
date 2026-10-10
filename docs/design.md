# Talos Desktop 视觉正本

## 已确认资产

用户已明确满意现有视觉。本轮工作是把引擎接入该视觉，不重新设计。

1. 正本：[demo/talos.html](../demo/talos.html)、[CSS](../demo/talos.css)、[JS](../demo/talos.js)。这是已验收的模拟数据交互范本。
2. 本地参考：[newend1](references/newend1.png)、[newend2](references/newend2.png)、[newend3](references/newend3.png)、[newend4](references/newend4.png)、[newend5](references/newend5.png)、[newend6](references/newend6.png)。使用边界见 [参考说明](references/README.md)。
3. 产品壳：[app/index.html](../app/index.html)、[app/product.css](../app/product.css)、[app/product-motion.css](../app/product-motion.css)。与 demo 共用基础样式；有真实数据接驳不等于已通过产品验收。

历史来源为 C:/DEV/develop/tmp/OPUS5-5，后整理到 tmp/T3rra-C0d3-Talos；文件已带入本仓，临时目录不是当前依赖。

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

HarmonyOS Sans SC Regular / Bold 位于 demo/fonts 与 app/fonts。既有资料未附完整许可原文；本轮未核验，公开分发前需取得许可或由用户指定替代。不能从“免费商用”推断已履行再分发义务。

六张游戏参考 PNG 仅本地设计比对，已忽略，不默认进入源码或产品包。不删除现有本地参考；新 checkout 缺参考时报告缺项，不能从相近图片编造视觉验收。

启动命令只见 [README](../README.md#仅看视觉)，验收结果只见 [status](status.md)。重构前设计全文已保存于 [归档](archive/2026-10-10-workflow-reset/README.md)。
