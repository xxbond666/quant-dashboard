'use server';

import { quantApi, QuantApiError } from '@/lib/quant/api';

export interface ActionResult<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}

function toError(err: unknown): string {
    if (err instanceof QuantApiError) return `${err.message}（${err.path}）`;
    return err instanceof Error ? err.message : String(err);
}

/** 启动单标的 TradingAgents 深度分析 */
export async function startAnalysisAction(
    ticker: string,
    date?: string,
): Promise<ActionResult> {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return { ok: false, error: '请先填写标的代码' };
    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(symbol)) {
        return { ok: false, error: `标的代码格式不合法：${symbol}` };
    }
    try {
        const data = await quantApi.startAnalysis({ ticker: symbol, date });
        return { ok: true, data };
    } catch (err) {
        return { ok: false, error: toError(err) };
    }
}

export async function stopAnalysisAction(runId?: string): Promise<ActionResult> {
    try {
        const data = await quantApi.stopAnalysis(runId ? { run_id: runId } : {});
        return { ok: true, data };
    } catch (err) {
        return { ok: false, error: toError(err) };
    }
}

/** 轮询：运行状态 + 分阶段进度 */
export async function pollAnalysisAction(
    runId?: string,
): Promise<ActionResult<{ status: unknown; progress: unknown }>> {
    try {
        const [status, progress] = await Promise.all([
            quantApi.getAnalysisStatus(runId),
            quantApi.getProgress().catch(() => null),
        ]);
        return { ok: true, data: { status, progress } };
    } catch (err) {
        return { ok: false, error: toError(err) };
    }
}

/** 拉日志尾部（比 SSE 简单可靠，与现有控制台一致的做法） */
export async function fetchAnalysisLogsAction(
    runId?: string,
    tailKb = 24,
): Promise<ActionResult<string>> {
    try {
        const raw = await quantApi.getAnalysisLogs(runId, tailKb);
        const text =
            typeof raw === 'string'
                ? raw
                : typeof raw?.log === 'string'
                    ? raw.log
                    : typeof raw?.text === 'string'
                        ? raw.text
                        : JSON.stringify(raw).slice(0, 20_000);
        return { ok: true, data: text };
    } catch (err) {
        return { ok: false, error: toError(err) };
    }
}
