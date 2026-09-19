'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    startAnalysisAction,
    stopAnalysisAction,
    pollAnalysisAction,
    fetchAnalysisLogsAction,
} from '@/lib/actions/analysis.actions';
import { translate, type Locale, type MessageKey } from '@/lib/i18n/messages';

interface StageStep {
    label: string;
    done: boolean;
    chars?: number;
    elapsed_sec?: number;
}
interface Stage {
    key: string;
    title: string;
    detail?: string;
    steps?: StageStep[];
}
interface ProgressData {
    found?: boolean;
    status?: string;
    symbol?: string;
    progress_pct?: number;
    current_label?: string;
    current_activity?: string;
    elapsed_sec?: number;
    completed_steps?: number;
    stages?: Stage[];
    fatal?: string | null;
}
interface StatusData {
    state?: string;
    decision?: string | null;
    /** 完成后后端给出的报告目录（形如 E:\...\reports\NVDA_20260903_...） */
    report_dir?: string | null;
}

const POLL_MS = 4000;

export default function AnalysisConsole({
    quickPicks,
    defaultTicker,
    locale,
    reportsDir,
    initialProgress = null,
    initialStatus = null,
}: {
    quickPicks: string[];
    defaultTicker: string;
    locale: Locale;
    reportsDir: string;
    initialProgress?: Record<string, unknown> | null;
    initialStatus?: Record<string, unknown> | null;
}) {
    const t = useCallback(
        (k: MessageKey, v?: Record<string, string | number>) => translate(locale, k, v),
        [locale],
    );

    const [ticker, setTicker] = useState(defaultTicker);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
    // 服务端预取的初始状态：避免首屏先闪"暂无运行记录"再被轮询覆盖
    const [progress, setProgress] = useState<ProgressData | null>(
        (initialProgress as ProgressData | null) ?? null,
    );
    const [status, setStatus] = useState<StatusData | null>(
        (initialStatus as StatusData | null) ?? null,
    );
    const [logs, setLogs] = useState<string>('');
    const [showLogs, setShowLogs] = useState(false);
    // 默认折叠"上次运行"的完整阶段时间线：避免把旧进度误当成当前进度
    const [showLastDetail, setShowLastDetail] = useState(false);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);

    const poll = useCallback(async () => {
        const res = await pollAnalysisAction();
        if (!res.ok) {
            setMsg({ kind: 'err', text: res.error ?? 'poll failed' });
            return;
        }
        const { status: s, progress: p } = res.data as {
            status: StatusData;
            progress: ProgressData | null;
        };
        setStatus(s ?? null);
        setProgress(p ?? null);
    }, []);

    useEffect(() => {
        poll();
        timer.current = setInterval(poll, POLL_MS);
        return () => {
            if (timer.current) clearInterval(timer.current);
        };
    }, [poll]);

    const running =
        status?.state === 'running' ||
        progress?.status === 'running' ||
        progress?.status === 'pending';

    const onStart = async () => {
        setBusy(true);
        setMsg(null);
        const res = await startAnalysisAction(ticker);
        setMsg(
            res.ok
                ? { kind: 'ok', text: t('analysis.startedOk', { symbol: ticker.toUpperCase() }) }
                : { kind: 'err', text: res.error ?? 'error' },
        );
        setBusy(false);
        poll();
    };

    const onStop = async () => {
        setBusy(true);
        const res = await stopAnalysisAction();
        setMsg(
            res.ok
                ? { kind: 'ok', text: t('analysis.stoppedOk') }
                : { kind: 'err', text: res.error ?? 'error' },
        );
        setBusy(false);
        poll();
    };

    const onLoadLogs = async () => {
        const res = await fetchAnalysisLogsAction(undefined, 24);
        setLogs(res.ok ? (res.data ?? '') : (res.error ?? ''));
        setShowLogs(true);
    };

    const pct = Math.max(0, Math.min(100, progress?.progress_pct ?? 0));
    const stages = progress?.stages ?? [];
    // 运行结束后的报告目录 → /api/report/{name} 直开 PDF
    const reportName = status?.report_dir
        ? status.report_dir.split(/[\\/]/).filter(Boolean).pop() ?? ''
        : '';
    const zh = locale === 'zh';

    // 阶段状态推导：让时间线一眼看出“进行到哪一步”
    // done=有步骤且全部完成；running=有未完成步骤，或（运行中时）第一个尚未产出步骤的阶段；waiting=其余
    const stageViews = (() => {
        const list = stages.map((st) => {
            const steps = st.steps ?? [];
            const doneN = steps.filter((s) => s.done).length;
            const secs = Math.round(steps.reduce((a, s) => a + (s.elapsed_sec ?? 0), 0));
            return { st, steps, doneN, secs };
        });
        const status: ('done' | 'running' | 'waiting')[] = list.map((x) =>
            x.steps.length > 0 && x.doneN === x.steps.length
                ? 'done'
                : x.steps.length > 0
                  ? 'running'
                  : 'waiting',
        );
        if (running && !status.includes('running')) {
            let ri = status.findIndex((s, i) => s === 'waiting' && (i === 0 || status[i - 1] === 'done'));
            if (ri < 0) ri = status.length - 1;
            if (ri >= 0) status[ri] = 'running';
        }
        // 当前步：优先用后端 current_label 对齐，否则取进行中阶段第一个未完成步
        const labelByStage = new Map<number, string>();
        status.forEach((s, i) => {
            if (s !== 'running') return;
            const hit = list[i].steps.find((x) => !x.done);
            const cur = (progress?.current_label && list[i].steps.some((x) => x.label === progress.current_label)
                ? progress.current_label
                : hit?.label) ?? null;
            if (cur) labelByStage.set(i, cur);
        });
        return list.map((x, i) => ({ ...x, status: status[i], curLabel: labelByStage.get(i) ?? null }));
    })();

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1">
                        <label
                            htmlFor="ticker"
                            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                        >
                            {t('analysis.ticker')}
                        </label>
                        <input
                            id="ticker"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !running && !busy) onStart();
                            }}
                            placeholder={t('analysis.tickerPlaceholder')}
                            className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-lg text-foreground outline-none focus:border-teal-500/60"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onStart}
                            disabled={busy || running}
                            className="rounded-lg bg-teal-500 px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {running ? t('analysis.running') : t('analysis.start')}
                        </button>
                        <button
                            onClick={onStop}
                            disabled={busy || !running}
                            className="rounded-lg border border-border px-5 py-2 text-sm text-foreground/90 transition-colors hover:border-rose-500/60 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {t('analysis.stop')}
                        </button>
                    </div>
                </div>

                {quickPicks.length > 0 ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            {t('analysis.quickPicks', { n: quickPicks.length })}
                        </span>
                        {quickPicks.map((s) => (
                            <button
                                key={s}
                                onClick={() => setTicker(s)}
                                className="rounded-full border border-border px-3 py-1 font-mono text-xs text-foreground/90 hover:border-teal-500/60 hover:text-teal-400"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                ) : null}

                {msg ? (
                    <p
                        className={`mt-4 text-sm ${
                            msg.kind === 'ok' ? 'text-teal-400' : 'text-rose-400'
                        }`}
                    >
                        {msg.text}
                    </p>
                ) : null}

                <p className="mt-3 text-xs text-muted-foreground">
                    {t('analysis.hint', { dir: reportsDir })}
                </p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                        {t('analysis.progress')}
                        {progress?.symbol ? (
                            <span className="ml-2 font-mono text-teal-400">{progress.symbol}</span>
                        ) : null}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {progress?.elapsed_sec ? (
                            <span>{t('analysis.elapsed', { n: Math.round(progress.elapsed_sec) })}</span>
                        ) : null}
                        {progress?.completed_steps !== undefined ? (
                            <span>{t('analysis.steps', { n: progress.completed_steps })}</span>
                        ) : null}
                        {status?.decision ? (
                            <span className="text-teal-400">
                                {t('analysis.decision', { v: status.decision })}
                            </span>
                        ) : null}
                        <button onClick={onLoadLogs} className="hover:text-teal-400">
                            {t('analysis.viewLogs')}
                        </button>
                        {!running && reportName ? (
                            <a
                                href={`/api/report/${encodeURIComponent(reportName)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-teal-500 px-3 py-1 font-semibold text-black transition-colors hover:bg-teal-400"
                            >
                                {zh ? '打开本次报告' : 'Open report'}
                            </a>
                        ) : null}
                    </div>
                </div>

                {!progress?.found ? (
                    <p className="mt-3 text-sm text-muted-foreground">{t('analysis.noRun')}</p>
                ) : !running && !showLastDetail ? (
                    // 不在运行时不再摊开上一次的完整阶段时间线，只留一行摘要，避免"遗留进度"的错觉
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>
                            {t('analysis.lastRun', {
                                symbol: progress.symbol ?? '',
                                status: progress.status ?? '',
                                n: Math.round(progress.elapsed_sec ?? 0),
                            })}
                        </span>
                        <button
                            onClick={() => setShowLastDetail(true)}
                            className="hover:text-teal-500"
                        >
                            {t('analysis.showLastDetail')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mt-4">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-card">
                                <div
                                    className="h-2 rounded-full bg-teal-500 transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                                <span>{progress.current_label ?? '—'}</span>
                                <span className="font-mono">{pct}%</span>
                            </div>
                            {progress.current_activity ? (
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {progress.current_activity}
                                </p>
                            ) : null}
                        </div>

                        {progress.fatal ? (
                            <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
                                {progress.fatal}
                            </p>
                        ) : null}

                        <div className="mt-5 space-y-3">
                            {stageViews.map((sv, i) => (
                                <div
                                    key={sv.st.key}
                                    className={`rounded-xl border p-3 transition-colors ${
                                        sv.status === 'running'
                                            ? 'border-teal-500/50 bg-teal-500/[0.06]'
                                            : sv.status === 'done'
                                              ? 'border-emerald-500/25'
                                              : 'border-border opacity-55'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                                sv.status === 'done'
                                                    ? 'bg-emerald-500/15 text-emerald-400'
                                                    : sv.status === 'running'
                                                      ? 'bg-teal-500/15 text-teal-400'
                                                      : 'bg-muted/20 text-muted-foreground'
                                            }`}
                                        >
                                            {sv.status === 'done' ? '✓' : i + 1}
                                        </span>
                                        <p className="text-xs font-semibold text-foreground/90">{sv.st.title}</p>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                                                sv.status === 'running'
                                                    ? 'bg-teal-500/15 text-teal-400'
                                                    : sv.status === 'done'
                                                      ? 'bg-emerald-500/10 text-emerald-500'
                                                      : 'bg-muted/10 text-muted-foreground'
                                            }`}
                                        >
                                            {sv.status === 'running' ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
                                                    {zh ? '进行中' : 'running'}
                                                </span>
                                            ) : sv.status === 'done'
                                                ? (zh ? '已完成' : 'done')
                                                : (zh ? '待执行' : 'waiting')}
                                        </span>
                                        <span className="ml-auto font-mono text-[11px] text-muted-foreground/80">
                                            {sv.doneN}/{sv.steps.length || '—'}
                                            {sv.secs ? ` · ${sv.secs}s` : ''}
                                        </span>
                                    </div>
                                    {sv.st.detail ? (
                                        <p className="mt-0.5 pl-7 text-[11px] text-muted-foreground">{sv.st.detail}</p>
                                    ) : null}
                                    {sv.steps.length ? (
                                        <ul className="mt-2 space-y-1 pl-7">
                                            {sv.steps.map((step) => {
                                                const isCur = sv.status === 'running' && step.label === sv.curLabel && !step.done;
                                                return (
                                                    <li key={step.label} className="flex flex-wrap items-center gap-2 text-xs">
                                                        <span
                                                            className={
                                                                step.done
                                                                    ? 'text-teal-400'
                                                                    : isCur
                                                                      ? 'animate-pulse text-teal-300'
                                                                      : 'text-muted-foreground/70'
                                                            }
                                                        >
                                                            {step.done ? '●' : isCur ? '▶' : '○'}
                                                        </span>
                                                        <span
                                                            className={
                                                                step.done
                                                                    ? 'text-foreground/90'
                                                                    : isCur
                                                                      ? 'font-semibold text-teal-300'
                                                                      : 'text-muted-foreground'
                                                            }
                                                        >
                                                            {step.label}
                                                            {isCur && zh ? '（正在运行…）' : ''}
                                                        </span>
                                                        {step.elapsed_sec ? (
                                                            <span className="font-mono text-[11px] text-muted-foreground/70">
                                                                {Math.round(step.elapsed_sec)}s
                                                            </span>
                                                        ) : null}
                                                        {step.chars ? (
                                                            <span className="font-mono text-[11px] text-muted-foreground/70">
                                                                {step.chars}
                                                            </span>
                                                        ) : null}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : sv.status === 'running' ? (
                                        <p className="mt-1.5 pl-7 text-[11px] text-teal-400/80">
                                            {progress?.current_activity
                                                ? `${zh ? '正在执行' : 'running'}：${progress.current_activity}`
                                                : (zh ? '阶段已启动，等待子步骤上报…' : 'stage started, waiting for steps…')}
                                        </p>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            {showLogs ? (
                <section className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                            {t('analysis.logs')}
                        </h3>
                        <button
                            onClick={() => setShowLogs(false)}
                            className="text-xs text-muted-foreground hover:text-foreground/90"
                        >
                            {t('tools.hideLog')}
                        </button>
                    </div>
                    <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {logs || t('tools.logEmpty')}
                    </pre>
                </section>
            ) : null}
        </div>
    );
}
