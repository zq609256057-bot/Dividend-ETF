# Dividend Dashboard V1.3 Shadow API Contract Report

验收 URL：<https://dividend-dashboard-api-v1-3-shadow.zq609256057.workers.dev>  
最终部署版本：`24412e62-d77d-4fd2-b523-f8aaf3257600`  
验收日期：2026-07-15

## 1. 固定契约

| 路由 | 结果 | 核心断言 |
|---|---:|---|
| `GET /health` | 200 | `status=ok`、`production=false`、`kvWrites=0`、Registry v2、日期 2026-07-14 |
| `GET /indices` | 200 | 仅 000922、930955；均 `historyAvailable/latestAvailable=true` |
| `GET /latest` | 200 | `dividend_indices_snapshot_v1`；仅两个 enabled 指数；日期 2026-07-14 |
| `GET /api/shadow/pine/latest` | 200 | `pine_v7_shadow_v1`、`shadowOnly=true`、`productionScoreEffect=none`、`tradeSemantics=none` |
| 非 GET/OPTIONS | 405 | Worker 顶层拒绝，不进入业务路由 |

Pine 两指数均返回 score `3`、日期 `2026-07-14`、Engine `pine-v7-red-rocket-final`。数据来自哈希已冻结的 canonical 文件，`cacheStatus=bundled_read_only`，KV 写入为 0。

## 2. History Calculation 远程矩阵

| 场景 | 请求样例 | HTTP / error | 结果 |
|---|---|---|---|
| 000922 正常 | 2022-10-28 | 200 | `historical_calculation`，code/date identity 正确，Pine 0 |
| 930955 正常 | 2022-10-28 | 200 | `historical_calculation`，code/date identity 正确，Pine 0 |
| 最新交易日 | 000922 / 2026-07-14 | 200 | Pine 3，`cacheStatus=origin_read_only` |
| 周末 | 000922 / 2026-07-12 | 422 / `DATE_UNAVAILABLE` | 通过 |
| 数据不存在 | 930955 / 2026-01-01 | 404 / `DATE_NOT_FOUND` | 通过 |
| 少于 250 日 | 930955 / 2021-01-27 | 422 / `INSUFFICIENT_HISTORY` | `249/250`，通过 |
| 未接入代码 | 999999 / 2026-07-14 | 400 / `UNSUPPORTED_CODE` | 未创建、未查询数据，且未泄漏 fixture |

History 使用正式 Worker 的只读 Service Binding。Shadow 仅发送 GET；未执行历史生成、真实 snapshot 刷新或 KV 写入。

## 3. Registry 驱动

`/indices`、`/latest`、`/history/calculate` 均以 `enabled=true` Registry 为准。服务端无 `if code == 000922`/`930955` 分支；代码匹配、可用状态和快照过滤均由 Registry 数据驱动。

结论：V1.3 Shadow API 远程契约通过。
