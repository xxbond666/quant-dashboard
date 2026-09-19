# Quant Dashboard（本地量化看板）

单机本地运行的量化看板：市场概览（TradingView 热力图/报价/头条）、个股详情（K 线/财务/业绩对比/中文简介）、
业绩日历、宏观指标（FRED 18 序列可交互图表）、自选股与预警、以及可选的本地量化后端集成
（qlib 截面信号、TradingAgents 多智能体深度分析、决策融合报告）。

> **许可与归属**：本目录代码派生自 [OpenStock](https://github.com/Open-Dev-Society/OpenStock)（AGPL-3.0），
> 原作者 Open Dev Society，原始许可见 `LICENSE`，上游原文说明保留在 `README.upstream.md`。
> 依 AGPL-3.0，本派生作品同样以 AGPL-3.0 授权；若对外提供网络访问，需公开本目录全部源码并署名原作者。

> **注意**：量化/分析/决策三页依赖一个运行在 `127.0.0.1:6901` 的本地 Python 控制台（**外部可选依赖**，
> 接口契约见 `API_DOCS.md`）。不启动它时这三页显示连接失败面板，**其余功能完全正常**。
> 本项目**不可部署到 Vercel**（服务端 fetch 的 `127.0.0.1` 会指向 Vercel 自身容器）。

---

## 快速开始

```bash
# 1. 依赖（Node >= 20）
npm install

# 2. 配置：复制模板并至少填入 Finnhub key（免费）
cp .env.example .env.local

# 3. 构建并启动（仅监听 127.0.0.1）
npm run build
npm start
# 打开 http://127.0.0.1:3000
```

- 构建期会通过 `next/font` 从 Google Fonts 拉取字体并**自托管**（CI/离线构建需网络一次）。
- Windows 一键启动（含桌面应用窗口）：`.\scripts\start_all.ps1`；自检：`node scripts/check-env.mjs`。
- 某些地区浏览器直连 TradingView 组件不通：设置用户环境变量 `DASH_PROXY=http://127.0.0.1:7897`
  （任意代理）后重启启动脚本即可；不设则不注入代理参数。

## 页面与数据源

| 页面 | 路由 | 数据源（主 → 备） |
|---|---|---|
| 市场概览 | `/` | 封面数据墙 Finnhub `/quote`；热力图/报价/头条 TradingView widget；业绩日历 Finnhub `/calendar/earnings`（14 天分窗）→ Alpha Vantage |
| 个股详情 | `/stocks/[symbol]` | K 线/财务/简介/技术分析 TradingView widget；EPS 预期vs实际 Finnhub `/stock/earnings`；营收/净利润 Alpha Vantage `INCOME_STATEMENT`（24h 落盘缓存） |
| 量化 | `/quant` | 本地 Python 控制台 `/api/quant/signals`、`/api/qlib/universe`（含股池搜索栏） |
| 分析 | `/analysis` | Python 控制台 `/api/analysis/*`（进度时间线 + 报告直开） |
| 决策融合 | `/decisions` | Python 控制台 `/api/quant/decisions`；PDF 经 `/api/report/{name}` 内联打开 |
| 宏观 | `/macro` | FRED（利率/通胀/就业/增长/风险 5 类 18 序列，每卡可选时间范围，标题跳 TradingView） |
| 自选股 | `/watchlist` | 本地 JSON 存储 + Finnhub 新闻 |

免费档配额策略：Alpha Vantage 25 次/日（仅营收报表，落盘缓存 24h）；Finnhub 60 次/分（名称表 7 天缓存、
日历 6h 缓存）；页面级 ISR 缓存（首页 60s、个股 5min、宏观 1h）保证导航秒开。

## 目录结构（关键）

```
app/(root)/            页面（ISR 缓存分级）
app/api/report/[name]  本地报告 PDF 直读（防目录穿越）
app/api/logo/[symbol]  Finnhub logo 代理（内存缓存）
components/            UI（Mono Glass 设计系统：单色 chrome + 数据语义色）
lib/config.ts          本地数据路径统一出口（env 可覆盖，默认 ./data）
lib/actions/           server actions（Finnhub/AV/FRED/本地存储）
lib/quant/api.ts       6901 控制台访问层（浏览器永不直连 6901）
scripts/               启动/自检/图标生成（make_logo.py，需 Pillow）
```

## 相对上游 OpenStock 的修改声明（AGPL §5）

- **移除**：登录/认证（Better Auth + MongoDB）、邮件/后台任务（Inngest + Nodemailer）、
  情绪卡（Adanos）、上游搜索实现、Dockerfile、`.idea`、肖像图标（换为 `scripts/make_logo.py` 生成的原创几何图标）。
- **替换**：数据库 → 本地 JSON（原子写）；搜索 → 本地股票池优先 + Finnhub 兜底（带超时）。
- **新增**：量化/分析/决策/宏观四页、业绩日历（Finnhub 分窗）、封面数据墙、Mono Glass 设计系统、
  ISR 性能分层、报告 PDF 直读、股池搜索、`.env.example`/`SECURITY.md`/CI。
- 修改时间：2026-09。完整历史见 git log。

## 开发

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest
```

安全模型见 `SECURITY.md`。**本仓库不含任何密钥**；`.idea/`、`.env*`、`_shots/` 均已 gitignore。

---

## English (summary)

A local-only quant dashboard built on [OpenStock](https://github.com/Open-Dev-Society/OpenStock) (AGPL-3.0):
market overview (TradingView heatmap/quotes/timeline + Finnhub earnings calendar), stock details
(TradingView charts/financials/profile + EPS estimate-vs-actual charts), FRED macro charts with
per-card time ranges, watchlist/alerts on local JSON storage, and optional integration with a local
Python quant console (qlib signals + TradingAgents reports) over `127.0.0.1:6901`.

- Quick start: `npm install && cp .env.example .env.local && npm run build && npm start`
  (binds to 127.0.0.1 only; see `SECURITY.md`).
- Not deployable to Vercel; the quant console is an optional external dependency (`API_DOCS.md`).
- Derived work of OpenStock under AGPL-3.0; modification statement above; upstream docs in
  `README.upstream.md`.
