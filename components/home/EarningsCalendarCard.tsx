'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Entry {
    symbol: string;
    name: string;
    epsEstimate?: number | null;
    epsActual?: number | null;
    revenueEstimate?: number | null;
    timeOfTheDay?: string;
    reportDate: string;
}
interface Day {
    reportDate: string;
    count: number;
    entries: Entry[];
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

const DOT_COLORS = ['#e8e8e8', '#b9b9c0', '#8e8e96', '#6d6d75', '#4d4d54',
                    '#d6d6db', '#a3a3ab', '#7a7a82', '#5c5c63', '#3d3d43'];

function logoColor(symbol: string): string {
    let h = 0;
    for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
    return DOT_COLORS[h % DOT_COLORS.length];
}

const TIME_LABEL: Record<string, string> = { pre: '盘前', amc: '盘后', noth: '盘中' };

function monthKey(date: string) { return date.slice(0, 7); }

/** 富途式业绩日历：先选月 → 再点有数据的日期 → 看当日业绩（logo + 名称 + 代码） */
export default function EarningsCalendarCard({
    days,
    total,
    poolSymbols,
    error,
}: {
    days: Day[];
    total: number;
    poolSymbols: string[];
    error?: string;
}) {
    const pool = useMemo(() => new Set(poolSymbols.map((s) => s.toUpperCase())), [poolSymbols]);
    const today = new Date().toISOString().slice(0, 10);

    // 日期 → 当日条目（O(1) 查询）
    const dayMap = useMemo(() => {
        const m = new Map<string, Day>();
        for (const d of days) m.set(d.reportDate, d);
        return m;
    }, [days]);

    const months = useMemo(() => {
        const set = new Set(days.map((d) => monthKey(d.reportDate)));
        return [...set].sort();
    }, [days]);

    const firstUpcoming = days.find((d) => d.reportDate >= today)?.reportDate ?? days[0]?.reportDate ?? '';
    const [viewMonth, setViewMonth] = useState(monthKey(firstUpcoming) || monthKey(today));
    const [selected, setSelected] = useState(firstUpcoming);
    const [imgFailed, setImgFailed] = useState<Set<string>>(new Set());

    const monthIdx = months.indexOf(viewMonth);
    const goMonth = (delta: number) => {
        const next = months[monthIdx + delta];
        if (next) setViewMonth(next);
    };

    // 生成月历格子（周对齐）
    const cells = useMemo(() => {
        if (!viewMonth) return [];
        const [yy, mm] = viewMonth.split('-').map(Number);
        const first = new Date(yy, mm - 1, 1);
        const lastDay = new Date(yy, mm, 0).getDate();
        const lead = first.getDay(); // 0=周日
        const out: (string | null)[] = Array(lead).fill(null);
        for (let d = 1; d <= lastDay; d++) {
            out.push(`${viewMonth}-${String(d).padStart(2, '0')}`);
        }
        return out;
    }, [viewMonth]);

    const dayData = selected ? dayMap.get(selected) : undefined;
    const selObj = selected ? new Date(selected + 'T00:00:00') : null;
    const selLabel = selObj
        ? `${selObj.getMonth() + 1}月${selObj.getDate()}日 周${WEEK[selObj.getDay()]}`
        : '';

    const fmtBillion = (v?: number | null) =>
        v !== null && v !== undefined && Number.isFinite(v) ? `${(v / 1e8).toFixed(1)} 亿` : '—';

    return (
        <section className="rounded-2xl border border-gray-800 bg-gray-950/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-200">
                    业绩日历
                    <span className="ml-2 font-normal text-gray-500">
                        未来 3 个月 · 共 {total} 家（美股，自选池优先）· Finnhub
                    </span>
                </h3>
            </div>

            {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

            <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
                {/* 左：月历选日期 */}
                <div>
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => goMonth(-1)}
                            disabled={monthIdx <= 0}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 disabled:opacity-30"
                            aria-label="上一月"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-semibold text-gray-200">
                            {viewMonth.replace('-', ' 年 ')} 月
                        </span>
                        <button
                            type="button"
                            onClick={() => goMonth(1)}
                            disabled={monthIdx < 0 || monthIdx >= months.length - 1}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 disabled:opacity-30"
                            aria-label="下一月"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] text-gray-600">
                        {WEEK.map((w) => <span key={w}>{w}</span>)}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
                        {cells.map((date, i) => {
                            if (!date) return <span key={`blank-${i}`} />;
                            const d = dayMap.get(date);
                            const hasData = !!d?.entries.length;
                            const isSel = date === selected;
                            const isToday = date === today;
                            const hasPool = hasData && d!.entries.some((e) => pool.has(e.symbol));
                            return (
                                <button
                                    key={date}
                                    type="button"
                                    disabled={!hasData}
                                    onClick={() => setSelected(date!)}
                                    className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                                        isSel
                                            ? 'bg-white font-semibold text-black ring-1 ring-white'
                                            : hasData
                                              ? 'text-gray-200 hover:bg-white/5'
                                              : 'cursor-default text-gray-700'
                                    }`}
                                >
                                    <span className={isToday ? 'font-bold' : ''}>{Number(date.slice(8))}</span>
                                    {hasData ? (
                                        <span className="text-[9px] leading-none text-gray-500">
                                            {d!.count}家
                                        </span>
                                    ) : null}
                                    {hasPool ? (
                                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white" />
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-600">
                        灰格为无财报安排 · <span className="text-white">●</span> 含自选池公司
                    </p>
                </div>

                {/* 右：当日业绩列表 */}
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-300">
                        {selLabel}
                        {dayData ? <span className="ml-2 font-normal text-gray-500">{dayData.count} 家发布</span> : null}
                    </p>
                    {dayData ? (
                        <ul className="mt-2 max-h-[430px] divide-y divide-gray-900/80 overflow-y-auto pr-1">
                            {dayData.entries.slice(0, 40).map((e) => {
                                const inPool = pool.has(e.symbol);
                                const failed = imgFailed.has(e.symbol);
                                return (
                                    <li key={e.symbol}>
                                        <Link href={`/stocks/${e.symbol}`}
                                              className="flex items-center gap-3 px-1 py-2.5 hover:bg-gray-900/40">
                                            {failed ? (
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                                      style={{ backgroundColor: logoColor(e.symbol) }}>
                                                    {e.symbol.slice(0, 2)}
                                                </span>
                                            ) : (
                                                <img
                                                    src={`/api/logo/${e.symbol}`}
                                                    alt=""
                                                    loading="lazy"
                                                    className="h-9 w-9 shrink-0 rounded-full bg-gray-900 object-contain p-1"
                                                    onError={() =>
                                                        setImgFailed((s) => new Set(s).add(e.symbol))
                                                    }
                                                />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-semibold text-gray-100">{e.symbol}</span>
                                                    <span className="min-w-0 truncate text-xs text-gray-500">{e.name}</span>
                                                    {TIME_LABEL[e.timeOfTheDay ?? ''] ? (
                                                        <span className="shrink-0 rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400">
                                                            {TIME_LABEL[e.timeOfTheDay ?? '']}
                                                        </span>
                                                    ) : null}
                                                    {inPool ? (
                                                        <span className="shrink-0 rounded-full border border-white/40 px-2 py-0.5 text-[10px] text-white">自选</span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    EPS 预期 {e.epsEstimate?.toFixed(2) ?? '—'}
                                                    {e.epsActual !== null && e.epsActual !== undefined ? ` · 实际 ${e.epsActual.toFixed(2)}` : ''}
                                                    {' · 营收预期 '}{fmtBillion(e.revenueEstimate)}
                                                </p>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="mt-4 text-sm text-gray-500">该日无业绩发布。</p>
                    )}
                </div>
            </div>
        </section>
    );
}
