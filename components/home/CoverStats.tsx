'use client';

import { useEffect, useState } from 'react';
import type { CoverQuote } from '@/lib/cover';

/**
 * 首页封面 = 数据墙（D2 Mono Glass）：一排五格毛玻璃大数字。
 * 首屏数据由服务端注入（SSR/ISR），之后每 60s 客户端轮询 /api/cover 静默刷新，
 * 数字会自己动，无需手动刷新页面。每格可点击 → 新标签打开 TradingView 符号页。
 */

const UP = '#35d07f';
const DOWN = '#e5484d';
const POLL_MS = 60_000;

function fmt(v: number): string {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: v < 10 ? 3 : 2,
        minimumFractionDigits: v < 10 ? 2 : 2,
    }).format(v);
}

export default function CoverStats({ zh, initial }: { zh: boolean; initial: CoverQuote[] }) {
    const [quotes, setQuotes] = useState<CoverQuote[]>(initial);

    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const res = await fetch('/api/cover');
                if (!res.ok) return;
                const j = (await res.json()) as CoverQuote[];
                if (alive && Array.isArray(j) && j.length) setQuotes(j);
            } catch {
                /* 轮询失败保持旧值，下个周期再试 */
            }
        };
        const timer = setInterval(load, POLL_MS);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, []);

    const now = new Date();
    const dateLabel = zh
        ? `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`
        : now.toISOString().slice(0, 10);

    return (
        <section className="glass w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
                    {zh ? '市场封面 · 实时快照 · 点击格子跳转 TradingView' : 'Market Cover · Live · Click a cell for TradingView'}
                </p>
                <p className="font-mono text-[11px] tracking-[0.14em] text-gray-400">{dateLabel}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                {quotes.map((q) => {
                    const up = (q.dp ?? 0) >= 0;
                    return (
                        <a
                            key={q.symbol}
                            href={`https://www.tradingview.com/symbols/${q.tv.replace(':', '-')}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${q.sub} · TradingView`}
                            className={`relative rounded-xl border p-4 hover:border-white/30 hover:bg-white/[0.06] ${
                                q.live
                                    ? 'border-white/25 bg-white/[0.06]'
                                    : 'border-white/[0.07] bg-white/[0.02]'
                            }`}
                        >
                            {q.live ? (
                                <span className="absolute right-3 top-3 flex items-center gap-1 font-mono text-[9px] tracking-[0.2em] text-gray-400">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                    LIVE
                                </span>
                            ) : null}
                            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">
                                {q.label}
                            </p>
                            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-white md:text-[28px]">
                                {q.c != null ? fmt(q.c) : '—'}
                            </p>
                            <p
                                className="mt-1.5 flex items-center gap-1 font-mono text-xs"
                                style={{ color: up ? UP : DOWN }}
                            >
                                <span aria-hidden>{up ? '▲' : '▼'}</span>
                                {q.dp != null ? `${Math.abs(q.dp).toFixed(2)}%` : '--'}
                                <span className="ml-1 text-[11px] font-medium text-gray-400">{q.sub}</span>
                            </p>
                        </a>
                    );
                })}
            </div>
        </section>
    );
}
