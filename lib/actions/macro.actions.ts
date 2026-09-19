'use server';

/**
 * 宏观数据：FRED 直连（本机 FRED_API_KEY，缓存 1 天）。
 *
 * 按类别给出多组时间序列（利率 / 通胀 / 就业 / 增长货币地产 / 风险美元），
 * 每条序列拉足够长的历史（日频自 2015，月/季频自 1960），前端可选时间范围。
 * 通胀类给出同比 %（由指数序列在服务器端计算，避免前端处理对齐问题）。
 */

const FRED_KEY = process.env.FRED_API_KEY ?? '';
const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

export interface MacroPoint {
    date: string;
    value: number;
}

export interface MacroSeries {
    id: string;
    label: string;
    unit: string;
    category: string;
    latest?: MacroPoint | null;
    prev?: MacroPoint | null;
    points: MacroPoint[];
    error?: string;
}

interface SeriesDef {
    id: string;
    label: string;
    unit: string;
    category: string;
    /** 拉取起点 */
    start: string;
    /** true = 把指数序列换算成同比 %（与 12 期前比） */
    yoy?: boolean;
}

const CAT_RATES = '利率与收益率';
const CAT_INFLATION = '通胀';
const CAT_JOBS = '就业';
const CAT_GROWTH = '增长 · 货币 · 地产';
const CAT_RISK = '风险与美元';

const SERIES: SeriesDef[] = [
    { id: 'DGS10', label: '10 年期美债收益率', unit: '%', category: CAT_RATES, start: '2015-01-01' },
    { id: 'DGS2', label: '2 年期美债收益率', unit: '%', category: CAT_RATES, start: '2015-01-01' },
    { id: 'DGS30', label: '30 年期美债收益率', unit: '%', category: CAT_RATES, start: '2015-01-01' },
    { id: 'FEDFUNDS', label: '联邦基金利率', unit: '%', category: CAT_RATES, start: '1960-01-01' },
    { id: 'T10Y2Y', label: '10Y-2Y 利差（倒挂=衰退信号）', unit: '%', category: CAT_RATES, start: '2015-01-01' },

    { id: 'CPIAUCSL', label: 'CPI 同比', unit: '%', category: CAT_INFLATION, start: '1960-01-01', yoy: true },
    { id: 'PCEPILFE', label: '核心 PCE 同比（美联储目标 2%）', unit: '%', category: CAT_INFLATION, start: '1960-01-01', yoy: true },
    { id: 'PPIACO', label: 'PPI 同比', unit: '%', category: CAT_INFLATION, start: '1960-01-01', yoy: true },

    { id: 'UNRATE', label: '失业率', unit: '%', category: CAT_JOBS, start: '1960-01-01' },
    { id: 'PAYEMS', label: '非农就业人数', unit: '千人', category: CAT_JOBS, start: '1960-01-01' },
    { id: 'ICSA', label: '初请失业金人数（周）', unit: '人', category: CAT_JOBS, start: '2015-01-01' },

    { id: 'GDPC1', label: '实际 GDP（季调）', unit: '十亿美元', category: CAT_GROWTH, start: '1960-01-01' },
    { id: 'INDPRO', label: '工业生产指数', unit: '指数', category: CAT_GROWTH, start: '1960-01-01' },
    { id: 'M2SL', label: 'M2 货币供应', unit: '十亿美元', category: CAT_GROWTH, start: '1960-01-01' },
    { id: 'RSAFS', label: '零售销售', unit: '百万美元', category: CAT_GROWTH, start: '1992-01-01' },
    { id: 'HOUST', label: '新屋开工（年化）', unit: '套', category: CAT_GROWTH, start: '1960-01-01' },

    { id: 'VIXCLS', label: 'VIX 恐慌指数', unit: '', category: CAT_RISK, start: '2015-01-01' },
    { id: 'DTWEXBGS', label: '美元指数（Broad）', unit: '指数', category: CAT_RISK, start: '2006-01-01' },
];

/** 同比换算：与 12 期之前比较（月频=12 个月，对日/周频不适用，本表只对月频开 yoy） */
function toYoy(pts: MacroPoint[]): MacroPoint[] {
    const out: MacroPoint[] = [];
    for (let i = 12; i < pts.length; i++) {
        const before = pts[i - 12].value;
        if (!before) continue;
        out.push({ date: pts[i].date, value: ((pts[i].value - before) / Math.abs(before)) * 100 });
    }
    return out;
}

/**
 * 降采样：最近一年全量保留；更早的点按 ≥6 天一个桶只留一个。
 * 目的：日频序列（DGS10/VIX 等）全历史内嵌进页面 HTML 会到 MB 级，
 * 压缩后肉眼无差（折线趋势不变），payload 降一个数量级。
 */
function thinOldPoints(pts: MacroPoint[]): MacroPoint[] {
    if (pts.length <= 1500) return pts;
    const cutoff = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
    const out: MacroPoint[] = [];
    let lastKeptMs = 0;
    for (const p of pts) {
        if (p.date >= cutoff) {
            out.push(p);
            continue;
        }
        const ms = Date.parse(p.date);
        if (!lastKeptMs || ms - lastKeptMs >= 6 * 86400_000) {
            out.push(p);
            lastKeptMs = ms;
        }
    }
    return out;
}

async function fetchSeries(s: SeriesDef): Promise<MacroSeries> {
    if (!FRED_KEY) {
        return { ...s, latest: null, prev: null, points: [],
                 error: '未配置 FRED_API_KEY（免费申请入口见 .env.example）' };
    }
    const url =
        `${FRED_BASE}?series_id=${s.id}&observation_start=${s.start}` +
        `&sort_order=asc&limit=100000&file_type=json&api_key=${FRED_KEY}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15000);
    try {
        const res = await fetch(url, { signal: ac.signal, next: { revalidate: 86400 } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = (await res.json()) as { observations?: { date: string; value: string }[] };
        let pts = (j.observations ?? [])
            .map((o) => ({ date: o.date, value: Number(o.value) }))
            .filter((p) => Number.isFinite(p.value));
        if (s.yoy) pts = toYoy(pts);
        pts = thinOldPoints(pts);
        return {
            id: s.id, label: s.label, unit: s.unit, category: s.category,
            latest: pts[pts.length - 1] ?? null,
            prev: pts[pts.length - 2] ?? null,
            points: pts,
        };
    } catch (err) {
        return {
            id: s.id, label: s.label, unit: s.unit, category: s.category,
            latest: null, prev: null, points: [],
            error: err instanceof Error ? err.message : String(err),
        };
    } finally {
        clearTimeout(timer);
    }
}

export async function getMacroSnapshot(): Promise<MacroSeries[]> {
    // 并发拉取全部序列（FRED 免费额度宽松，单页一次全量、缓存 1 天）
    return Promise.all(SERIES.map(fetchSeries));
}
