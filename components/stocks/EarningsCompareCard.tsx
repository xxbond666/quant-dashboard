import { GroupedBars, type BarGroup } from '@/components/charts/SvgCharts';
import type { EarningsQuarter, IncomeQuarter, AnalystView } from '@/lib/actions/company.actions';

type Locale = 'zh' | 'en';

const EST_COLOR = '#7a7a82';   // 预期：中灰
const BEAT_COLOR = '#fafafa';  // 实际超预期：亮白
const MISS_COLOR = '#5f5f66';  // 实际不及预期：暗灰
const REV_COLOR = '#e6e6e6';   // 营收：近白
const NI_COLOR = '#8a8a93';    // 净利润：灰

function quarterLabel(period?: string): string {
    if (!period) return '—';
    // 2026-09-30 → 26Q3
    const [y, m] = period.split('-');
    const q = Math.ceil(Number(m) / 3);
    return `${y.slice(2)}Q${q}`;
}

/**
 * 业绩对比图卡：EPS 预期 vs 实际（近 8 季分组柱状）+ 营收/净利润（近 8 季）
 * + 分析师评级分布。替代原来"几个数字"的卡片。
 */
export function EarningsCompareCard({
    quarters,
    income,
    analyst,
    locale = 'zh',
}: {
    quarters: EarningsQuarter[];
    income: IncomeQuarter[] | null;
    analyst: AnalystView | null;
    locale?: Locale;
}) {
    const en = locale === 'en';

    // Finnhub 返回按时间倒序，转正序并按报告期升序画柱
    const eps = [...(quarters ?? [])]
        .filter((q) => q.actual !== undefined || q.estimate !== undefined)
        .sort((a, b) => (a.period ?? '').localeCompare(b.period ?? ''))
        .slice(-8);

    const epsGroups: BarGroup[] = eps.map((q) => {
        const surprise = q.surprisePercent ?? ((q.actual ?? 0) - (q.estimate ?? 0));
        const beat = (q.surprise ?? surprise) >= 0;
        return {
            label: quarterLabel(q.period),
            bars: [
                { name: en ? 'Est.' : '预期', value: q.estimate ?? null, color: EST_COLOR },
                { name: en ? 'Actual' : '实际', value: q.actual ?? null, color: beat ? BEAT_COLOR : MISS_COLOR },
            ],
            note: q.surprisePercent !== undefined && q.surprisePercent !== null
                ? `${q.surprisePercent >= 0 ? '+' : ''}${q.surprisePercent.toFixed(1)}%`
                : undefined,
            noteColor: beat ? BEAT_COLOR : MISS_COLOR,
        };
    });

    const inc = [...(income ?? [])]
        .filter((q) => q.totalRevenue !== undefined)
        .sort((a, b) => a.fiscalDateEnding.localeCompare(b.fiscalDateEnding))
        .slice(-8);
    const revGroups: BarGroup[] = inc.map((q) => ({
        label: quarterLabel(q.fiscalDateEnding),
        bars: [
            { name: en ? 'Revenue' : '营收', value: q.totalRevenue ? q.totalRevenue / 1e8 : null, color: REV_COLOR },
            { name: en ? 'Net Income' : '净利润', value: q.netIncome ? q.netIncome / 1e8 : null, color: NI_COLOR },
        ],
        note: q.revenueYoy != null ? `${q.revenueYoy >= 0 ? '+' : ''}${q.revenueYoy.toFixed(0)}%` : undefined,
        noteColor: (q.revenueYoy ?? 0) >= 0 ? BEAT_COLOR : MISS_COLOR,
    }));

    const dist = analyst
        ? [analyst.strongBuy ?? 0, analyst.buy ?? 0, analyst.hold ?? 0, analyst.sell ?? 0, analyst.strongSell ?? 0]
        : [];
    const total = dist.reduce((a, b) => a + b, 0);
    const colors = ['bg-white', 'bg-neutral-400', 'bg-neutral-600', 'bg-neutral-700', 'bg-neutral-800'];
    const labels = en
        ? ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']
        : ['强力买入', '买入', '持有', '卖出', '强力卖出'];

    return (
        <section className="rounded-2xl border border-gray-800 bg-gray-950/40 p-5">
            <h3 className="text-sm font-semibold text-gray-200">
                {en ? 'Earnings Comparison' : '业绩对比'}
                <span className="ml-2 font-normal text-gray-500">
                    {en ? 'EPS Est. vs Actual · Revenue / Net Income · Finnhub + AV' : 'EPS 预期 vs 实际 · 营收/净利润 · Finnhub + AV'}
                </span>
            </h3>

            {epsGroups.length ? (
                <div className="mt-4">
                    <p className="text-xs text-gray-500">EPS（美元/股）· 柱顶为超预期幅度</p>
                    <GroupedBars
                        groups={epsGroups}
                        fmt={(v) => v.toFixed(2)}
                        legend={[
                            { name: en ? 'Estimate' : '预期', color: EST_COLOR },
                            { name: en ? 'Actual (beat)' : '实际·超预期', color: BEAT_COLOR },
                            { name: en ? 'Actual (miss)' : '实际·不及预期', color: MISS_COLOR },
                        ]}
                    />
                </div>
            ) : (
                <p className="mt-4 text-sm text-gray-500">{en ? 'No EPS data' : '暂无 EPS 数据'}</p>
            )}

            {revGroups.length ? (
                <div className="mt-6">
                    <p className="text-xs text-gray-500">{en ? 'Revenue / Net Income (USD 100M)' : '营收 / 净利润（亿美元）· 柱顶为营收同比'}</p>
                    <GroupedBars
                        groups={revGroups}
                        fmt={(v) => v.toFixed(0)}
                        legend={[
                            { name: en ? 'Revenue' : '营收', color: REV_COLOR },
                            { name: en ? 'Net Income' : '净利润', color: NI_COLOR },
                        ]}
                    />
                </div>
            ) : (
                <p className="mt-6 text-sm text-gray-500">
                    {en
                        ? 'Revenue history unavailable (Alpha Vantage daily quota exhausted — it will appear automatically once quota resets)'
                        : '营收历史暂不可用（Alpha Vantage 免费额度 25 次/日已用完，额度重置后自动出现）'}
                </p>
            )}

            {analyst && total > 0 ? (
                <div className="mt-6">
                    <p className="text-xs text-gray-500">
                        {en ? 'Analyst Rating' : '分析师评级'} · {total} {en ? 'analysts' : '位'}（Finnhub）
                    </p>
                    <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-800">
                        {dist.map((n, i) =>
                            n ? <div key={i} className={colors[i]} style={{ width: `${(n / total) * 100}%` }} /> : null,
                        )}
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px] text-gray-400">
                        {labels.map((lb, i) => (
                            <div key={lb}>
                                <p>{lb}</p>
                                <p className="font-mono text-gray-200">{dist[i]}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
