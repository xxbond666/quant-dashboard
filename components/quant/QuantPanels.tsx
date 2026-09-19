import type { QuantSignals, QuantSignalRow } from '@/lib/quant/api';
import { translate, type Locale, type MessageKey } from '@/lib/i18n/messages';

const STANCE_STYLE: Record<string, { text: string; border: string; bg: string; bar: string }> = {
    // 看多 = 绿，看空 = 红（按你的要求）
    bullish: {
        text: 'text-emerald-500',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/10',
        bar: 'bg-emerald-500',
    },
    bearish: {
        text: 'text-rose-500',
        border: 'border-rose-500/40',
        bg: 'bg-rose-500/10',
        bar: 'bg-rose-500',
    },
    neutral: {
        text: 'text-muted-foreground',
        border: 'border-border',
        bg: 'bg-muted/40',
        bar: 'bg-accent',
    },
};

export const stanceStyle = (stance: string) => STANCE_STYLE[stance] ?? STANCE_STYLE.neutral;

/** 立场本地化：接口给的是中文 stance_zh，英文界面下换成 bullish/neutral/bearish */
export function stanceLabel(row: { stance: string; stance_zh?: string }, locale: Locale): string {
    if (locale === 'zh') return row.stance_zh ?? row.stance;
    const key: MessageKey =
        row.stance === 'bullish'
            ? 'quant.bullish'
            : row.stance === 'bearish'
                ? 'quant.bearish'
                : 'quant.neutral';
    return translate('en', key);
}

/** 模型状态卡：模型名 / 数据截至 / 池子构成 / IC 评估 */
export function ModelStatusCard({
    signals,
    locale = 'zh',
}: {
    signals: QuantSignals;
    locale?: Locale;
}) {
    const t = (k: MessageKey, v?: Record<string, string | number>) => translate(locale, k, v);
    const dist = signals.stance_distribution ?? {};
    const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
    const order = ['看多', '中性', '看空'] as const;
    const distColor: Record<string, string> = {
        看多: 'bg-emerald-500',
        中性: 'bg-accent',
        看空: 'bg-rose-500',
    };
    const distKey: Record<string, MessageKey> = {
        看多: 'quant.bullish',
        中性: 'quant.neutral',
        看空: 'quant.bearish',
    };
    const stale = signals.stale_days ?? 0;

    return (
        <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Quant Model
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">{signals.model}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>
                            {t('common.asOf')}{' '}
                            <span className="font-mono text-foreground">{signals.asof}</span>
                        </span>
                        <span className="font-mono">{signals.universe_size}</span>
                        {signals.generated_at ? (
                            <span className="text-muted-foreground">
                                {signals.generated_at.slice(0, 16).replace('T', ' ')}
                            </span>
                        ) : null}
                    </div>
                    {signals.ic_verdict ? (
                        <p className="max-w-2xl text-sm text-muted-foreground">{signals.ic_verdict}</p>
                    ) : null}
                </div>

                <div className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-border bg-muted/40 p-4 lg:w-[320px]">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            {t('quant.rankIC')}
                        </p>
                        <p className="mt-1 font-mono text-lg text-foreground">
                            {signals.test_rank_ic_mean?.toFixed(4) ?? '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            {t('quant.ir')}
                        </p>
                        <p className="mt-1 font-mono text-lg text-foreground">
                            {signals.test_rank_ic_ir?.toFixed(4) ?? '—'}
                        </p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            {t('quant.distribution')}
                        </p>
                        <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-card">
                            {order.map((k) =>
                                dist[k] ? (
                                    <div
                                        key={k}
                                        className={distColor[k]}
                                        style={{ width: `${(dist[k] / total) * 100}%` }}
                                        title={`${k} ${dist[k]}`}
                                    />
                                ) : null,
                            )}
                        </div>
                        <div className="mt-2 flex justify-between text-xs">
                            {order.map((k) => (
                                <span key={k} className="text-muted-foreground">
                                    {t(distKey[k])}{' '}
                                    <span className="font-mono text-foreground">{dist[k] ?? 0}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
                <span
                    className={`rounded-full border px-3 py-1 ${
                        signals.usable
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    }`}
                >
                    {signals.usable ? t('quant.usable') : t('quant.unusable')}
                </span>
                <span
                    className={`rounded-full border px-3 py-1 ${
                        stale <= 1
                            ? 'border-border text-muted-foreground'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    }`}
                >
                    {t('common.stale', { n: stale })}
                </span>
                <span className="text-muted-foreground">{t('quant.offlineNote')}</span>
            </div>
        </section>
    );
}

function LeaderRow({
    row,
    rank,
    locale,
}: {
    row: QuantSignalRow;
    rank: number;
    locale: Locale;
}) {
    const s = stanceStyle(row.stance);
    return (
        <li className="flex gap-3 py-2">
            <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground">{rank}</span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <a
                        href={`/stocks/${row.symbol}`}
                        className="font-mono text-sm font-semibold text-foreground hover:text-teal-400"
                    >
                        {row.symbol}
                    </a>
                    <span className={`text-xs ${s.text}`}>{stanceLabel(row, locale)}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {row.score >= 0 ? '+' : ''}
                        {row.score.toFixed(4)}
                    </span>
                </div>
                <div className="mt-1.5 h-1 w-full rounded-full bg-card">
                    <div
                        className={`h-1 rounded-full ${s.bar}`}
                        style={{ width: `${Math.max(2, row.rank_pct * 100)}%` }}
                    />
                </div>
                {locale === 'zh' && row.advice ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.advice}</p>
                ) : null}
            </div>
        </li>
    );
}

/** 看多榜 / 看空榜 */
export function LeaderPanels({
    bullish = [],
    bearish = [],
    locale = 'zh',
}: {
    bullish?: QuantSignalRow[];
    bearish?: QuantSignalRow[];
    locale?: Locale;
}) {
    const t = (k: MessageKey, v?: Record<string, string | number>) => translate(locale, k, v);
    const panels = [
        { title: t('quant.bullishBoard'), rows: bullish, style: stanceStyle('bullish') },
        { title: t('quant.bearishBoard'), rows: bearish, style: stanceStyle('bearish') },
    ];
    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {panels.map((p) => (
                <section
                    key={p.title}
                    className={`rounded-2xl border p-5 ${p.style.border} ${p.style.bg}`}
                >
                    <h3 className={`text-sm font-semibold ${p.style.text}`}>
                        {p.title}{' '}
                        <span className="ml-1 font-normal text-muted-foreground">
                            {t('quant.topN', { n: p.rows.length })}
                        </span>
                    </h3>
                    {p.rows.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">{t('quant.noData')}</p>
                    ) : (
                        <ul className="mt-2 divide-y divide-border">
                            {p.rows.map((r, i) => (
                                <LeaderRow key={r.symbol} row={r} rank={i + 1} locale={locale} />
                            ))}
                        </ul>
                    )}
                </section>
            ))}
        </div>
    );
}
