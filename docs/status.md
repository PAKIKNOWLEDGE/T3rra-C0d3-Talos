# 当前状态（Talos 桌面）

更新：2026-10-10。**唯一执行入口。**

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | `talos-desktop-pre-tauri` / **g2（诚实接手）** |
| 阶段 | **产品未验收、基线未发布**；主人要求下一位接手；**默认停功能扩张** |
| 本轮角色 / 来源 | 文档收口；代码以工作树为准，**无干净 release commit** |
| 目标 / 方案入口 | 困境全文 **[handoff-honest-2026-10-10.md](handoff-honest-2026-10-10.md)**；合同 [plan](plan.md)、[fulfillment-matrix](fulfillment-matrix.md) |
| 允许范围 | 主人点名缺陷（**P0 正文粘连** 等）；修完须附 repro + 目视步骤 |
| 禁止范围 | 无人值守加测试凑绿、扩带 6、未授权改 Talos-CLI、宣称「已验收」 |
| 验收 / 停止点 | 主人 `dev:product` 目视带 0 起；说「通过」前不算完成 |
| 完成证据 | **无**。机读曾在某轮报绿 ≠ 当前树；**首条付费 turn 已失败**（粘连词 + ENGINE JSON 噪音） |
| 下一接手 | 先读 [诚实接手说明](handoff-honest-2026-10-10.md) → `check:all` 自证 → 修 P0 → 再带 0 目视 8 步 |

## 触发依据

主人对代理轮次失望：付费首句即 UI 大失败；判定为屎山接手，要求把从头到尾的困境写入 docs。

## 已知阻塞（比 plan 更急）

| 优先级 | 项 | 状态 |
| --- | --- | --- |
| P0 | 助手回复英文 **单词粘连**（空格丢失） | **未修**，见诚实接手 §6 |
| P1 | `query_collapse_view` 等 **裸 JSON** 进时间线 | **未修** |
| P2 | **大量 WIP 未提交**（studio 迁接主体在未跟踪/已改文件） | 接手者定基线 |

## Git 事实（2026-10-10）

- 分支 `main` 比 `origin/main` **超前 5 commit**。  
- 另有 **大范围 modified + untracked**（`talos-studio.ts`、`studio-*.ts`、`fulfillment-matrix.md`、多份 `test/studio-*.ts` 等）。  
- **不能** 用「main 已 push」描述当前完成度。

## 你怎么启动

`npm run dev:product -- --cwd <绝对路径>` → `http://127.0.0.1:5193/`

## 同质化根因（仍有效）

换 spawn 不等于换合同。每改一行查 [fulfillment-matrix](fulfillment-matrix.md)：用户动作 → studio 方法 → FactStore → 诚实 UI。内建斜杠走 `execute_slash`，**禁止** `turn/start`。
