import { getQuote } from '@/lib/actions/finnhub.actions';

/**
 * 首页封面 = 数据墙（D2 Mono Glass）：一排五格毛玻璃大数字。
 * 每格可点击 → 新标签打开 TradingView 对应符号页查看详细信息。
 * 数据源 Finnhub /quote（免费档）：指数用 ETF 代理（^GSPC 等 CFD 指数免费档不可用）。
 * 涨跌色彩语义：涨 = 绿 ▲，跌 = 红 ▼（chrome 保持单色，仅数据语义着色）。
 */

const UP = '#35d07f';
const DOWN = '#e5484d';

interface Cell {
    label: string;
    sub: string;
    symbol: string;
    /** TradingView 符号页（点击跳转） */
    tv: string;
    live?: boolean;
}

const CELLS: Cell[] = [
    { label: 'S&P 500 ETF', sub: 'VOO', symbol: 'VOO', tv: 'AMEX:VOO' },
    { label: 'NASDAQ 100 ETF', sub: 'QQQ', symbol: 'QQQ', tv: 'NASDAQ:QQQ' },
    { label: 'BITCOIN', sub: 'BTC / USDT', symbol: 'BINANCE:BTCUSDT', tv: 'BINANCE:BTCUSDT', live: true },
    { label: 'GOLD', sub: 'GLD', symbol: 'GLD', tv: 'AMEX:GLD' },
    { label: 'CRUDE OIL', sub: 'USO', symbol: 'USO', tv: 'AMEX:USO' },
];

function fmt(v: number): string {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: v < 10 ? 3 : 2,
        minimumFractionDigits: v < 10 ? 2 : 2,
    }).format(v);
}

export default async function CoverStats({ zh }: { zh: boolean }) {
    const quotes = await Promise.all(CELLS.map((c) => getQuote(c.symbol)));
    const now = new Date();
    const dateLabel = zh
        ? `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`
        : now.toISOString().slice(0, 10);

    return (
        <section className="glass w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
                    {zh ? '市场封面 · 实时快照 · 点击格子跳转 TradingView' : 'Market Cover · Live · Click a cell for TradingView'}
                </p>
                <p className="font-mono text-[11px] tracking-[0.14em] text-gray-400">{dateLabel}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                {CELLS.map((c, i) => {
                    const q = quotes[i];
                    const up = (q?.dp ?? 0) >= 0;
                    return (
                        <a
                            key={c.symbol}
                            href={`https://www.tradingview.com/symbols/${c.tv.replace(':', '-')}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${c.sub} · TradingView`}
                            className={`relative rounded-xl border p-4 hover:border-white/30 hover:bg-white/[0.06] ${
                                c.live
                                    ? 'border-white/25 bg-white/[0.06]'
                                    : 'border-white/[0.07] bg-white/[0.02]'
                            }`}
                        >
                            {c.live ? (
                                <span className="absolute right-3 top-3 flex items-center gap-1 font-mono text-[9px] tracking-[0.2em] text-gray-400">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                    LIVE
                                </span>
                            ) : null}
                            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">
                                {c.label}
                            </p>
                            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-white md:text-[28px]">
                                {q?.c != null ? fmt(q.c) : '—'}
                            </p>
                            <p
                                className="mt-1.5 flex items-center gap-1 font-mono text-xs"
                                style={{ color: up ? UP : DOWN }}
                            >
                                <span aria-hidden>{up ? '▲' : '▼'}</span>
                                {q?.dp != null ? `${Math.abs(q.dp).toFixed(2)}%` : '--'}
                                <span className="ml-1 text-[11px] font-medium text-gray-400">{c.sub}</span>
                            </p>
                        </a>
                    );
                })}
            </div>
        </section>
    );
}
