#!/usr/bin/env node
/**
 * Mock 量化后端（演示模式）—— 让没有 qlib/TradingAgents 环境的人也能看到
 * 量化 / 分析 / 决策三个页面的完整形态。
 *
 * 用法：
 *   node scripts/mock-backend.mjs            # 默认监听 127.0.0.1:6901
 *   PORT=6902 node scripts/mock-backend.mjs  # 换端口（配合 QUANT_API_BASE 使用）
 *
 * 契约与 API_DOCS.md 一致；全部为确定性假数据（哈希种子），无网络依赖。
 * 真实环境请勿运行本脚本占用 6901。
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 6901);
const HOST = '127.0.0.1';

const POOL = [
    'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO', 'AMD', 'NFLX',
    'ORCL', 'CRM', 'ADBE', 'INTC', 'AMD', 'PYPL', 'UBER', 'SPOT', 'SHOP', 'ROKU',
    'SNOW', 'PLTR', 'COIN', 'RBLX', 'DDOG', 'CRWD', 'NET', 'OKTA', 'ABNB', 'DASH',
];
const UNIVERSE = [...new Set(POOL)];

// 确定性伪随机：同一 symbol 每次结果一致
function seed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000) / 1000; // [0,1)
}

const today = () => new Date().toISOString().slice(0, 10);

function row(symbol, i) {
    const r = seed(symbol);
    const stance = r > 0.62 ? 'bullish' : r < 0.32 ? 'bearish' : 'neutral';
    const stanceZh = stance === 'bullish' ? '看多' : stance === 'bearish' ? '看空' : '中性';
    return {
        symbol,
        stance,
        stance_zh: stanceZh,
        rank_pct: 1 - (i + 0.5) / UNIVERSE.length,
        rank_pct_display: `Top ${Math.max(1, Math.round(((i + 0.5) / UNIVERSE.length) * 100))}%`,
        score: Number(((r - 0.5) * 0.08).toFixed(5)),
        advice:
            stance === 'bullish'
                ? '模型给到池内偏强分位，趋势与截面动量共振，可作为右侧参考。'
                : stance === 'bearish'
                  ? '截面分位偏弱，建议控制暴露，等待企稳信号。'
                  : '信号居中，维持观察，不建议加仓。',
        self_pct: Number(r.toFixed(3)),
        rank: i + 1,
        prev_rank: Math.max(1, i + 1 + Math.round((r - 0.5) * 6)),
        rank_delta: Math.round((0.5 - r) * 6),
    };
}

const ROWS = UNIVERSE.map(row).sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));

function signals() {
    const dist = { bullish: 0, neutral: 0, bearish: 0 };
    ROWS.forEach((r) => dist[r.stance]++);
    return {
        ok: true,
        model: 'Alpha158 + LightGBM (MOCK demo data)',
        asof: today(),
        generated_at: new Date().toISOString(),
        universe_size: ROWS.length,
        test_rank_ic_mean: 0.028,
        test_rank_ic_ir: 0.14,
        ic_verdict: '中等（演示数据）',
        stale_days: 0,
        usable: true,
        stance_distribution: dist,
        top_bullish: ROWS.filter((r) => r.stance === 'bullish').slice(0, 5),
        top_bearish: ROWS.filter((r) => r.stance === 'bearish').slice(0, 5),
    };
}

function decisions(limit) {
    const picks = ROWS.slice(0, Math.min(limit, 3));
    return {
        decisions: picks.map((r, i) => ({
            name: `${r.symbol}_${today().replace(/-/g, '')}_mock${i}`,
            ticker: r.symbol,
            ran_at: `${today()} 09:3${i}`,
            rating: r.stance === 'bullish' ? 'Overweight' : r.stance === 'bearish' ? 'Underweight' : 'Hold',
            excerpt:
                `【演示报告】${r.symbol} 决策融合摘要：qlib 截面分位 ${r.rank_pct_display}，` +
                `TradingAgents 定论与量化信号方向${r.stance === 'neutral' ? '存在分歧，取中性' : '一致'}。` +
                '本段文字由 scripts/mock-backend.mjs 生成，仅用于界面演示。',
            qlib: {
                stance: r.stance,
                stance_zh: r.stance_zh,
                rank_pct_display: r.rank_pct_display,
                advice: r.advice,
            },
            has_pdf: false,
            has_html: false,
        })),
    };
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const p = url.pathname;
    const json = (obj, code = 200) => {
        res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(obj));
    };

    if (p === '/api/health') {
        return json({
            ok: true,
            mock: true,
            llm_provider: 'mock',
            llm_model: 'mock-1',
            ollama_reachable: false,
            reports_dir: './data/reports (mock)',
            data_vendors: { equity: 'mock' },
            disabled_sources: [],
        });
    }
    if (p === '/api/quant/signals') return json(signals());
    if (p === '/api/qlib/universe') {
        return json({
            ok: true,
            asof: today(),
            count: ROWS.length,
            score_min: ROWS[ROWS.length - 1].score,
            score_max: ROWS[0].score,
            rows: ROWS,
        });
    }
    if (p === '/api/qlib/signal') {
        const t = (url.searchParams.get('ticker') || '').toUpperCase();
        const r = ROWS.find((x) => x.symbol === t);
        if (!r) return json({ ok: false, error: `symbol ${t} not in mock universe` }, 404);
        return json({ ...r, ok: true, asof: today(), model: 'mock', universe_size: ROWS.length });
    }
    if (p === '/api/quant/decisions') {
        return json(decisions(Number(url.searchParams.get('limit') || 12)));
    }
    if (p === '/api/quant/progress') return json({ found: false });
    if (p === '/api/analysis/status') return json({ state: 'idle', run: null, decision: null });
    if (p === '/api/analysis/logs') return json({ log: '(mock backend: no logs)' });
    if (p === '/api/qlib/run/status') return json({ state: 'idle', task: null, elapsed: null });

    return json({ ok: false, error: `mock backend: unknown path ${p}` }, 404);
});

server.listen(PORT, HOST, () => {
    console.log(`[mock-backend] listening on http://${HOST}:${PORT} （演示数据，Ctrl+C 退出）`);
});
