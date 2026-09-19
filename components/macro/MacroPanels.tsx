'use client';

import { useMemo, useState } from 'react';
import { LineChart } from '@/components/charts/SvgCharts';
import type { MacroSeries } from '@/lib/actions/macro.actions';

/** 涨跌语义色（chrome 单色，仅数据着色） */
const UP = '#35d07f';
const DOWN = '#e5484d';

/** 可选时间范围（天）；「全部」= 不裁剪 */
const RANGES: { label: string; days: number }[] = [
    { label: '3月', days: 90 },
    { label: '1年', days: 365 },
    { label: '3年', days: 365 * 3 },
    { label: '5年', days: 365 * 5 },
    { label: '10年', days: 365 * 10 },
    { label: '全部', days: Infinity },
];
const DEFAULT_RANGE = 365;

function fmtValue(v: number, unit: string): string {
    const abs = Math.abs(v);
    if (unit === '%') return `${v.toFixed(2)}%`;
    if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (abs >= 1e4) return `${(v / 1e3).toFixed(1)}K`;
    if (abs >= 100) return v.toFixed(0);
    return v.toFixed(2);
}

function MacroCard({ s }: { s: MacroSeries }) {
    const [days, setDays] = useState(DEFAULT_RANGE);
    const pts = useMemo(() => {
        if (!Number.isFinite(days)) return s.points;
        const cutoff = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
        const cut = s.points.filter((p) => p.date >= cutoff);
        return cut.length >= 2 ? cut : s.points;
    }, [s.points, days]);

    const latest = s.latest;
    const prev = s.prev;
    const delta = latest && prev ? latest.value - prev.value : null;

    return (
        <section className="rounded-2xl border border-gray-800 bg-gray-950/40 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-gray-200">
                        <a
                            href={`https://www.tradingview.com/symbols/FRED-${s.id}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="在 TradingView 查看"
                            className="hover:text-white hover:underline underline-offset-4"
                        >
                            {s.label}
                        </a>
                    </h3>
                    <span className="text-[11px] text-gray-600">FRED · {s.id}</span>
                </div>
                <div className="text-right">
                    <p className="font-mono text-xl text-white">
                        {latest ? fmtValue(latest.value, s.unit) : '—'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                        {latest?.date ?? ''}
                        {delta !== null ? (
                            <span className="ml-1" style={{ color: delta >= 0 ? UP : DOWN }}>
                                {delta >= 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(2)}
                            </span>
                        ) : null}
                    </p>
                </div>
            </div>

            {s.error ? (
                <p className="mt-3 text-sm text-rose-400">{s.error}</p>
            ) : pts.length >= 2 ? (
                <>
                    <div className="mt-3">
                        <LineChart
                            points={pts}
                            fmt={(v) => fmtValue(v, s.unit)}
                            color={delta !== null && delta < 0 ? DOWN : UP}
                        />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                        {RANGES.map((r) => (
                            <button
                                key={r.label}
                                type="button"
                                onClick={() => setDays(r.days)}
                                className={`rounded-md px-2 py-0.5 text-[11px] transition-colors ${
                                    days === r.days
                                        ? 'bg-white/10 text-white'
                                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <p className="mt-3 text-sm text-gray-500">暂无数据</p>
            )}
        </section>
    );
}

/** 宏观面板：按类别分组，每卡独立时间范围 */
export function MacroPanels({ series }: { series: MacroSeries[] }) {
    const cats = useMemo(() => {
        const order: string[] = [];
        const map = new Map<string, MacroSeries[]>();
        for (const s of series) {
            if (!map.has(s.category)) {
                map.set(s.category, []);
                order.push(s.category);
            }
            map.get(s.category)!.push(s);
        }
        return order.map((c) => ({ name: c, items: map.get(c)! }));
    }, [series]);

    return (
        <div className="space-y-8">
            {cats.map((c) => (
                <section key={c.name}>
                    <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-400">
                        {c.name}
                        <span className="ml-2 text-xs font-normal text-gray-600">{c.items.length} 项</span>
                    </h2>
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {c.items.map((s) => <MacroCard key={s.id} s={s} />)}
                    </div>
                </section>
            ))}
        </div>
    );
}
