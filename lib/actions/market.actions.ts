'use server';

/**
 * 市场级数据：业绩日历、自选股新闻。
 *
 * 业绩日历来源：Finnhub /calendar/earnings（免费 60 req/min，含 EPS/营收 预期与实际）。
 * 之前用 Alpha Vantage EARNINGS_CALENDAR，但 AV 免费档只有 25 次/日，
 * 实测额度耗尽后整块日历静默为空（“数据都拉取不到”的根因），已降级为兜底。
 * 公司名来自 Finnhub 美股全量列表（磁盘缓存 7 天），logo 走 /api/logo/[symbol] 代理。
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/lib/config';

const AV_KEY = process.env.ALPHAVANTAGE_API_KEY ?? process.env.ALPHA_VANTAGE_API_KEY ?? '';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';
const TIMEOUT_MS = 60000;

export interface EarningsCalendarEntry {
    symbol: string;
    name: string;
    epsEstimate?: number | null;
    epsActual?: number | null;
    revenueEstimate?: number | null;
    revenueActual?: number | null;
    /** 'pre' 盘前 / 'amc' 盘后 / '' 未定 */
    timeOfTheDay?: string;
    fiscalDateEnding?: string;
    reportDate: string;
}

export interface EarningsCalendarDay {
    reportDate: string;
    /** 当日真实发布家数（entries 可能被截断，月历徽标用这个） */
    count: number;
    entries: EarningsCalendarEntry[];
}

/** 每天最多下传给浏览器的条目数：自选池优先排序后取前 N，避免整页 RSC 负载到 MB 级 */
const MAX_ENTRIES_PER_DAY = 40;

// ── 公司名映射（Finnhub 美股列表，磁盘缓存 7 天）────────────

function namesCachePath(): string {
    return path.join(DATA_DIR, 'finnhub_us_names.json');
}

let nameMapMem: Record<string, string> | null = null;

async function loadSymbolNames(): Promise<Record<string, string>> {
    if (nameMapMem) return nameMapMem;
    const p = namesCachePath();
    try {
        if (fs.existsSync(p)) {
            const j = JSON.parse(fs.readFileSync(p, 'utf8')) as { fetchedAt?: number; names?: Record<string, string> };
            if (j.names && Date.now() - (j.fetchedAt ?? 0) < 7 * 86400_000) {
                nameMapMem = j.names;
                return j.names;
            }
        }
    } catch { /* 缓存坏了就重新拉 */ }

    try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
        const res = await fetch(
            `${FINNHUB_BASE}/stock/symbol?exchange=US&token=${FINNHUB_KEY}`,
            { signal: ac.signal, cache: 'no-store' },
        );
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = (await res.json()) as { symbol?: string; ticker?: string; description?: string }[];
        const names: Record<string, string> = {};
        for (const it of arr) {
            // Finnhub /stock/symbol 的字段叫 symbol（不是 ticker），取错会导致整表为空、
            // 日历里公司名全部回退成代码
            const code = (it.symbol ?? it.ticker ?? '').toUpperCase();
            if (code && it.description) names[code] = it.description;
        }
        if (Object.keys(names).length > 1000) {
            try {
                fs.mkdirSync(path.dirname(p), { recursive: true });
                fs.writeFileSync(p, JSON.stringify({ fetchedAt: Date.now(), names }), 'utf8');
            } catch { /* 写缓存失败不影响本次使用 */ }
        }
        nameMapMem = names;
        return names;
    } catch (err) {
        console.error('[market] 拉取 Finnhub 美股列表失败', err);
        nameMapMem = {};
        return {};
    }
}

// ── 业绩日历（Finnhub 主源）────────────────────────────────

export interface EarningsCalendarResult {
    ok: boolean;
    days: EarningsCalendarDay[];
    total: number;
    error?: string;
}

