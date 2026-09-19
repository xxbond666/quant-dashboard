'use server';

/**
 * 搜索 —— 本地股票池优先，Finnhub 仅作兜底。
 *
 * 为什么重写：
 *  上游实现把「热门股票」和搜索都压在 Finnhub 上，而且 fetch 没有超时。
 *  实测两个后果：① 搜索框永远停在 "Loading stocks..."（请求悬挂，loading 状态不解除）；
 *  ② 布局里每次页面切换都要跑 searchStocks()（无 query 时并发 10 个 profile2 请求），
 *     导航因此被网络拖住 —— 这是"页面切换太慢"的主因。
 *
 * 现在：池内 79 只是本地文件，读取零网络、毫秒级；只有池外查询才去问 Finnhub，
 * 且带 6 秒超时 —— 超时只影响补充结果，不再阻塞界面。
 */
import { readUniverse } from '@/lib/actions/universe.actions';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';
const TIMEOUT_MS = 6000;

function toStock(symbol: string, name?: string, exchange?: string, type?: string): StockWithWatchlistStatus {
    return {
        symbol,
        name: name || symbol,
        exchange: exchange || 'US',
        type: type || 'Common Stock',
        isInWatchlist: false,
    } as StockWithWatchlistStatus;
}

/** 池内代码 → 列表（零网络） */
async function poolSymbols(): Promise<string[]> {
    const u = await readUniverse();
    return u.symbols;
}

/** 无 query 时用：直接给池内前 N 只，不发任何网络请求 */
export async function popularSymbolsAction(limit = 12): Promise<StockWithWatchlistStatus[]> {
    const symbols = await poolSymbols();
    return symbols.slice(0, limit).map((s) => toStock(s));
}

type FhSearch = { result?: { symbol: string; description: string; type?: string }[] };

async function finnhubSearch(query: string): Promise<StockWithWatchlistStatus[]> {
    if (!KEY) return [];
    const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(query)}&token=${KEY}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: ac.signal, cache: 'no-store' });
        if (!res.ok) return [];
        const json = (await res.json()) as FhSearch;
        return (json.result ?? [])
            // 池子是美股，过滤掉带交易所后缀的海外上市代码（如 ASML.AS / 1120.SR），
            // 否则查 "NV" 会被 .AS/.MI/.SR 之类的结果淹没。
            .filter((r) => !r.symbol.includes('.'))
            .slice(0, 15)
            .map((r) => toStock(r.symbol.toUpperCase(), r.description, undefined, r.type));
    } catch {
        return []; // 超时/403/网络异常都只是"没有补充结果"，不影响本地命中
    } finally {
        clearTimeout(timer);
    }
}

/** 搜索：池内子串匹配优先，不足时用 Finnhub 补池外结果 */
export async function searchSymbolsAction(query: string): Promise<StockWithWatchlistStatus[]> {
    const q = (query ?? '').trim().toUpperCase();
    if (!q) return popularSymbolsAction();

    const symbols = await poolSymbols();
    const poolSet = new Set(symbols);
    const localHits = symbols.filter((s) => s.includes(q)).map((s) => toStock(s));

    // 池内已有结果时直接返回，避免为了一点补充信息等网络
    if (localHits.length >= 5) return localHits;

    const remote = await finnhubSearch(q);
    const seen = new Set(localHits.map((s) => s.symbol));
    const merged = [...localHits];
    for (const r of remote) {
        if (seen.has(r.symbol)) continue;
        seen.add(r.symbol);
        merged.push(r);
    }
    merged.sort((a, b) => {
        // 排序优先级：完全匹配 > 池内标的 > 前缀匹配 > 包含匹配；同级再按长度、字典序。
        // （踩过两个坑：① indexOf 未命中返回 -1，直接相减会把不匹配的排到前面；
        //   ② 只按长度会在查 NV 时把池外的 NVO/NVS 排到池内的 NVDA 前面。）
        const rank = (r: StockWithWatchlistStatus): [number, number] => {
            const i = r.symbol.indexOf(q);
            if (r.symbol === q) return [0, 0];
            if (poolSet.has(r.symbol)) return [1, i < 0 ? 0 : i];
            return [i === 0 ? 2 : 3, i < 0 ? 9_999 : i];
        };
        const [ra, ia] = rank(a);
        const [rb, ib] = rank(b);
        return ra - rb || ia - ib || a.symbol.length - b.symbol.length || a.symbol.localeCompare(b.symbol);
    });
    return merged.slice(0, 20);
}
