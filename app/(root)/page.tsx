import TradingViewWidget from "@/components/TradingViewWidget";
import {
    HEATMAP_WIDGET_CONFIG,
    MARKET_DATA_WIDGET_CONFIG,
    TOP_STORIES_WIDGET_CONFIG
} from "@/lib/constants";
import { getI18n } from "@/lib/i18n";
import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import {
    getEarningsCalendarAction,
    getNewsForSymbolsAction,
} from "@/lib/actions/market.actions";
import EarningsCalendarCard from "@/components/home/EarningsCalendarCard";
import CoverStats from "@/components/home/CoverStats";
import { fetchCoverQuotes } from "@/lib/cover";
import { WatchlistNews } from "@/components/home/WatchlistNews";

// ISR：60s 缓存。点击导航命中缓存秒开；数据新鲜度由 fetch 层 revalidate 兼顾
export const revalidate = 60;

const Home = async () => {
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;
    const { locale } = await getI18n();
    const zh = locale === 'zh';

    const watchlist = await getUserWatchlist('local');
    const watchlistSymbols = watchlist.map((i) => i.symbol);

    // 日历（Finnhub 7 窗并发）与新闻（8 路并发）互不依赖，并行拉取省一半首屏时间；
    // 封面首屏数据同步并行拉取，客户端之后每 60s 轮询 /api/cover 自刷新
    const [calendar, news, cover] = await Promise.all([
        getEarningsCalendarAction(watchlistSymbols),
        getNewsForSymbolsAction(
            watchlistSymbols.length ? watchlistSymbols.slice(0, 8) : ['NVDA', 'AAPL', 'MSFT'], 3),
        fetchCoverQuotes(),
    ]);

    return (
        <div className="flex min-h-screen home-wrapper">
            {/* 封面：数据墙（Mono Glass，客户端 60s 自刷新） */}
            <CoverStats zh={zh} initial={cover} />

            {/* 01 板块热力图：独占整行 */}
            <section className="grid w-full gap-8 home-section">
                <div className="md:col-span-2 xl:col-span-3">
                    <TradingViewWidget
                        title={zh ? '01 / 板块热力图' : '01 / Stock Heatmap'}
                        scriptUrl={`${scriptUrl}stock-heatmap.js`}
                        config={HEATMAP_WIDGET_CONFIG}
                        height={620}
                    />
                </div>
            </section>

            {/* 02 股指报价 + 03 头条新闻 */}
            <section className="grid w-full gap-8 home-section">
                <div className="md:col-span-1 xl:col-span-1">
                    <TradingViewWidget
                        title={zh ? '02 / 全球市场概览' : '02 / Global Markets'}
                        scriptUrl={`${scriptUrl}market-quotes.js`}
                        config={MARKET_DATA_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
                <div className="h-full md:col-span-1 xl:col-span-2">
                    <TradingViewWidget
                        title={zh ? '03 / 头条新闻' : '03 / Top Stories'}
                        scriptUrl={`${scriptUrl}timeline.js`}
                        config={TOP_STORIES_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
            </section>

            {/* 04 自选股新闻 + 05 业绩日历 */}
            <section className="grid w-full gap-8 home-section">
                <div className="h-full md:col-span-1 xl:col-span-1">
                    <h3 className="mb-3 text-sm font-semibold text-gray-200">
                        {zh ? '04 / 自选股新闻' : '04 / Watchlist News'}
                    </h3>
                    <WatchlistNews news={news} />
                </div>
                <div className="md:col-span-1 xl:col-span-2">
                    <EarningsCalendarCard
                        days={calendar.days}
                        total={calendar.total}
                        poolSymbols={watchlistSymbols}
                        error={calendar.error}
                    />
                </div>
            </section>
        </div>
    )
}

export default Home;
