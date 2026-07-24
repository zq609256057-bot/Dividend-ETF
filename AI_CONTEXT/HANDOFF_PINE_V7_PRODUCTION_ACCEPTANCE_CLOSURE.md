# Pine V7 Production Acceptance Closure

验收日期：2026-07-16（Asia/Shanghai）  
生产 URL：<https://zq609256057-bot.github.io/Dividend-ETF/>  
最终结论：`PINE_V7_PRODUCTION_ACCEPTANCE_PASS`

## 1. Git 与部署身份

- 本地分支：`main`
- 本地 HEAD：`5c9626226562e5e23a672e2e56373c5e9b9435af`
- 本地 `origin/main`：`5c9626226562e5e23a672e2e56373c5e9b9435af`
- GitHub commits API 的当前 main：`5c9626226562e5e23a672e2e56373c5e9b9435af`
- 提交链包含 Pine 正式切换 `2196dbc3`，最新为指数原子切换修复 `5c96262`。
- GitHub Pages `index.html`：HTTP 200，Last-Modified `2026-07-15 15:22:09 UTC`。

生产资产与当前 main 逐字节一致：

| 资产 | 生产 SHA256 | 本地 SHA256 | 结果 |
|---|---|---|---|
| `index.html` | `aba90da354c1c6de15e0c95c92c7cecf9a59f769c66a7b3299835bd71db24a97` | 相同 | PASS |
| `index_switch_atomic.js` | `15a3d2abb76feb3d349d53d7e4bb0ca9351a9b04165ad89cf192f52df75e94bf` | 相同 | PASS |
| `pine_score_resolver.js` | `29c039e13662d174c9c85c0540bd4782d234cc14c7331aa26518dbfa438e43f4` | 相同 | PASS |
| `pine_auto_config.js` | `c7d2e8e3fb9bccb04a3be8fadfa5cd1c3e70b945febae434099ec0fa9a0a5cb3` | 相同 | PASS |

因此确认 GitHub Pages 已部署 `5c96262`，不是旧的 `2196dbc3` 页面。

## 2. 默认加载与 Pine Auto

真实生产页面首次打开时捕获到明确的 `LOADING` 状态：

- 当前指数身份先切为 000922。
- price、DID、technical 字段为空。
- final score 为 `--`。
- 自动填入与计算按钮在加载阶段禁用。
- 状态显示“正在加载 000922 数据……”。

无需点击“自动填入今日数据”，加载完成后得到：

| 项目 | 000922 |
|---|---:|
| Price | 5307.5 |
| DID | 4.421% |
| Pine source | Python Auto |
| Pine score | 3.0 / 10 |
| Pine date | 2026-07-14 |
| Engine | `pine-v7-red-rocket-final` |
| Valuation | 39 / 60 |
| Technical | 18.25 / 40 |
| Final | 57.25 / 100 |

页面在线字段与冻结评分公式交叉计算一致。由于正式“计算评分”按钮会调用生产历史保存 POST，本轮为满足“真实写入 0”没有点击；分项及 final 通过在线输入值、当前生产 HTML 公式和冻结回归测试只读计算。

## 3. 指数切换闭环

### 930955

无需再次点击自动填入，切换后完整得到：

| 项目 | 930955 |
|---|---:|
| Price | 11122.67 |
| DID | 4.604% |
| SMA250 | 11862.213 |
| RSI14 | 50.412 |
| Pine source / score | Python Auto / 3.0 |
| Engine | `pine-v7-red-rocket-final` |
| Valuation | 43 / 60 |
| Technical | 17.25 / 40 |
| Final | 60.25 / 100 |

### 930955 → 000922

点击切回 000922 后，在真实生产页面捕获到中间状态：

- 状态：“正在加载 000922 数据……”。
- price：空。
- DID：空。
- final score：`--`。

这证明 930955 的 11122.67、4.604、technical 和 60.25 在新指数开始加载时已同步失效，没有继续显示。

完成后恢复 000922：price 5307.5、DID 4.421、SMA250 5599.366、RSI 48.929、Python Auto 3.0、frozen Engine，身份状态为 READY。

### 再次切回 930955

无需自动填入，重新得到 11122.67、4.604、SMA250 11862.213、RSI 50.412 和 Python Auto 3.0；未发现 000922 残留。

## 4. Manual Override

在 000922 上输入 Manual 8 并启用 Override：

- Source：`Manual Override`
- Mode：`Override`
- Pine：8.0
- DID 与 PB 百分位保持 4.421、4.199，估值输入没有改变。
- Pine 从 3 升到 8，只使 Technical 从 18.25 增至 23.25，Final 从 57.25 增至 62.25，均恰好 +5。

取消 Override 后立即恢复：

- Source：`Python Auto`
- Mode：`Auto`
- Pine：3.0
- Engine：`pine-v7-red-rocket-final`

## 5. Auto Fallback

只读 Resolver 回归覆盖并通过：

- API HTTP 503 / 请求失败 → `Manual Input`
- schemaVersion 错误 → `Manual Input`
- Pine score 越界 → `Manual Input`
- 日期未来、数据过期 → `Manual Input`
- Manual Override 始终高于有效 Auto。
- Auto 恢复后重新采用对应指数的 Auto 数据。

Fallback 不提交指数数据、不覆盖旧指数字段。Resolver 测试输出：`PineScoreResolver: 8 migration scenarios PASS`；额外 schema/score 无效测试亦 PASS。

## 6. 快速切换竞态

真实生产页面执行 000922 → 930955 → 000922 快速切换后，最终状态严格为最后一次选择：

- 标题：中证红利指数 · 000922
- Price：5307.5
- DID：4.421
- SMA250：5599.366
- Pine：Python Auto 3.0
- 状态：000922 READY

原子控制器单元回归同时验证前三请求中旧响应标记为 stale，仅最后请求允许 commit，PASS。

## 7. 评分一致性

生产 HTML 和 frozen asset 回归确认：

- Valuation 上限：60
- Technical 上限：40
- Pine：只进入 Technical 中的 10 分子项
- Trend bonus clamp：`[-2, +3]`
- Final clamp：`[0, 100]`
- `total = valuation + technical + trendBonus`，随后执行 0–100 clamp

Pine Engine、Resolver、评分配置和正式备份 hash 均未变化。

## 8. 390×844 移动端

- `innerWidth = clientWidth = scrollWidth = bodyScrollWidth = 390`
- 无横向滚动。
- 指数切换后 930955 显示 11122.67、4.604、Python Auto 3.0。
- Manual Override 8 正常显示 `Manual Override / Override / 8.0`。
- final score 在切换期间保持失效状态 `--`；桌面真实切换已捕获明确 LOADING 文案及空字段。
- Console error：0。
- Console warning：0。

## 9. 生产保护

本轮执行记录：

- Cloudflare KV writes：0
- Worker changes/deployments：0
- Pine Engine changes：0
- Pine Resolver changes：0
- Scoring changes：0
- Valuation changes：0
- Macro changes：0
- Snapshot refresh：0
- Git commit/push：0
- GitHub Pages publish：0
- V1.3 publish：0

任务开始前存在 `.DS_Store`、V1.3 Shadow 目录及其交付文档等未跟踪文件；它们未被发布、提交或纳入本轮生产验收。除本报告外，本轮未创建或修改文件。正式业务文件 tracked diff 为空。

## 10. 最终结论

部署身份、Pine Auto、指数原子切换、数据隔离、Override、Fallback、评分冻结、移动端和生产保护全部通过。

**Pine V7 自动化迁移项目正式关闭。**

`PINE_V7_PRODUCTION_ACCEPTANCE_PASS`
