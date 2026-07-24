# Handoff: Dividend Dashboard V1.3 Shadow Deployment

状态：`DIVIDEND_V1_3_SHADOW_ACCEPTANCE_READY`  
Shadow URL：<https://dividend-dashboard-api-v1-3-shadow.zq609256057.workers.dev/>  
Worker：`dividend-dashboard-api-v1-3-shadow`  
最终版本：`24412e62-d77d-4fd2-b523-f8aaf3257600`

## 已完成

1. 将动态 Registry、`/indices`、Registry 驱动 latest/history、下拉和代码搜索部署到独立 Shadow Worker。
2. Shadow HTML 与 API 同源部署；未发布 GitHub Pages，未替换 V1.2。
3. Registry 正式 enabled 仅为 000922、930955；999999 仅在内存 fixture。
4. latest 与 Pine 均为 bundle 内只读冻结快照；History 经只读 Service Binding 访问正式 History Worker。
5. Wrangler 无 KV 绑定，Worker 无 `.put()`，远程健康和 Pine 契约均报告 `kvWrites=0`。
6. 浏览器桌面与 390×844、下拉、搜索、快速切换数据隔离、Auto/Override 恢复、历史回填和评分均通过。

## 测试结果

- V1.3 Registry/API/UI Node：PASS
- V1.3 deployment safety：PASS
- Onboarding：3 passed
- History production/shadow Worker：PASS
- Pine Shadow Worker：20/20 PASS
- Atomic index switch：PASS（含三次快速切换竞态）
- Pine formal switch / Resolver / 100 分公式 / frozen asset：PASS
- History/Pine/技术/指数 watchlist 等 Python 选集：52 passed，41 subtests passed；另有 1 项生产 snapshot validator 基线漂移失败。该失败来自本地 SQLite 已推进到冻结快照 2026-07-14 之后，要求刷新正式 snapshot；本任务明确禁止真实 snapshot 刷新，因此未修改生产数据。Shadow 自身快照、API 和浏览器验收均通过。
- `git diff --check`：PASS

## 生产保护

- 正式 `github_pages_repo/index.html` 无 tracked diff。
- 正式 Worker、Pine V7、Pine Resolver、评分权重、估值、宏观均无修改。
- Production KV 写操作：0。
- Worker/Cloudflare KV 管理操作：0。
- Git push：未执行；GitHub Pages：未发布。

## 回滚点

回滚只涉及独立 Shadow Worker，不影响 V1.2：

- 可将 `dividend-dashboard-api-v1-3-shadow` 回退到上一版本 `e6929469-3718-4f82-a55b-2649205a33e7`。
- 或删除独立 Shadow Worker；正式 `dividend-dashboard-api` 与 Pages 不需要任何回滚。
- 当前生产代码回滚基线仍为本地 main `5c9626226562e5e23a672e2e56373c5e9b9435af`。

## 下一阶段

本交付只证明 V1.3 平台能力可用，不授权 Production release。未来新增真实指数必须单独执行 Index Onboarding 八道门；V1.3 正式发布需另行审批、建立 feature branch/PR，并重新执行生产前保护检查。
