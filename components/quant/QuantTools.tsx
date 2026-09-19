'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    startQlibRunAction,
    stopQlibRunAction,
    qlibRunStatusAction,
    addUniverseSymbolAction,
} from '@/lib/actions/qlib.actions';
import type { MessageKey } from '@/lib/i18n/messages';
import { translate, type Locale } from '@/lib/i18n/messages';

interface RunStatus {
    state?: string;
    task?: string | null;
    task_label?: string;
    elapsed?: number | null;
    exit_code?: number | null;
    lines?: string[];
    universe?: { n_symbols?: number; universe_file?: string };
}

const POLL_MS = 3000;

export default function QuantTools({
    locale,
    count,
    sections,
    universePath,
}: {
    locale: Locale;
    count: number;
    sections: string[];
    universePath: string;
}) {
    const router = useRouter();
    const t = useCallback(
        (key: MessageKey, vars?: Record<string, string | number>) =>
            translate(locale, key, vars),
        [locale],
    );

    const [symbol, setSymbol] = useState('');
    const [section, setSection] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
    const [run, setRun] = useState<RunStatus | null>(null);
    const [showLog, setShowLog] = useState(false);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);

    const poll = useCallback(async () => {
        const res = await qlibRunStatusAction(24);
        if (res.ok && res.data) setRun(res.data as RunStatus);
        return res;
    }, []);

    useEffect(() => {
        poll();
        timer.current = setInterval(poll, POLL_MS);
        return () => {
            if (timer.current) clearInterval(timer.current);
        };
    }, [poll]);

    const running = run?.state === 'running';

    const onAdd = async () => {
        setBusy(true);
        setMsg(null);
        const res = await addUniverseSymbolAction(symbol, section);
        if (res.code === 'added') {
            setMsg({ kind: 'ok', text: t('tools.addOk', { symbol: res.symbol, n: res.count ?? 0 }) });
            setSymbol('');
            router.refresh();
        } else if (res.code === 'duplicate') {
            setMsg({ kind: 'err', text: t('tools.addDup', { symbol: res.symbol }) });
        } else if (res.code === 'invalid') {
            setMsg({ kind: 'err', text: t('tools.addBad', { symbol: res.symbol || symbol }) });
        } else {
            setMsg({ kind: 'err', text: res.error ?? 'error' });
        }
        setBusy(false);
    };

    const onRun = async (task: 'prepare' | 'export') => {
        setBusy(true);
        setMsg(null);
        const res = await startQlibRunAction(task);
        if (!res.ok) setMsg({ kind: 'err', text: res.error ?? 'error' });
        else setShowLog(true);
        setBusy(false);
        poll();
    };

    const onStop = async () => {
        setBusy(true);
        const res = await stopQlibRunAction();
        if (!res.ok) setMsg({ kind: 'err', text: res.error ?? 'error' });
        setBusy(false);
        poll();
    };

    // 任务从运行 → 结束时刷新页面数据（信号/排名会变）
    const prevState = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (prevState.current === 'running' && run?.state && run.state !== 'running') {
            router.refresh();
        }
        prevState.current = run?.state;
    }, [run?.state, router]);

    const logText = (run?.lines ?? []).join('\n');

    return (
        <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{t('tools.title')}</h3>
                <span className="text-xs text-muted-foreground">
                    {t('tools.universeCount', { n: run?.universe?.n_symbols ?? count })}
                </span>
            </div>

            {/* 新增股票 */}
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                <div>
                    <label
                        htmlFor="new-symbol"
                        className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                    >
                        {t('tools.addStock')}
                    </label>
                    <input
                        id="new-symbol"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !busy) onAdd();
                        }}
                        placeholder={t('tools.addPlaceholder')}
                        className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-teal-500/60"
                    />
                </div>
                <div>
                    <label
                        htmlFor="new-section"
                        className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                    >
                        {t('tools.addSection')}
                    </label>
                    <input
                        id="new-section"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        list="universe-sections"
                        placeholder={t('tools.addSectionPlaceholder')}
                        className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-teal-500/60"
                    />
                    <datalist id="universe-sections">
                        {sections.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={onAdd}
                        disabled={busy || !symbol.trim()}
                        className="h-[38px] rounded-lg bg-teal-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {t('tools.add')}
                    </button>
                </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t('tools.addHint')}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">{universePath}</p>

            {/* 更新数据 / 训练导出 */}
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <button
                    onClick={() => onRun('prepare')}
                    disabled={busy || running}
                    className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {t('tools.updateData')}
                </button>
                <span className="hidden text-xs text-muted-foreground lg:inline">
                    {t('tools.updateDataHint')}
                </span>
                <button
                    onClick={() => onRun('export')}
                    disabled={busy || running}
                    className="rounded-lg border border-teal-500/60 px-4 py-2 text-sm font-medium text-teal-400 transition-colors hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {t('tools.trainExport')}
                </button>
                <span className="hidden text-xs text-muted-foreground lg:inline">
                    {t('tools.trainExportHint')}
                </span>
                <button
                    onClick={onStop}
                    disabled={busy || !running}
                    className="ml-auto rounded-lg border border-border px-4 py-2 text-sm text-foreground/90 transition-colors hover:border-rose-500/60 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {t('tools.stop')}
                </button>
            </div>

            {/* 任务状态 */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {running ? (
                    <span className="text-teal-400">
                        {t('tools.taskRunning', { task: run?.task_label || run?.task || '' })}
                    </span>
                ) : (
                    <span className="text-muted-foreground">{t('tools.taskIdle')}</span>
                )}
                {run?.elapsed != null && running ? (
                    <span className="text-muted-foreground">{Math.round(run.elapsed)}s</span>
                ) : null}
                {!running && run?.exit_code != null ? (
                    <span className={run.exit_code === 0 ? 'text-muted-foreground' : 'text-rose-400'}>
                        exit={run.exit_code}
                    </span>
                ) : null}
                <button
                    onClick={() => setShowLog((v) => !v)}
                    className="ml-auto text-muted-foreground hover:text-teal-400"
                >
                    {showLog ? t('tools.hideLog') : t('tools.viewLog')}
                </button>
            </div>

            {showLog ? (
                <pre className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {logText || t('tools.logEmpty')}
                </pre>
            ) : null}

            {msg ? (
                <p
                    className={`mt-3 text-sm ${
                        msg.kind === 'ok' ? 'text-teal-400' : 'text-rose-400'
                    }`}
                >
                    {msg.text}
                </p>
            ) : null}
        </section>
    );
}
