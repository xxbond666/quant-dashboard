'use client';

import { useMemo, useState } from 'react';
import type { QuantSignalRow } from '@/lib/quant/api';
import { stanceStyle, stanceLabel } from '@/components/quant/QuantPanels';
import { translate, type Locale, type MessageKey } from '@/lib/i18n/messages';

function Delta({ value }: { value?: number | null }) {
    if (value === undefined || value === null || value === 0) {
        return <span className="font-mono text-xs text-muted-foreground">—</span>;
    }
    const up = value > 0; // 名次上升（delta > 0）为改善
    return (
        <span className={`font-mono text-xs ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
            {up ? '↑' : '↓'}
            {Math.abs(value)}
        </span>
    );
}

/**
 * 全池密集排名表。
 *
 * 刻意保持「表格密度」而不做成卡片：这是每天真正盯的视图（79 行 + 强度 + 历史分位），
 * 卡片化会显著降低信息密度。
 */
export function SignalTable({
    rows,
    locale = 'zh',
}: {
    rows: QuantSignalRow[];
    locale?: Locale;
}) {
    const t = (k: MessageKey, v?: Record<string, string | number>) => translate(locale, k, v);
    // 股池专属搜索：本地过滤，零网络
    const [q, setQ] = useState('');
    const filtered = useMemo(() => {
        const key = q.trim().toUpperCase();
        if (!key) return rows;
        return rows.filter((r) => r.symbol.includes(key));
    }, [rows, q]);

    if (!rows.length) {
        return (
            <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                {t('quant.noData')}
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <h3 className="text-sm font-semibold text-foreground">{t('quant.allPool')}</h3>
                <div className="flex items-center gap-3">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={locale === 'zh' ? '股池内搜索代码…' : 'Filter pool by symbol…'}
                        aria-label={locale === 'zh' ? '股池内搜索' : 'Filter pool'}
                        className="h-8 w-44 rounded-full border border-white/10 bg-white/[0.04] px-3.5 font-mono text-xs text-foreground outline-none transition-all placeholder:text-gray-500 focus:w-56 focus:border-white/30"
                    />
                    <span className="text-xs text-muted-foreground">
                        {q.trim()
                            ? `${filtered.length} / ${rows.length}`
                            : t('quant.allPoolSub', { n: rows.length })}
                    </span>
                </div>
            </div>
            <div className="overflow-x-auto">
                {filtered.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                        {locale === 'zh' ? `股池内没有匹配「${q.trim()}」的标的` : `No pool symbol matches "${q.trim()}"`}
                    </p>
                ) : null}
                <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                            <th className="w-12 px-3 py-2 text-right">{t('quant.rank')}</th>
                            <th className="w-24 px-3 py-2">{t('quant.symbol')}</th>
                            <th className="w-20 px-3 py-2">{t('quant.stance')}</th>
                            <th className="px-3 py-2">{t('quant.strength')}</th>
                            <th className="w-24 px-3 py-2 text-right">{t('quant.score')}</th>
                            <th className="w-24 px-3 py-2 text-right">{t('quant.selfPct')}</th>
                            <th className="w-16 px-3 py-2 text-right">{t('quant.vsLast')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r) => {
                            const s = stanceStyle(r.stance);
                            const pct = Math.max(0, Math.min(1, r.rank_pct));
                            return (
                                <tr
                                    key={r.symbol}
                                    className="border-b border-border/60 last:border-0 hover:bg-accent/40"
                                >
                                    <td className="px-3 py-1.5 text-right font-mono text-xs text-muted-foreground">
                                        {r.rank ?? '—'}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <a
                                            href={`/stocks/${r.symbol}`}
                                            className="font-mono font-semibold text-foreground hover:text-teal-400"
                                        >
                                            {r.symbol}
                                        </a>
                                    </td>
                                    <td className={`px-3 py-1.5 text-xs ${s.text}`}>
                                        {stanceLabel(r, locale)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-28 shrink-0 rounded-full bg-card">
                                                <div
                                                    className={`h-1.5 rounded-full ${s.bar}`}
                                                    style={{ width: `${pct * 100}%` }}
                                                />
                                            </div>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {r.rank_pct_display}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-mono text-xs text-foreground/90">
                                        {r.score >= 0 ? '+' : ''}
                                        {r.score.toFixed(5)}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-mono text-xs text-muted-foreground">
                                        {r.self_pct === null || r.self_pct === undefined
                                            ? '—'
                                            : `${(r.self_pct * 100).toFixed(1)}%`}
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                        <Delta value={r.rank_delta} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
