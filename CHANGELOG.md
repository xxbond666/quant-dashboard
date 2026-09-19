# Changelog

本项目遵循语义化版本；重大变更按轮次记录。完整历史见 `git log`。

## [1.0.0] - 2026-09-20

首个公开发布版本。

### Added
- 市场概览：封面数据墙（VOO/QQQ/BTC/GLD/USO，60s 客户端自刷新，点击跳 TradingView）、
  SPX500 热力图、全球市场报价（含外汇 USD/CNY、CNY/HKD）、头条新闻
- 业绩日历：Finnhub 14 天分窗拉取，富途式月历（公司 logo/名称/代码/盘前盘后标记）
- 个股详情：TradingView 六组件 + EPS 预期vs实际对比图 + 营收/净利润图 + 分析师评级
- 宏观：FRED 5 类 18 序列，每卡可选时间范围（3 月–全部），标题跳 TradingView
- 量化：模型状态卡、多空榜、全池排名表 + 股池搜索栏、股票池维护、训练导出
- 分析：TradingAgents 进度时间线（阶段状态/当前步骤/日志）+ 完成报告一键打开
- 决策融合：qlib × TradingAgents 卡片，PDF 经 `/api/report/{name}` 内联直读
- 演示模式：`scripts/mock-backend.mjs`（无 qlib 环境也能看全量化三页）
- 工程：ISR 分级缓存（全站 10–80ms）、GitHub Actions CI、SECURITY.md、
  中英双版 README（顶部切换）、.env.example、原创几何 logo（`scripts/make_logo.py`）

### Changed
- 派生自 OpenStock（AGPL-3.0）：移除登录/MongoDB/邮件/Inngest，替换为本地 JSON 存储
- 设计系统 Mono Glass：单色 chrome + 数据语义色 + 毛玻璃表面 + 自托管字体
- 所有本地路径 env 化（`lib/config.ts`），默认 `./data`，clone 后零配置可跑
- 服务默认仅绑 `127.0.0.1`

### Removed
- 价格预警功能（含 AlertsPanel / CreateAlertModal / alert.actions）
- 上游肖像图标、Dockerfile、`.idea`、Adanos 情绪卡、死代码若干

### Fixed
- TradingView 公司简介组件 403（正确脚本为 `embed-widget-symbol-profile.js`）
- Finnhub 日历 1500 条截断丢近期数据（分窗拉取）
- Alpha Vantage 配额耗尽静默失败（空态文案区分"未配置/额度用完"）
- 运行时 Google Fonts `@import` 回退 Courier（改 next/font 构建期自托管）
- 服务器监听全网卡（改 `-H 127.0.0.1`）