function groupByDay(entries: EarningsCalendarEntry[], pool: Set<string>): EarningsCalendarDay[] {
    const byDay = new Map<string, EarningsCalendarEntry[]>();
    for (const e of entries) {
        const list = byDay.get(e.reportDate) ?? [];
        list.push(e);
        byDay.set(e.reportDate, list);
    }
    const cmp = (a: EarningsCalendarEntry, b: EarningsCalendarEntry) => {
        const pa = pool.has(a.symbol) ? 0 : 1;
        const pb = pool.has(b.symbol) ? 0 : 1;
        const ra = a.revenueEstimate ?? a.epsEstimate ?? Number.NEGATIVE_INFINITY;
        const rb = b.revenueEstimate ?? b.epsEstimate ?? Number.NEGATIVE_INFINITY;
        return pa - pb || rb - ra || a.symbol.localeCompare(b.symbol);
    };
    return [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([reportDate, list]) => {
            const sorted = [...list].sort(cmp);
            return { reportDate, count: sorted.length, entries: sorted.slice(0, MAX_ENTRIES_PER_DAY) };
        });
}

/**
 * 业绩日历（未来 3 个月，美股）。Finnhub 优先，失败回退 Alpha Vantage。
 */
export async function getEarningsCalendarAction(
    poolSymbols: string[],
): Promise<EarningsCalendarResult> {
    const pool = new Set(poolSymbols.map((s) => s.toUpperCase()));
    const today = new Date();

    if (FINNHUB_KEY) {
        try {
            // Finnhub 日历单次最多返 1500 条且只保留时间靠后的一端（实测 3 个月窗口
            // 会丢掉最近两个月），因此按 14 天分窗并发拉取后合并去重。
            const windows: { from: string; to: string }[] = [];
            for (let off = 0; off < 92; off += 14) {
                const f = new Date(today.getTime() + off * 86400_000).toISOString().slice(0, 10);
                const t = new Date(today.getTime() + Math.min(off + 13, 92) * 86400_000).toISOString().slice(0, 10);
                windows.push({ from: f, to: t });
            }
            const fetchWindow = async ({ from, to }: { from: string; to: string }) => {
                const ac = new AbortController();
                const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
                try {
                    const res = await fetch(
                        `${FINNHUB_BASE}/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_KEY}`,
                        { signal: ac.signal, next: { revalidate: 21600 } },
                    );
                    if (!res.ok) return [];
                    const j = (await res.json()) as Record<string, unknown>[] | { earningsCalendar?: Record<string, unknown>[] };
                    return Array.isArray(j) ? j : j.earningsCalendar ?? [];
                } finally {
                    clearTimeout(timer);
                }
            };
            const parts = await Promise.all(windows.map(fetchWindow));
            const seen = new Set<string>();
            const raw = parts.flat().filter((e) => {
                const key = `${e.symbol}|${e.date}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            if (raw.length) {
                const names = await loadSymbolNames();
                const num = (v: unknown) =>
                    typeof v === 'number' && Number.isFinite(v) ? v : null;
                const entries: EarningsCalendarEntry[] = raw
                    .map((e) => {
                        const symbol = String(e.symbol ?? '').trim().toUpperCase();
                        const reportDate = String(e.date ?? '').trim();
                        if (!symbol || !reportDate) return null;
                        return {
                            symbol,
                            name: names[symbol] ?? symbol,
                            epsEstimate: num(e.epsEstimate),
                            epsActual: num(e.epsActual),
                            revenueEstimate: num(e.revenueEstimate),
                            revenueActual: num(e.revenueActual),
                            timeOfTheDay: String(e.hour ?? ''),
                            reportDate,
                        } as EarningsCalendarEntry;
                    })
                    .filter((e): e is EarningsCalendarEntry => e !== null);
                const days = groupByDay(entries, pool);
                return { ok: true, days, total: entries.length };
            }
        } catch (err) {
            console.error('[market] Finnhub 业绩日历失败，回退 AV', err);
        }
    }

    return getEarningsCalendarFromAV(pool);
}

// ── 业绩日历（Alpha Vantage 兜底，保留原 CSV 解析）──────────

/** 解析 AV 返回的 CSV（支持引号内逗号 —— 公司名如 "BANORTE, S.A." 会破坏朴素切分） */
function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuote = !inQuote;
            continue;
        }
        if (ch === "," && !inQuote) {
            out.push(cur);
            cur = "";
            continue;
        }
        cur += ch;
    }
    out.push(cur);
    return out.map((v) => v.trim());
}

function parseCalendarCsv(csv: string): EarningsCalendarEntry[] {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);

    const iSym = idx("symbol");
    const iName = idx("name");
    const iEpsE = idx("estimate");          // 实际表头就叫 estimate（EPS 预期）
    const iFisc = idx("fiscaldateending");
    const iRep = idx("reportdate");
    const iTod = idx("timeoftheday");

    if (iSym < 0 || iRep < 0) return [];

    const out: EarningsCalendarEntry[] = [];
    for (const line of lines.slice(1)) {
        const cols = splitCsvLine(line);
        if (cols.length < header.length - 2) continue;
        const symbol = (cols[iSym] ?? "").trim().toUpperCase();
        const reportDate = (cols[iRep] ?? "").trim();
        if (!symbol || !reportDate) continue;
        const num = (v: string | undefined) => {
            const n = Number((v ?? "").trim());
            return Number.isFinite(n) && (v ?? "").trim() !== "" ? n : null;
        };
        out.push({
            symbol,
            name: (cols[iName] ?? "").trim() || symbol,
            epsEstimate: num(iEpsE >= 0 ? cols[iEpsE] : undefined),
            epsActual: null,
            revenueEstimate: null,
            timeOfTheDay: iTod >= 0 ? (cols[iTod] ?? "") : '',
            fiscalDateEnding: (iFisc >= 0 ? cols[iFisc] : "").trim(),
            reportDate,
        });
    }
    return out;
}

async function getEarningsCalendarFromAV(pool: Set<string>): Promise<EarningsCalendarResult> {
    if (!AV_KEY) {
        return { ok: false, days: [], total: 0, error: '业绩日历暂不可用（Finnhub / Alpha Vantage 均失败）' };
    }
    const url =
        `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${AV_KEY}`;
    try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
        const res = await fetch(url, { signal: ac.signal, next: { revalidate: 21600 } });
        clearTimeout(timer);
        if (!res.ok) return { ok: false, days: [], total: 0, error: `HTTP ${res.status}` };
        const text = await res.text();
        if (text.trim().startsWith('{')) {
            // AV 限流时返回 JSON 而不是 CSV
            const j = JSON.parse(text) as { Note?: string; Information?: string };
            return { ok: false, days: [], total: 0, error: j.Note ?? j.Information ?? '接口返回异常' };
        }

        // 只留美股：AV 的海外代码常带后缀（如 BABA 是美股本码；带 . 的多为其他市场）
        const entries = parseCalendarCsv(text).filter((e) => !e.symbol.includes('.'));
        const days = groupByDay(entries, pool);
        return { ok: true, days, total: entries.length };
    } catch (err) {
        return {
            ok: false,
            days: [],
            total: 0,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

// ── 自选股新闻 ────────────────────────────────────────────

export interface NewsItem {
    symbol: string;
    category: string;
    datetime: number;
    headline: string;
    source: string;
    summary: string;
    url: string;
}

/** 拉取若干标的的公司新闻（并行，每只取最新几条） */
export async function getNewsForSymbolsAction(
    symbols: string[],
    perSymbol = 3,
): Promise<NewsItem[]> {
    const list = symbols.map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 12);
    if (!list.length || !FINNHUB_KEY) return [];

    const today = new Date();
    const from = new Date(today.getTime() - 14 * 86400_000).toISOString().slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    const jobs = list.map(async (symbol) => {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 8000);
        try {
            const url =
                `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
            const res = await fetch(url, { signal: ac.signal, next: { revalidate: 900 } });
            if (!res.ok) return [];
            const arr = (await res.json()) as Record<string, unknown>[];
            return arr.slice(0, perSymbol).map((n) => ({
                symbol,
                category: String(n.category ?? ''),
                datetime: Number(n.datetime ?? 0),
                headline: String(n.headline ?? ''),
                source: String(n.source ?? ''),
                summary: String(n.summary ?? ''),
                url: String(n.url ?? ''),
            })) as NewsItem[];
        } catch {
            return [];
        } finally {
            clearTimeout(timer);
        }
    });

    const all = (await Promise.all(jobs)).flat();
    return all.sort((a, b) => b.datetime - a.datetime);
}

/** 某标的的后续财报日（下次 + 下下次，来自业绩日历缓存） */
export async function getNextEarningsForSymbol(symbol: string): Promise<string[]> {
    const cal = await getEarningsCalendarAction([]);
    const sym = symbol.trim().toUpperCase();
    const today = new Date().toISOString().slice(0, 10);
    return (cal.days || [])
        .filter((d) => d.reportDate >= today)
        .flatMap((d) => d.entries.filter((e) => e.symbol === sym).map(() => d.reportDate))
        .sort();
}
