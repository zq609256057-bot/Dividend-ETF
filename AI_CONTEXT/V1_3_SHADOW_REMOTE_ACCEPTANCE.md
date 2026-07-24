# Dividend Dashboard V1.3 Shadow Remote Acceptance

最终结论：PASS  
验收 URL：<https://dividend-dashboard-api-v1-3-shadow.zq609256057.workers.dev/>  
部署版本：`24412e62-d77d-4fd2-b523-f8aaf3257600`

## 远程检查清单

- [x] 独立 Worker 名称，不覆盖 `dividend-dashboard-api`
- [x] `/health` 200，`production=false`，`kvWrites=0`
- [x] `/indices` 200，仅 000922/930955
- [x] `/latest` 200，仅 enabled 指数，无 mock
- [x] 000922/930955 正常 History 200
- [x] 周末 `DATE_UNAVAILABLE` 422
- [x] 不存在日期 `DATE_NOT_FOUND` 404
- [x] 249/250 日 `INSUFFICIENT_HISTORY` 422
- [x] 999999 `UNSUPPORTED_CODE` 400
- [x] Pine endpoint 200，两个指数、score 3、frozen Engine、无评分副作用
- [x] Shadow HTML 200，静态管理脚本同源加载
- [x] dropdown/search/unknown code/切换数据身份通过
- [x] Override 优先、取消后恢复 Auto
- [x] 历史回填进入现有评分链路
- [x] 桌面与 390×844 无横向滚动
- [x] Console 无阻断性错误、无 warning
- [x] KV 写入 0；未刷新真实 snapshot

## 部署传播记录

首次新建 Worker 后需要显式 `workers_dev=true` 才获得公开路由。后续版本部署后按边缘传播进行等待与 cache-busting 只读复验；没有空提交、force push、Production KV 刷新或 GitHub Pages 操作。

History 的公开 Worker-to-Worker fetch 会受到 Cloudflare 1042 限制，最终改为 Worker Service Binding。绑定只读调用正式 History Worker，不更改其代码、路由、KV 或部署。

验收完成，可以进入“V1.3 正式发布申请”阶段，但不得据此自动发布生产。
