'use server';

import { quantApi, QuantApiError, type QlibRunStatus, type QlibTask } from '@/lib/quant/api';
import { readUniverse, addUniverseSymbol, type AddResult, type UniverseState } from '@/lib/actions/universe.actions';

export interface QlibActionResult<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}

function toError(err: unknown): string {
    if (err instanceof QuantApiError) return `${err.message}（${err.path}）`;
    return err instanceof Error ? err.message : String(err);
}

/** 启动 qlib 任务：prepare=更新股票池数据，export=训练并导出信号 */
export async function startQlibRunAction(task: QlibTask): Promise<QlibActionResult> {
    if (task !== 'prepare' && task !== 'export') {
        return { ok: false, error: `未知任务类型：${task}` };
    }
    try {
        return { ok: true, data: await quantApi.startQlibRun(task) };
    } catch (err) {
        return { ok: false, error: toError(err) };
    }
}

export async function stopQlibRunAction(): Promise<QlibActionResult> {
    try {
        return { ok: true, data: await quantApi.stopQlibRun() };
    } catch (err) {
        return { ok: false, error: toError(err) };
    }
}

export async function qlibRunStatusAction(
    tailKb = 24,
): Promise<QlibActionResult<QlibRunStatus>> {
    try {
        return { ok: true, data: await quantApi.getQlibRunStatus(tailKb) };
    } catch (err) {
        return { ok: false, error: toError(err) };
    }
}

/** 读取股票池（只读，供新增后刷新计数） */
export async function readUniverseAction(): Promise<UniverseState> {
    return readUniverse();
}

/** 新增标的到股票池 */
export async function addUniverseSymbolAction(
    symbol: string,
    section?: string,
): Promise<AddResult> {
    return addUniverseSymbol(symbol, section);
}
