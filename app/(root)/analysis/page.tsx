import { safeRequest, type QuantSignals, type QuantProgress } from '@/lib/quant/api';
import { PageHeading, ApiErrorPanel } from '@/components/quant/ApiErrorPanel';
import AnalysisConsole from '@/components/analysis/AnalysisConsole';
import { getI18n } from '@/lib/i18n';
import { REPORTS_DIR } from '@/lib/config';

// 首屏状态 5s 缓存即可：运行中的新鲜度由客户端 4s 轮询保证
export const revalidate = 5;

export default async function AnalysisPage() {
    const { locale, t } = await getI18n();

    // 服务端预取初始状态：否则首屏会先闪一下"暂无运行记录"，再被客户端轮询覆盖。
    const [signalsRes, progressRes, statusRes] = await Promise.all([
        safeRequest<QuantSignals>('/api/quant/signals'),
        safeRequest<QuantProgress>('/api/quant/progress', {}, 5),
        safeRequest<{ state?: string; decision?: string | null }>('/api/analysis/status', {}, 5),
    ]);

    const quickPicks = (signalsRes.data?.top_bullish ?? []).slice(0, 3).map((r) => r.symbol);

    return (
        <div className="min-h-screen bg-background p-6 text-foreground md:p-8">
            <PageHeading title={t('analysis.title')} subtitle={t('analysis.subtitle')} />

            {signalsRes.error ? (
                <div className="mb-6">
                    <ApiErrorPanel
                        title={t('quant.apiDown')}
                        error={signalsRes.error}
                        locale={locale}
                    />
                </div>
            ) : null}

            <AnalysisConsole
                quickPicks={quickPicks}
                defaultTicker={quickPicks[0] ?? 'NVDA'}
                locale={locale}
                reportsDir={REPORTS_DIR}
                initialProgress={(progressRes.data ?? null) as Record<string, unknown> | null}
                initialStatus={(statusRes.data ?? null) as Record<string, unknown> | null}
            />
        </div>
    );
}
