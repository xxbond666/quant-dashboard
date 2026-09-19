import { quantApi } from '@/lib/quant/api';
import { translate, type Locale } from '@/lib/i18n/messages';

/** Python 控制台不可达时的提示面板（6901 未启动 / 超时 / 接口报错） */
export function ApiErrorPanel({
    title,
    error,
    locale = 'zh',
}: {
    title: string;
    error: string;
    locale?: Locale;
}) {
    const zh = locale === 'zh';
    return (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
            <h2 className="text-sm font-semibold text-amber-400">{title}</h2>
            <p className="mt-2 text-sm text-foreground/90">{error}</p>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p>
                    {zh
                        ? '该后端为可选组件（qlib 信号 / TradingAgents 分析）；不部署时其余页面完全可用，接口契约见 API_DOCS.md。'
                        : 'This backend is optional (qlib signals / TradingAgents). All other pages work without it; see API_DOCS.md for the contract.'}
                </p>
                <p>
                    {zh ? '当前后端地址：' : 'Backend: '}
                    <span className="font-mono text-muted-foreground">{quantApi.base}</span>
                </p>
                <p className="font-mono text-muted-foreground">curl {quantApi.base}/api/health</p>
            </div>
        </section>
    );
}

/** 页面标题条（各分页共用，统一视觉） */
export function PageHeading({
    title,
    subtitle,
    right,
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    {title}
                </h1>
                {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {right}
        </div>
    );
}

export { translate };
