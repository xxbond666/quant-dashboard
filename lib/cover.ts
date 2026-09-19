import { getQuote } from '@/lib/actions/finnhub.actions';

/**
 * 封面数据墙的统一数据出口：服务端首屏与 /api/cover（客户端轮询）共用，
 * 保证两边字段与顺序完全一致。
 */

export interface CoverCell {
    label: string;
    sub: string;
    symbol: string;
    /** TradingView 符号页（点击跳转） */
    tv: string;
    live?: boolean;
}

export interface CoverQuote extends CoverCell {
    c: number | null;
    dp: number | null;
}

export const COVER_CELLS: CoverCell[] = [
    { label: 'S&P 500 ETF', sub: 'VOO', symbol: 'VOO', tv: 'AMEX:VOO' },
    { label: 'NASDAQ 100 ETF', sub: 'QQQ', symbol: 'QQQ', tv: 'NASDAQ:QQQ' },
    { label: 'BITCOIN', sub: 'BTC / USDT', symbol: 'BINANCE:BTCUSDT', tv: 'BINANCE:BTCUSDT', live: true },
    { label: 'GOLD', sub: 'GLD', symbol: 'GLD', tv: 'AMEX:GLD' },
    { label: 'CRUDE OIL', sub: 'USO', symbol: 'USO', tv: 'AMEX:USO' },
];

export async function fetchCoverQuotes(): Promise<CoverQuote[]> {
    const quotes = await Promise.all(COVER_CELLS.map((c) => getQuote(c.symbol)));
    return COVER_CELLS.map((cell, i) => ({
        ...cell,
        c: quotes[i]?.c ?? null,
        dp: quotes[i]?.dp ?? null,
    }));
}
