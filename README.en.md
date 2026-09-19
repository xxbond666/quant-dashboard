<div align="right">
  <a href="./README.md">简体中文</a> | <b>English</b>
</div>

<p align="center">
  <img src="./public/assets/icons/app.icon-preview.png" width="96" alt="stock-quant-analysis logo" />
</p>

<h1 align="center">stock-quant-analysis</h1>

<p align="center">
  A local-only, open-source quant dashboard: market overview, stock deep-dives, earnings calendar,<br/>
  macro indicators, watchlist & alerts — with optional integration of a local qlib + TradingAgents pipeline.<br/>
  No database. No cloud. No subscriptions.
</p>

<p align="center">
  <a href="https://github.com/xxbond666/stock-quant-analysis/actions/workflows/ci.yml"><img src="https://github.com/xxbond666/stock-quant-analysis/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Node-%3E%3D18.18-339933?logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
</p>

<p align="center">
  <img src="./docs/screenshots/home.png" alt="Market overview: cover stats wall + sector heatmap" />
</p>

> **Disclaimer**: This project is a personal research tool — not a broker, not investment advice.
> Market data may be delayed per provider rules. All outputs are for research only.

---

## 📋 Table of Contents

1. [✨ Introduction](#-introduction)
2. [🔋 Features](#-features)
3. [🖼️ Screenshots](#️-screenshots)
4. [⚙️ Tech Stack](#️-tech-stack)
5. [📐 Architecture](#-architecture)
6. [🤸 Quick Start](#-quick-start)
7. [🔐 Environment Variables](#-environment-variables)
8. [🧱 Project Structure](#-project-structure)
9. [📡 Data Sources & Quota Strategy](#-data-sources--quota-strategy)
10. [🧩 Optional: Local Quant Backend](#-optional-local-quant-backend)
11. [🎨 Design System (Mono Glass)](#-design-system-mono-glass)
12. [🌐 Internationalization](#-internationalization)
13. [⚡ Performance](#-performance)
14. [🧪 Scripts & Tooling](#-scripts--tooling)
15. [🗺️ Roadmap](#️-roadmap)
16. [❓ FAQ & Troubleshooting](#-faq--troubleshooting)
17. [🤝 Contributing](#-contributing)
18. [🛡️ Security](#️-security)
19. [📜 License & Attribution](#-license--attribution)
20. [🙏 Acknowledgements](#-acknowledgements)

---

## ✨ Introduction

stock-quant-analysis is derived from [OpenStock](https://github.com/Open-Dev-Society/OpenStock) (AGPL-3.0).
It keeps the excellent UI foundation and TradingView widget integration, removes heavyweight dependencies
(auth / database / email), and replaces them with a lightweight architecture:
**local JSON storage + free market APIs + an optional local quant pipeline**.

- **No database** — watchlist & alerts live in a local JSON file (atomic writes, crash-safe)
- **No cloud** — designed to run on `127.0.0.1`; not deployable to (and not needing) Vercel
- **Free tiers first** — Finnhub (primary) → Alpha Vantage (fallback) → FRED (macro)
- **Optional quant backend** — a local Python FastAPI at `127.0.0.1:6901` (qlib signals +
  TradingAgents multi-agent reports); pages degrade gracefully without it

## 🔋 Features

| Module | Highlights |
|---|---|
| 📈 Cover stats wall | S&P 500 (VOO) / Nasdaq 100 (QQQ) / BTC / Gold / Crude Oil — live monospace figures, click-through to TradingView |
| 🔥 Sector heatmap | TradingView SPX500 heatmap, full-width immersive panel |
| 🗓️ Earnings calendar | Futu-style month grid: pick a day → logos, names, tickers, pre/after-market badges; watchlist first |
| 📰 News | Watchlist company news + market top stories (TradingView Timeline) |
| 🕯️ Stock details | Candles / baseline / technicals / financials / profile — all native TradingView widgets |
| 📊 Earnings compare | EPS estimate-vs-actual grouped bars (beat/miss colored) + revenue/net-income bars + analyst rating spread |
| 🌏 Macro | 18 FRED series in 5 categories (rates / inflation / jobs / growth / risk), per-card time ranges, titles link to TradingView |
| 🧮 Quant | Model status, bull/bear leaderboards, dense pool ranking table with **pool search**, universe maintenance, train & export |
| 🧠 Analysis console | TradingAgents progress timeline (stage states, current step, logs); one-click PDF report when done |
| ️ Decision fusion | qlib cross-sectional signals × TradingAgents verdicts; PDFs served inline |
| ⭐ Watchlist & alerts | Watchlist auto-joins the quant universe; price alert CRUD (trigger engine on roadmap) |
| 🌗 Bilingual UI | zh / en toggle in the header; TradingView widgets localized to `zh_CN` |
| ⚡ Instant nav | Tiered ISR caching — every page responds in 10–80 ms |

## 🖼️ Screenshots

| Market overview (cover + heatmap + calendar) | Macro (interactive FRED charts) |
|---|---|
| ![home](./docs/screenshots/home.png) | ![macro](./docs/screenshots/macro.png) |
| **Stock (earnings comparison charts)** | **Quant (pool search + rankings)** |
| ![stock](./docs/screenshots/stock.png) | ![quant](./docs/screenshots/quant.png) |

## ⚙️ Tech Stack

**Core**
- Next.js 15 (App Router) + React 19 + TypeScript 5
- Tailwind CSS v4 (`@tailwindcss/postcss`, no tailwind.config) + shadcn/ui + Radix UI
- Fonts: Space Grotesk (display) / Geist (body) / Geist Mono (numerals), self-hosted at build time via `next/font`

**Data & integrations**
- Finnhub (search fallback / quotes / news / earnings calendar / EPS)
- Alpha Vantage (quarterly income statements, 24 h disk cache)
- FRED (macro series)
- TradingView embeddable widgets (charts / heatmap / profile / financials / technicals)
- Optional: local Python FastAPI (qlib + TradingAgents + OpenBB data layer)

**Storage & runtime**
- Local JSON (watchlist / alerts / caches) with atomic writes and `.bak` backups
- No database, no message queue, no daemon requirements

## 📐 Architecture

```
Browser (talks to :3000 only)
   │
   ▼
Next.js 15 server (server actions as proxy layer, tiered ISR cache)
   ├── Local JSON store .......... watchlist / alerts / name table / income cache
   ├── Finnhub / Alpha Vantage / FRED ....... free market & macro data
   ├── TradingView widgets ..... charts / heatmap / profile (browser-direct, proxy-able)
   └── 127.0.0.1:6901 (optional) .... Python quant console
            ├── /api/quant/{signals,decisions}   qlib signals & fusion
            ├── /api/qlib/{universe,signal,run}  universe & training
            ├── /api/analysis/*                  TradingAgents jobs
            └── reports → {TA_REPORTS_DIR}/{run}/complete_report.pdf
                         ▲
                         └── /api/report/{name} inline PDF (traversal-guarded)
```

Security boundary: the browser **never** talks to :6901 (an unauthenticated port); the dashboard binds
`127.0.0.1` by default. See [SECURITY.md](./SECURITY.md).

## 🤸 Quick Start

**Prerequisites**
- Node.js ≥ 18.18 (20+ recommended)
- One free Finnhub key (everything else is optional)
- Windows: one-click launcher + desktop app window; Linux/macOS: plain `npm start`

**Install & run**

```bash
git clone https://github.com/xxbond666/stock-quant-analysis.git
cd stock-quant-analysis
npm install

cp .env.example .env.local   # then fill in at least the Finnhub key

npm run build
npm start                    # binds 127.0.0.1:3000 only
```

Open http://127.0.0.1:3000.

**Windows extras (optional)**

```powershell
.\scripts\start_all.ps1             # self-check + start + app-mode window
.\scripts\start_all.ps1 -NoBrowser  # headless
node scripts/check-env.mjs          # env + backend connectivity self-check
python scripts/make_desktop_shortcut.py   # rebuild desktop shortcut (needs pylnk3)
python scripts/make_logo.py         # regenerate app icon (needs Pillow)
```

**Build notes**
- `next/font` fetches Google Fonts once at build time and self-hosts them; see troubleshooting for offline builds
- If TradingView widgets fail to load in your region, set user env `DASH_PROXY=http://127.0.0.1:7897` (any proxy) and restart the launcher

## 🔐 Environment Variables

Full template in [.env.example](./.env.example). Summary:

| Variable | Required | Purpose | Free key |
|---|---|---|---|
| `NEXT_PUBLIC_FINNHUB_API_KEY` | ✅ | Search fallback / quotes / news / calendar / EPS | [finnhub.io](https://finnhub.io/register) |
| `ALPHA_VANTAGE_API_KEY` | ❌ | Quarterly revenue/net income (25 req/day, 24 h disk cache) | [alphavantage.co](https://www.alphavantage.co/support/#api-key) |
| `FRED_API_KEY` | ❌ | 18 macro series | [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) |
| `QUANT_API_BASE` | ❌ | Local quant console URL (default `http://127.0.0.1:6901`) | — |
| `TA_REPORTS_DIR` | ❌ | TradingAgents reports root (default `./data/reports`) | — |
| `QLIB_UNIVERSE_PATH` | ❌ | Universe file (default `./data/universe.txt`) | — |
| `APP_STATE_PATH` / `APP_DATA_DIR` | ❌ | State file / data root (default `./data`) | — |

System env vars for the launchers (not read from `.env`): `DASH_PROXY` (browser proxy), `DASH_WATCHDOG_PS` (6901 watchdog script path).

## 🧱 Project Structure

```
app/
  (root)/
    page.tsx                 Market overview (cover wall + heatmap + news + calendar)
    stocks/[symbol]/page.tsx Stock details (TV widgets + earnings compare charts)
    quant/  analysis/  decisions/  macro/  watchlist/
  api/
    report/[name]/route.ts   Local report PDFs (allowlist + root guard)
    logo/[symbol]/route.ts   Finnhub logo proxy (memory cache)
components/
  home/        CoverStats, EarningsCalendarCard (month grid), WatchlistNews
  charts/      SvgCharts (zero-dependency line / grouped bars)
  macro/       MacroPanels (selectable ranges)
  quant/       SignalTable (pool search), QuantTools, QuantPanels
  analysis/    AnalysisConsole (progress timeline)
lib/
  config.ts    Single exit for local paths (env-overridable)
  actions/     server actions (finnhub / av / fred / calendar / watchlist / universe)
  quant/api.ts 6901 client (timeouts + 20 s cache)
  i18n/        zh/en dictionaries & toggle
scripts/       start_all.ps1 / check-env.mjs / make_logo.py / make_desktop_shortcut.py
docs/screenshots/
```

## 📡 Data Sources & Quota Strategy

| Domain | Primary | Fallback | Cache |
|---|---|---|---|
| Cover quotes / search / news / calendar / EPS | Finnhub (60 req/min) | Alpha Vantage | 60 s / 15 min / 6 h / 7 d |
| Quarterly revenue / net income | Alpha Vantage (25 req/day) | graceful empty state | 24 h disk |
| 18 macro series | FRED | — | 1 d |
| Charts / heatmap / profile / financials | TradingView widgets | — | browser side |
| qlib signals / fusion / reports | local :6901 | graceful degradation | 20 s |

**Known quota traps (all mitigated)**: AV returns HTTP 200 + `Note/Information` JSON when exhausted;
Finnhub calendar caps at 1500 rows keeping only the far end (hence 14-day windowed fetches);
FRED `limit` caps at 100000.

## 🧩 Optional: Local Quant Backend

The quant / analysis / decisions pages can use an **external, optional** Python FastAPI service
(default `127.0.0.1:6901`) providing qlib cross-sectional signals, universe training, and
TradingAgents multi-agent analysis with PDF reports. Contract: [API_DOCS.md](./API_DOCS.md).

- Without it: those three pages show an amber connection panel (with a `curl` self-check);
  **everything else works normally**
- With it: reports open inline via `/api/report/{name}`; the analysis page shows a stage-level timeline

## 🎨 Design System (Mono Glass)

- **Monochrome chrome**: charcoal `#08080a` + six-step cool grays + frosted panels (blur 14 px, 1 px inner stroke, single-light-source tinted shadows)
- **Semantic data colors**: up `#35D07F` / down `#E5484D` (data only, never chrome); white = active
- **Type**: Space Grotesk display / Geist body / Geist Mono numerals (global `tabular-nums`)
- **Ambience**: fixed white glow + 2.8 % film-grain overlay; spotlight hover borders
- **Interaction**: 200 ms transitions, `scale(.98)` press, visible focus rings; skeleton loaders

## 🌐 Internationalization

- Header toggle (zh / EN), persisted via cookie
- TradingView widgets localized (`zh_CN`)
- New user-facing strings must be added to both dictionaries in `lib/i18n/messages.ts`

## ⚡ Performance

| Page | ISR cache | Measured |
|---|---|---|
| `/` overview | 60 s | ~25 ms |
| `/quant` `/decisions` | 20 s | ~10–15 ms |
| `/stocks/[symbol]` | 5 min | ~12 ms |
| `/macro` | 1 h | ~80 ms |
| `/watchlist` | 60 s | ~12 ms |

Combined with Next `<Link>` prefetching, navigation feels instant; all external API calls happen
server-side behind layered caches.

## 🧪 Scripts & Tooling

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (Turbopack) |
| `npm start` | Production server (`-H 127.0.0.1`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `node scripts/check-env.mjs` | Env + backend connectivity self-check |
| `scripts/start_all.ps1` | Windows one-click launcher (self-check + app window) |

CI (GitHub Actions) runs typecheck → lint → test → build on every push/PR.

## 🗺️ Roadmap

- [ ] Alert trigger engine (local polling + desktop notification)
- [ ] Earnings calendar export (.ics)
- [ ] Custom macro baskets & comparison charts
- [ ] Full-text search over local PDF reports
- [ ] English copy polish & contributor guide expansion

## ❓ FAQ & Troubleshooting

- **Slow installs**: the repo pins no registry; CN users may `npm config set registry https://registry.npmmirror.com`
- **npm `allow-scripts` / sharp prompts**: new npm script-approval notice — safe to ignore, or run `npm approve-scripts`
- **Font download fails at build**: `next/font` needs one-time network access; build on a connected machine or temporarily comment out `Space_Grotesk` in `app/layout.tsx`
- **TradingView widgets blank**: direct connection blocked in your region — set `DASH_PROXY` and restart (see Quick Start)
- **Port in use**: `npm start -- -p 3001`
- **Zero-config empty states**: without keys, pages show guided empty states (see `.env.example`); nothing crashes
- **Windows-only**: `start_all.ps1` / `dashboard_window.pyw`; other platforms use `npm start`

## 🤝 Contributing

Issues and PRs welcome:

1. Fork and create a feature branch
2. Keep PRs focused; attach screenshots for UI changes
3. Run `typecheck / lint / test` before pushing
4. Add both languages for any user-facing string

## 🛡️ Security

Designed as a **local single-user** tool: binds `127.0.0.1` by default; some endpoints are
unauthenticated by design. Do not expose it to the internet without adding your own auth layer
in front. Report vulnerabilities per [SECURITY.md](./SECURITY.md).

## 📜 License & Attribution

Derived from [OpenStock](https://github.com/Open-Dev-Society/OpenStock) (© Open Dev Society, AGPL-3.0);
upstream docs preserved in [README.upstream.md](./README.upstream.md). Per AGPL-3.0, this derivative
is licensed under the same license; offering it as a network service requires publishing this
directory's full source and crediting the original authors.

**Modification statement (AGPL §5)**
- Removed: auth (Better Auth + MongoDB), email/cron (Inngest + Nodemailer), sentiment card (Adanos),
  upstream search implementation, Dockerfile, `.idea`, portrait photo icon (replaced by an original
  geometric mark generated by `scripts/make_logo.py`)
- Replaced: database → local JSON (atomic writes); search → local universe first + Finnhub fallback (with timeouts)
- Added: quant/analysis/decisions/macro pages, windowed Finnhub earnings calendar, cover stats wall,
  Mono Glass design system, tiered ISR caching, inline report PDFs, pool search,
  `.env.example` / `SECURITY.md` / CI
- Modified: 2026-09

## 🙏 Acknowledgements

- [Open Dev Society](https://github.com/Open-Dev-Society) and all OpenStock contributors — the excellent UI foundation
- [TradingView](https://www.tradingview.com/) widgets / [Finnhub](https://finnhub.io/) / [Alpha Vantage](https://www.alphavantage.co/) / [FRED](https://fred.stlouisfed.org/) free data
- shadcn/ui, Radix UI, Tailwind CSS, and the Next.js community

— Runs locally. Free forever. Open forever.
