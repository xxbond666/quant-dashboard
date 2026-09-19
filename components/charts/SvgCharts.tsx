/**
 * 零依赖 SVG 迷你图表（宏观折线 / 分组柱状对比）。
 * 只用 React 渲染 SVG，悬停提示走原生 <title>，不引任何图表库。
 */

interface LineChartProps {
    points: { date: string; value: number }[];
    height?: number;
    color?: string;
    /** 数值格式化（Y 轴与末点标签） */
    fmt?: (v: number) => string;
}

const W = 600; // viewBox 宽，实际渲染 100% 宽

/** 折线 + 面积图：自动降采样到 ≤260 点，含网格与首末日期标签 */
export function LineChart({ points, height = 190, color = '#0FEDBE', fmt = (v) => v.toFixed(2) }: LineChartProps) {
    const H = height;
    const padT = 10;
    const padB = 22;
    const padL = 46;
    const padR = 10;

    if (points.length < 2) {
        return <p className="py-8 text-center text-xs text-gray-600">数据不足</p>;
    }

    // 降采样：点多于 260 时等间隔抽点（保留最后一点）
    const step = Math.max(1, Math.ceil(points.length / 260));
    const pts = points.filter((_, i) => i % step === 0);
    if (pts[pts.length - 1] !== points[points.length - 1]) pts.push(points[points.length - 1]);

    let min = Math.min(...pts.map((p) => p.value));
    let max = Math.max(...pts.map((p) => p.value));
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    min -= span * 0.06;
    max += span * 0.06;

    const x = (i: number) => padL + (i / (pts.length - 1)) * (W - padL - padR);
    const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
    const area = `${line}L${x(pts.length - 1).toFixed(1)},${(H - padB).toFixed(1)}L${padL},${(H - padB).toFixed(1)}Z`;
    const gridVals = [0, 0.25, 0.5, 0.75, 1].map((r) => min + r * (max - min));
    // 确定性 id：避免 SSR/客户端随机 id 导致 hydration 不一致
    const gid = `g-${pts[0].date.replace(/-/g, '')}-${pts[pts.length - 1].date.replace(/-/g, '')}-${pts.length}`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img">
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {gridVals.map((v) => (
                <g key={v}>
                    <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#202024" strokeWidth="1" />
                    <text x={padL - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#77777f">
                        {fmt(v)}
                    </text>
                </g>
            ))}
            {/* 零线（区间跨 0 时高亮，如 10Y-2Y 利差倒挂） */}
            {min < 0 && max > 0 ? (
                <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="#8e8e96" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
            ) : null}
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="1.8" />
            <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].value)} r="3" fill={color} />
            <text x={padL} y={H - 6} fontSize="10" fill="#77777f">{pts[0].date}</text>
            <text x={W - padR} y={H - 6} fontSize="10" fill="#77777f" textAnchor="end">{pts[pts.length - 1].date}</text>
            {pts.map((p, i) => (
                <rect key={i} x={x(i) - 2} y={padT} width="4" height={H - padT - padB} fill="transparent">
                    <title>{`${p.date}  ${fmt(p.value)}`}</title>
                </rect>
            ))}
        </svg>
    );
}

export interface BarGroup {
    label: string;
    /** 每组的若干根柱（如 预期/实际） */
    bars: { name: string; value: number | null; color: string }[];
    /** 组顶附加标注（如超预期 %） */
    note?: string;
    noteColor?: string;
}

interface GroupedBarsProps {
    groups: BarGroup[];
    height?: number;
    fmt?: (v: number) => string;
    legend?: { name: string; color: string }[];
}

/** 分组柱状图：正负值都支持（零线居中），EPS 预期 vs 实际、营收 vs 净利润都用它 */
export function GroupedBars({ groups, height = 220, fmt = (v) => v.toFixed(2), legend }: GroupedBarsProps) {
    const H = height;
    const padT = 24;
    const padB = 24;
    const padL = 46;
    const padR = 8;

    const values = groups.flatMap((g) => g.bars.map((b) => b.value).filter((v): v is number => v !== null));
    if (!values.length) {
        return <p className="py-8 text-center text-xs text-gray-600">暂无数据</p>;
    }
    let min = Math.min(...values, 0);
    let max = Math.max(...values);
    if (min === max) max = min + 1;
    const span = max - min;
    max += span * 0.15;
    if (min < 0) min -= span * 0.1;

    const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    const gw = (W - padL - padR) / groups.length;
    const bw = Math.min(26, (gw * 0.62) / Math.max(1, groups[0].bars.length));

    return (
        <div>
            {legend?.length ? (
                <div className="mb-1 flex items-center gap-4 text-[11px] text-gray-500">
                    {legend.map((l) => (
                        <span key={l.name} className="flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: l.color }} />
                            {l.name}
                        </span>
                    ))}
                </div>
            ) : null}
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img">
                {[0, 0.5, 1].map((r) => {
                    const v = min + r * (max - min);
                    return (
                        <g key={r}>
                            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#202024" strokeWidth="1" />
                            <text x={padL - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#77777f">{fmt(v)}</text>
                        </g>
                    );
                })}
                <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="#5a5a62" strokeWidth="1" />
                {groups.map((g, gi) => {
                    const cx = padL + gw * gi + gw / 2;
                    const n = g.bars.length;
                    return (
                        <g key={g.label}>
                            {g.bars.map((b, bi) => {
                                if (b.value === null) return null;
                                const x0 = cx - (n * bw) / 2 + bi * bw;
                                const yTop = Math.min(y(b.value), y(0));
                                const h = Math.max(1, Math.abs(y(b.value) - y(0)));
                                return (
                                    <rect key={b.name} x={x0 + 1} y={yTop} width={bw - 2} height={h} rx="2" fill={b.color}>
                                        <title>{`${g.label} · ${b.name}: ${fmt(b.value)}`}</title>
                                    </rect>
                                );
                            })}
                            <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#77777f">{g.label}</text>
                            {g.note ? (
                                <text x={cx} y={padT - 8} textAnchor="middle" fontSize="10" fill={g.noteColor ?? '#9ca3af'}>
                                    {g.note}
                                </text>
                            ) : null}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
