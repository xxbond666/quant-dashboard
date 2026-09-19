import type { NewsItem } from '@/lib/actions/market.actions';

export function WatchlistNews({ news }: { news: NewsItem[] }) {
    if (!news.length) {
        return (
            <p className="rounded-2xl border border-gray-800 bg-gray-950/40 p-5 text-sm text-gray-500">
                自选股暂无相关新闻。
            </p>
        );
    }
    return (
        <ul className="space-y-3">
            {news.map((n, i) => (
                <li key={`${n.symbol}-${n.datetime}-${i}`}>
                    <a href={n.url} target="_blank" rel="noopener noreferrer"
                       className="block rounded-2xl border border-gray-800 bg-gray-950/40 p-4 hover:border-teal-500/40">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono text-teal-400">{n.symbol}</span>
                            <span>{n.source}</span>
                            <span className="ml-auto">
                                {n.datetime ? new Date(n.datetime * 1000).toLocaleDateString('zh-CN') : ''}
                            </span>
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-gray-100">{n.headline}</p>
                    </a>
                </li>
            ))}
        </ul>
    );
}
