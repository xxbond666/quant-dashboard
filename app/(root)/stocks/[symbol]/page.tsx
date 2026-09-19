import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import { EarningsCompareCard } from "@/components/stocks/EarningsCompareCard";
import {
    SYMBOL_INFO_WIDGET_CONFIG,
    CANDLE_CHART_WIDGET_CONFIG,
    BASELINE_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
} from "@/lib/constants";

import { isStockInWatchlist } from '@/lib/actions/watchlist.actions';
import { getCompanyInfo } from '@/lib/actions/company.actions';
import { formatSymbolForTradingView } from '@/lib/utils';
import { LOCAL_USER_ID } from '@/lib/store/json-store';
import { getI18n } from '@/lib/i18n';

// 业绩/评级数据缓存 ≥1 天，页面 ISR 5 分钟：个股页点击秒开
export const revalidate = 300;

export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol } = await params;
    const { locale } = await getI18n();
    const tvSymbol = formatSymbolForTradingView(symbol);
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    const userId = LOCAL_USER_ID;
    const [isInWatchlist, company] = await Promise.all([
        isStockInWatchlist(userId, symbol),
        getCompanyInfo(symbol),
    ]);

    return (
        <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* 左列：报价条 + K线 + 基准线（全部 TradingView 现成组件） */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <WatchlistButton
                            symbol={symbol.toUpperCase()}
                            company={symbol.toUpperCase()}
                            isInWatchlist={isInWatchlist}
                            userId={userId}
                            locale={locale}
                        />
                    </div>
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}symbol-info.js`}
                        config={SYMBOL_INFO_WIDGET_CONFIG(tvSymbol)}
                        height={170}
                    />
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}advanced-chart.js`}
                        config={CANDLE_CHART_WIDGET_CONFIG(tvSymbol)}
                        className="custom-chart"
                        height={600}
                        allowExpand={true}
                    />
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}advanced-chart.js`}
                        config={BASELINE_WIDGET_CONFIG(tvSymbol)}
                        className="custom-chart"
                        height={600}
                        allowExpand={true}
                    />
                    {/* 公司简介：TradingView symbol-profile 现成组件（旧 URL company-profile 是 403，已纠正） */}
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}symbol-profile.js`}
                        config={COMPANY_PROFILE_WIDGET_CONFIG(tvSymbol)}
                        height={500}
                    />
                </div>
                {/* 右列：业绩对比图 → 财务指标(TV) → 技术分析(TV) */}
                <div className="flex flex-col gap-6">
                    <EarningsCompareCard
                        quarters={company.earnings ?? []}
                        income={company.income}
                        analyst={company.analyst}
                        locale={locale}
                    />
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}financials.js`}
                        config={COMPANY_FINANCIALS_WIDGET_CONFIG(tvSymbol)}
                        height={1400}
                    />
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}technical-analysis.js`}
                        config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(tvSymbol)}
                        height={400}
                    />
                </div>
            </section>
        </div>
    );
}
