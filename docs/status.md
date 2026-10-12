# 当前状态 — Talos Desktop

更新：2026-10-12。当前事实、候选与验收的唯一记录；任务合同在 [plan](plan.md)，协作方式在 [workflow](workflow.md)。

## 当前交接卡

| 字段 | 值 |
| --- | --- |
| 任务标识 / 修订 | desktop-operation-feedback / r2-b |
| 阶段 | **待技术复核** |
| 本轮角色 / 来源 | Luna 执行；用户授权 R2-B |
| 目标 / 方案入口 | [R2-B 基本操作结果可信](plan.md#下一小轮r2-b-基本操作结果可信) |
| 允许范围 | 动作结果关联、打开/继续/停止/审批消费者与聚焦测试 |
| 禁止范围 | CLI 写入、视觉、协议/状态所有权改变、Tauri、R2-B 外扩 |
| 验收 / 停止点 | Codex 技术复核；未推进 R3 |
| 完成证据 | 见「当前实施交付与复核」 |
| 下一接手 / 就绪性 | Codex 复核；交付 fail **0 / 2** |

## 本轮授权与候选

- 规划提交：`edb3fc8`；产品基线：`bf0bf2d`；执行前 HEAD：`edb3fc8`（干净）。
- 当前产品候选：**`41e7cb2`**
- 已停写，待 Codex 复核。

## 当前实施交付与复核

| 字段 | 当前值 |
| --- | --- |
| 产品候选 / 改动清单 | **`41e7cb2`** — `ws-server` `action_error` 带 `operationId`；`pending-operations` 断连清理；`talos.js` 停止/审批 `sendActionWithResult`、受理与失败提示分离、重复点击防护；`talos-studio` `replyApproval` await RPC 失败不提前 settled；`runtime`/`minimax-acp` 对齐 Promise |
| 打开 / 继续 / 停止 / 审批证据 | `test/operation-feedback.test.ts`（WS 错误 ID、审批拒绝保持 pending、load 回滚）；复用 `session-directory` load 失败语义；停止/审批 UI 路径经 `sendActionWithResult` |
| 结果关联 / 失败 / 断连恢复 | `rejectAllPendingOperations` 在 socket `close` 调用；`action_error` 仅按 `operationId` 结算对应 pending |
| 检查命令与结果 / 限制 | `npm run check:all` **0**（`test:core` **142**）；未启动真实引擎、未浏览器目视、未付费模型 |
| Codex 技术复核 | 待复核 |
| 候选退回记录 | 无；交付 fail **0 / 2** |

### 用户验收入口（技术通过后）

`npm run dev:product -- --cwd <工作区绝对路径>` → `http://127.0.0.1:5193/`

1. 打开会话 → 切走/再开：失败应 toast 错误且 session 不回滚错误（已有 load 回滚由服务层保证）。
2. 继续发送：断网后操作不应永久 pending（断连清理）。
3. 运行中点停止：仅受理成功显示「已请求停止」；发送失败显示错误；重复点击不叠请求。
4. 审批（若有）：RPC/过期失败不显示「已提交」；卡片保持待审批。

## 保留的产品事实

| 项 | 状态 |
| --- | --- |
| R2-A | 技术通过（`bf0bf2d`） |
| K1 / K2 | 用户 PASS |
| R1 整体操作 | 部分待用户补验（plan 保留项） |

## 上轮实施交付（R2-A）

见 Git `7239422:docs/status.md` 与候选 `bf0bf2d`。
