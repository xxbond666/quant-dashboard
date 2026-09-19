/**
 * 本地 Python 控制台（FastAPI 127.0.0.1:6901）的服务端访问层。
 *
 * 设计约束（来自融合方案 v3）：
 * - 浏览器永不直连 6901：所有调用都发生在 Next.js 服务端，因此无需给 Python 加鉴权、也无需 CORS。
 * - 6901 只绑 127.0.0.1，本项目**不可部署到 Vercel**（届时 127.0.0.1 会指向 Vercel 容器）。
 */

const BASE = (process.env.QUANT_API_BASE || 'http://127.0.0.1:6901').replace(/\/$/, '');
const TIMEOUT_MS = 20_000;

// ── 类型（字段名严格对齐实际接口返回）──────────────────────────

export type Stance = 'bullish' | 'neutral' | 'bearish';

export interface QuantSignalRow {
    symbol: string;
    stance: Stance;
    stance_zh: string;
    rank_pct: number;
    rank_pct_display: string;
    score: number;
    advice?: string;
    /** 仅全池排名接口提供 */
    self_pct?: number | null;
    rank?: number;
    prev_rank?: number | null;
    rank_delta?: number | null;
}

export interface QuantSignals {
    ok: boolean;
    model: string;
    asof: string;
    generated_at?: string;
    universe_size: number;
    test_rank_ic_mean?: number;
    test_rank_ic_ir?: number;
    ic_verdict?: string;
    stale_days?: number;
    usable?: boolean;
    stance_distribution?: Record<string, number>;
    top_bullish?: QuantSignalRow[];
    top_bearish?: QuantSignalRow[];
}

export interface QuantUniverse {
    ok: boolean;
    asof: string;
    count: number;
    score_min: number;
    score_max: number;
    rows: QuantSignalRow[];
}

export interface QlibSignal extends QuantSignalRow {
    ok: boolean;
    rank_position?: string;
    asof: string;
    model: string;
    universe_size: number;
}

export interface DecisionQlib {
    stance_zh?: string;
    stance?: Stance;
    rank_pct_display?: string;
    advice?: string;
}

export interface Decision {
    name: string;
    ticker: string;
    ran_at: string;
    rating: string;
    excerpt: string;
    qlib?: DecisionQlib;
    has_pdf?: boolean;
    has_html?: boolean;
}

export interface DecisionsResponse {
    decisions: Decision[];
}

export interface ProgressStep {
    label: string;
    done: boolean;
    chars?: number;
    elapsed_sec?: number;
    preview?: string;
}

export interface ProgressStage {
    key: string;
    title: string;
    detail?: string;
    steps?: ProgressStep[];
}

export interface QuantProgress {
    found: boolean;
    task_id?: string;
    symbol?: string;
    trade_date?: string;
    status?: string;
    started_at?: number;
    progress_pct?: number;
    current_label?: string;
    current_activity?: string;
    activity_count?: number;
    recent_activity?: { at: number; text: string }[];
    elapsed_sec?: number;
    completed_steps?: number;
    stages?: ProgressStage[];
    qlib_signal?: Record<string, unknown> | null;
    decision?: Record<string, unknown> | null;
    report_dir?: string | null;
    fatal?: string | null;
    quality_gates?: Record<string, unknown> | null;
    updated_at?: number;
}

export interface AnalysisRun {
    run_id?: string;
    symbol?: string;
    state?: string;
    started_at?: number;
    [k: string]: unknown;
}

export interface AnalysisStatus {
    state: string;
    run: AnalysisRun | null;
    /** 运行中从日志解析出的决策信号 */
    decision?: string | null;
    /** 报告目录（形如 E:\TradingAgents\results\reports\<name>） */
    report_dir?: string | null;
}

/** qlib 任务类型：prepare = 更新股票池数据；export = 训练并导出信号 */
export type QlibTask = 'prepare' | 'export';

export interface QlibRunStatus {
    state: string;
    task?: QlibTask | null;
    task_label?: string;
    elapsed?: number | null;
    exit_code?: number | null;
    /** 日志尾部（按行） */
    lines?: string[];
    signals_mtime?: number | null;
    signals_size?: number | null;
    universe?: {
        n_symbols?: number;
        skipped?: unknown[];
        generated_at?: string;
        universe_file?: string;
    };
}

