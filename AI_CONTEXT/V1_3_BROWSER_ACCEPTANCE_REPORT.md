# Dividend Dashboard V1.3 Shadow Browser Acceptance

页面：<https://dividend-dashboard-api-v1-3-shadow.zq609256057.workers.dev/>  
浏览器：Codex in-app Browser  
日期：2026-07-15

## 1. 桌面端

页面成功加载，`/indices` 动态生成 2 个 option，无前端真实指数硬编码入口。

| 操作 | 身份/价格 | Pine | 最终评分 |
|---|---|---|---:|
| 初始 000922 | 中证红利指数；5307.5；DID 4.421% | Python Auto；3.0；2026-07-14；`pine-v7-red-rocket-final` | 57.25 |
| 下拉切换 930955 | 红利低波100指数；11122.67；DID 4.604% | Python Auto；3.0；2026-07-14；同一 frozen Engine | 60.25 |
| 搜索 000922 | 状态“已匹配：中证红利指数 · 000922”并回到 5307.5 | 自动回到 000922 Pine 3.0 | 57.25 |
| 搜索 123456 | 显示“该指数未接入。”；option 仍为 2；当前指数和价格不变 | 不创建数据 | 不变 |

切换时使用 activation id + AbortController；过期响应不会覆盖新指数。实际 UI 中标题、当前指数、价格、DID、宏观、技术、Pine 和评分均随代码一致变化，未发现沿用上一指数数据。

## 2. Pine Resolver

- Auto：来源 `Python Auto`，score 3.0。
- Manual Override：输入 8 并勾选后立即显示 `Manual Override / Override / 8.0`。
- 取消 Override：立即恢复 `Python Auto / Auto / 3.0` 及 frozen Engine。
- Fallback：冻结 Resolver 的失败降级测试通过；本轮未改 Resolver 文件。

优先级保持 `Manual Override > Auto Pine V7 > Manual Input`。

## 3. 历史回填与评分

000922 回填 `2022-10-28`：价格 4628.83，Pine 来源 Python Auto、score 0.0、日期 2022-10-28、Engine frozen。点击“计算评分”后得到 `74.6/100（估值50 + 技术24.6）`，证明远程 history 输入进入现有 60/40 评分链路。

## 4. 移动端与 Console

390×844 视口测量：

- `innerWidth=clientWidth=scrollWidth=bodyScrollWidth=390`
- selector/search/button 均为 312px，未溢出卡片
- 自动填入/计算按钮各 164.5px
- 无横向滚动
- Console errors：0；warnings：0

结论：桌面、搜索、切换、Override、历史评分及 390×844 布局全部通过。
