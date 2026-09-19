import React, { Suspense } from 'react';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import { getUserAlerts } from '@/lib/actions/alert.actions';
import { getNews } from '@/lib/actions/finnhub.actions';
import WatchlistManager from '@/components/watchlist/WatchlistManager';
import AlertsPanel from '@/components/watchlist/AlertsPanel';
import NewsGrid from '@/components/watchlist/NewsGrid';
import SearchCommand from '@/components/SearchCommand';
import { Loader2 } from 'lucide-react';
import { LOCAL_USER_ID } from '@/lib/store/json-store';
import { getI18n } from '@/lib/i18n';

// 新闻 fetch 层缓存 300s；页面 ISR 60s 保证导航秒开
export const revalidate = 60;

export default async function WatchlistPage() {
    // 登录已移除：本地单用户
    const userId = LOCAL_USER_ID;
    const { locale, t } = await getI18n();

    const [watchlistItems, alerts] = await Promise.all([
        getUserWatchlist(userId),
        getUserAlerts(userId),
    ]);

    const watchlistSymbols = watchlistItems.map((item) => item.symbol);

    // 只拉一次：有自选就取公司新闻，getNews 内部自选为空/无命中时自动回退全市场新闻；
    // 新闻失败不阻断整页（降级为空列表）
    const relevantNews = await getNews(watchlistSymbols).catch(() => []);

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        {t('watchlist.title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('watchlist.subtitle')}</p>
                </div>
                <div className="flex items-center space-x-4">
                    <SearchCommand renderAs="button" label={t('watchlist.addStock')} initialStocks={[]} locale={locale} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Main Content - Watchlist Table */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="space-y-6">
                        <WatchlistManager initialItems={watchlistItems} userId={userId} locale={locale} />
                    </div>

                    {/* News Section */}
                    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>}>
                        <NewsGrid news={relevantNews || []} />
                    </Suspense>
                </div>

                {/* Sidebar - Alerts */}
                <div className="lg:col-span-1">
                    <AlertsPanel alerts={alerts} />
                </div>
            </div>
        </div>
    );
}
