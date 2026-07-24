# Dividend Dashboard V1.3 Shadow 部署审计

审计日期：2026-07-15（Asia/Shanghai）  
审计基线：本地 `main` / `5c9626226562e5e23a672e2e56373c5e9b9435af`  
Shadow 来源：`feature/v1.3-dynamic-index-management` / `2846490` 中的 `v1_3_shadow/`，以文件级提取方式进入当前工作树，未切换或改写生产分支历史。

## 1. 审计结论

V1.3 Shadow 已形成独立可部署单元，目标 Worker 固定为 `dividend-dashboard-api-v1-3-shadow`。正式 `dividend-dashboard-api`、正式 `index.html`、GitHub Pages、Production KV、Pine V7、Pine Resolver、评分、估值和宏观逻辑均未修改。

原草案存在三项不适合远程 Shadow 验收的风险，均已在 Shadow 目录内消除：

- 原 Worker 草案含 `DIVIDEND_SNAPSHOTS` / `HISTORY_CACHE` 命名及历史缓存 `put()`；现为零 KV 绑定、零 KV 写入。
- 原 Shadow HTML 的历史保存可向生产 API 发送 POST；现仅写浏览器本地 `localStorage`。
- 同账户 Worker 通过公开 workers.dev 互调会触发 Cloudflare 1042；现用只读 Service Binding 调用正式 History Worker，且代码显式构造 `method: GET`。

## 2. 目录与入口

- Worker：`v1_3_shadow/worker.mjs`
- Wrangler：`v1_3_shadow/wrangler.shadow.toml`
- Registry：`v1_3_shadow/index_registry.json`
- Shadow HTML 源：`v1_3_shadow/index.html`
- 实际静态部署目录：`v1_3_shadow/public/`
- latest 冻结只读快照：`v1_3_shadow/output/dividend_indices_latest.shadow.json`
- Pine 冻结只读快照：`v1_3_shadow/output/pine_shadow_latest.canonical.json`
- 保护测试：`v1_3_shadow/tests/index_management_test.mjs`、`deployment_safety_test.mjs`、`test_onboarding.py`

`public/index.html` 与审计源文件逐字节相同；`public/index_management.js` 与源文件逐字节相同。

## 3. 绑定与写入审计

最终 dry-run 仅列出：

- `env.ASSETS`：Shadow 静态资源。
- `env.HISTORY_ENGINE (dividend-dashboard-api)`：只读 Worker Service Binding。
- `env.HISTORY_ENGINE_URL`：本地/降级环境的只读 URL 配置。

不存在 KV、D1、R2、队列、Cron、Production route 或 Secret 绑定。Worker 源码不存在 `.put()`，所有非 `GET`/`OPTIONS` 请求返回 405。远程 `/health` 返回 `production:false`、`kvWrites:0`；Pine meta 返回 `cacheStatus:bundled_read_only`、`kvWrites:0`。

## 4. Registry 与数据审计

Registry schema 为 `dividend_index_registry_v2`。正式 enabled 列表严格为：

- `000922` 中证红利指数
- `930955` 红利低波100指数

`999999` 只存在于内存测试 fixture；不在 Registry、latest、Pine 远程响应或页面下拉中。未增加任何真实指数。

## 5. 冻结资产保护

受保护文件在 Git 中无 tracked diff。当前 SHA256：

- `index.html`：`aba90da354c1c6de15e0c95c92c7cecf9a59f769c66a7b3299835bd71db24a97`
- `pine_score_resolver.js`：`29c039e13662d174c9c85c0540bd4782d234cc14c7331aa26518dbfa438e43f4`
- `pine_auto_config.js`：`c7d2e8e3fb9bccb04a3be8fadfa5cd1c3e70b945febae434099ec0fa9a0a5cb3`
- `pine_auto_candidate.css`：`dc027e0e1a3f80ae4854f504fa1a677651bd114243abb3787191cceaa00fec83`
- `dashboard_v11_core.js`：`f6bdcb58c3f16897d2a97d733e42024e958001e10f967a3abb2171bf7b91c20c`
- 正式 `production_deploy/worker.js`：`a9bfe25723518ab7c14782f57ba141e89f6e30deff99c90b6e2261e72361a516`
- Pine canonical 输入：`35f3c0bf5686ee6382888d14c96c1d2b521f259e22a4edaccb44e3904153e023`

结论：生产保护通过。