// ── 底层请求 ──────────────────────────────────────────────

export class QuantApiError extends Error {
    constructor(
        message: string,
        readonly path: string,
        readonly status?: number,
    ) {
        super(message);
        this.name = 'QuantApiError';
    }
}

async function request<T>(
    path: string,
    init: RequestInit = {},
    revalidate = 20,
): Promise<T> {
    const url = `${BASE}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            ...init,
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
            // 该数据由本地流水线每日更新，缓存 20 秒足以挡住连续刷新
            next: { revalidate },
        } as RequestInit);
        if (!res.ok) {
            throw new QuantApiError(
                `HTTP ${res.status} ${res.statusText}`,
                path,
                res.status,
            );
        }
        return (await res.json()) as T;
    } catch (err) {
        if (err instanceof QuantApiError) throw err;
        const msg =
            err instanceof Error && err.name === 'AbortError'
                ? `请求超时（${TIMEOUT_MS}ms）`
                : err instanceof Error
                    ? err.message
                    : String(err);
        throw new QuantApiError(msg, path);
    } finally {
        clearTimeout(timer);
    }
}

/** 永不抛错的版本：供页面直接渲染，失败时返回 null 并把原因交给调用方展示 */
export async function safeRequest<T>(
    path: string,
    init?: RequestInit,
    revalidate?: number,
): Promise<{ data: T | null; error: string | null }> {
    try {
        return { data: await request<T>(path, init, revalidate), error: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[quant-api] ${path} 失败: ${message}`);
        return { data: null, error: `${message}（${path}）` };
    }
}

export const quantApi = {
    base: BASE,

    getSignals: () => request<QuantSignals>('/api/quant/signals'),
    getUniverse: () => request<QuantUniverse>('/api/qlib/universe'),
    getSignal: (ticker: string) =>
        request<QlibSignal>(`/api/qlib/signal?ticker=${encodeURIComponent(ticker)}`),
    getDecisions: (limit = 12) =>
        request<DecisionsResponse>(`/api/quant/decisions?limit=${limit}`),
    getProgress: (taskId?: string) =>
        request<QuantProgress>(
            `/api/quant/progress${taskId ? `?task_id=${encodeURIComponent(taskId)}` : ''}`,
            {},
            20,
        ),
    getAnalysisStatus: (runId?: string) =>
        request<AnalysisStatus>(
            `/api/analysis/status${runId ? `?run_id=${encodeURIComponent(runId)}` : ''}`,
            {},
            0,
        ),
    getAnalysisLogs: (runId?: string, tailKb = 32) =>
        request<{ log?: string; text?: string; [k: string]: unknown }>(
            `/api/analysis/logs?tail_kb=${tailKb}${runId ? `&run_id=${encodeURIComponent(runId)}` : ''}`,
            {},
            0,
        ),
    getHealth: () =>
        request<Record<string, unknown>>('/api/health', {}, 10),

    startAnalysis: (payload: Record<string, unknown>) =>
        request<Record<string, unknown>>(
            '/api/analysis/start',
            { method: 'POST', body: JSON.stringify(payload) },
            0,
        ),
    stopAnalysis: (payload: Record<string, unknown> = {}) =>
        request<Record<string, unknown>>(
            '/api/analysis/stop',
            { method: 'POST', body: JSON.stringify(payload) },
            0,
        ),

    // ── qlib 任务（股票池数据更新 / 训练导出）────────────────
    startQlibRun: (task: QlibTask) =>
        request<Record<string, unknown>>(
            `/api/qlib/run?task=${encodeURIComponent(task)}`,
            { method: 'POST', body: '{}' },
            0,
        ),
    stopQlibRun: () =>
        request<Record<string, unknown>>(
            '/api/qlib/run/stop',
            { method: 'POST', body: '{}' },
            0,
        ),
    getQlibRunStatus: (tailKb = 24) =>
        request<QlibRunStatus>(`/api/qlib/run/status?tail_kb=${tailKb}`, {}, 0),
};
