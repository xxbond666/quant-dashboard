'use server';

/**
 * 个股「业绩对比」数据层。
 *
 * 数据来源（全部实测可用，2026-09-19）：
 *   Finnhub        /stock/earnings          近 8 季 EPS 预期 vs 实际（缓存 1 天）
 *   Finnhub        /stock/recommendation    分析师评级分布（免费档可用，缓存 1 天）
 *   Alpha Vantage  INCOME_STATEMENT         季度营收/净利润（缓存 1 天，免费档 25 次/日）
 *
 * 已移除的旧依赖：
 *   - AV OVERVIEW（25 次/日额度被它吃光，导致日历/报表全部拉不到；目标价改由
 *     分析师评级卡 + TradingView 组件呈现）
 *   - Ollama AI 中文公司简介（公司简介统一用 TradingView symbol-profile 现成组件）
 * AV INCOME_STATEMENT 结果落盘缓存 24h（Next 的 fetch 缓存重建即清，
 * 而 AV 免费档只有 25 次/日，不能每次重建后重新拉）。
 * 所有外部请求带超时；任何一路失败都不抛错，由界面降级显示。
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/lib/config';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';
const AV_KEY =
    process.env.ALPHAVANTAGE_API_KEY ?? process.env.ALPHA_VANTAGE_API_KEY ?? '';
const TIMEOUT_MS = 9000;

export interface EarningsQuarter {
    period?: string;
    estimate?: number;
    actual?: number;
    surprise?: number;
    surprisePercent?: number;
    year?: number;
    quarter?: number;
}

export interface IncomeQuarter {
    fiscalDateEnding: string;
    totalRevenue?: number;
    netIncome?: number;
    grossProfit?: number;
    operatingIncome?: number;
    /** 同比（与一年前同季比，%），没有去年同期时为 null */
    revenueYoy?: number | null;
    netIncomeYoy?: number | null;
}

export interface AnalystView {
    strongBuy?: number;
    buy?: number;
    hold?: number;
    sell?: number;
    strongSell?: number;
    period?: string;
}

export interface CompanyInfo {
    symbol: string;
    earnings: EarningsQuarter[] | null;
    income: IncomeQuarter[] | null;
    analyst: AnalystView | null;
    degraded: boolean;
}

async function timedFetch(url: string, revalidate: number, timeoutMs = TIMEOUT_MS): Promise<Response | null> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: ac.signal, next: { revalidate } });
        return res.ok ? res : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

function sym(s: string) { return s.trim().toUpperCase(); }

// ── Finnhub ────────────────────────────────────────────────

async function fhEarnings(symbol: string): Promise<EarningsQuarter[] | null> {
    const res = await timedFetch(
        `${FINNHUB_BASE}/stock/earnings?symbol=${encodeURIComponent(sym(symbol))}&limit=8&token=${FINNHUB_KEY}`,
        86400);
    if (!res) return null;
    const j = (await res.json()) as EarningsQuarter[];
    return Array.isArray(j) && j.length ? j : null;
}

/** Finnhub 分析师推荐分布（免费档可用） */
async function fhRecommendation(symbol: string): Promise<AnalystView | null> {
    const res = await timedFetch(
        `${FINNHUB_BASE}/stock/recommendation?symbol=${encodeURIComponent(sym(symbol))}&token=${FINNHUB_KEY}`,
        86400, 8000);
    if (!res) return null;
    const arr = (await res.json()) as AnalystView[];
    return Array.isArray(arr) && arr.length ? arr[0] : null;
}

// ── Alpha Vantage 季度利润表（磁盘缓存 24h）───────────────

function incomeCachePath(symbol: string): string {
    return path.join(DATA_DIR, 'income_cache', `${sym(symbol)}.json`);
}

async function avIncome(symbol: string): Promise<IncomeQuarter[] | null> {
    const p = incomeCachePath(symbol);
    try {
        if (fs.existsSync(p)) {
            const j = JSON.parse(fs.readFileSync(p, 'utf8')) as { fetchedAt?: number; quarters?: IncomeQuarter[] };
            if (Array.isArray(j.quarters) && j.quarters.length && Date.now() - (j.fetchedAt ?? 0) < 86400_000) {
                return j.quarters;
            }
        }
    } catch { /* 缓存坏了就当没有，走网络 */ }

    const quarters = await fetchAvIncome(symbol);
    if (quarters) {
        try {
            fs.mkdirSync(path.dirname(p), { recursive: true });
            fs.writeFileSync(p, JSON.stringify({ fetchedAt: Date.now(), quarters }), 'utf8');
        } catch { /* 写缓存失败不影响本次返回 */ }
    }
    return quarters;
}

async function fetchAvIncome(symbol: string): Promise<IncomeQuarter[] | null> {
    if (!AV_KEY) return null;
    const res = await timedFetch(
        `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${encodeURIComponent(symbol)}&apikey=${AV_KEY}`,
        86400, 15000);
    if (!res) return null;
    const j = (await res.json()) as { quarterlyReports?: Record<string, string>[] };
    const reports = j.quarterlyReports;
    if (!Array.isArray(reports) || !reports.length) return null;

    const num = (v: unknown) => {
        const n = typeof v === 'string' ? Number(v) : NaN;
        return Number.isFinite(n) ? n : undefined;
    };
    const quarters: IncomeQuarter[] = reports.map((r) => ({
        fiscalDateEnding: r.fiscalDateEnding ?? '',
        totalRevenue: num(r.totalRevenue),
        netIncome: num(r.netIncome),
        grossProfit: num(r.grossProfit),
        operatingIncome: num(r.operatingIncome),
    }));

    // 同比：与「一年前同季」比（AV 的报告按时间倒序，一年前 = i+4）
    quarters.forEach((q, i) => {
        const prev = quarters[i + 4];
        const yoy = (cur?: number, before?: number) =>
            cur && before && before !== 0 ? ((cur - before) / Math.abs(before)) * 100 : null;
        q.revenueYoy = yoy(q.totalRevenue, prev?.totalRevenue);
        q.netIncomeYoy = yoy(q.netIncome, prev?.netIncome);
    });
    return quarters;
}

// ── 汇总 ───────────────────────────────────────────────────

export async function getCompanyInfo(symbol: string): Promise<CompanyInfo> {
    const s = sym(symbol);
    if (!s) {
        return { symbol: s, earnings: null, income: null, analyst: null, degraded: false };
    }

    const [earnings, income, analyst] = await Promise.all([
        fhEarnings(s),
        avIncome(s),
        fhRecommendation(s),
    ]);

    return {
        symbol: s,
        earnings,
        income,
        analyst,
        degraded: !earnings?.length && !income?.length,
    };
}
