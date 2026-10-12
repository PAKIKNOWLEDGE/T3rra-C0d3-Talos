# 字体资产与再分发缺项

TALOS 使用 HarmonyOS Sans SC。2026-10-12 从 OpenHarmony 官方仓库 `openharmony/global_system_resources` 的提交 `c97a915509a875bd29b820e6edcc8a67f9556ddb` 获取 LICENSE_Fonts，原文保存在 [许可副本](HarmonyOS-Sans-LICENSE.txt)。来源：https://github.com/openharmony/global_system_resources/blob/c97a915509a875bd29b820e6edcc8a67f9556ddb/LICENSE_Fonts 。

官方许可允许按条件与软件捆绑未修改字体，要求软件显著注明字体使用、保留版权/协议，并禁止修改字体。

当前 demo/fonts 与 app/fonts 中的 Regular/Bold WOFF2 缺少可核对的来源和转换记录；官方仓库列出的 SC 字体为 TTF。不能由字体名称或“免费商用”推断现有 WOFF2 满足未修改条件。本轮没有替换已验收字体，也没有声称字体许可已关闭。

公开安装包缺项：确认现有文件来源及合法再分发条件，或采用核实过的原始字体/经授权替代后形成新构建；安装资源同时携带许可与使用声明。Release 保持草稿，直到该缺项关闭。用户截图用于说明已验收产品，不作为字体文件来源证明。
