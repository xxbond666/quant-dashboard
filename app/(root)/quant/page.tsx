import { safeRequest, type QuantSignals, type QuantUniverse } from '@/lib/quant/api';
import { ModelStatusCard, LeaderPanels } from '@/components/quant/QuantPanels';
import { SignalTable } from '@/components/quant/SignalTable';
import { ApiErrorPanel, PageHeading } from '@/components/quant/ApiErrorPanel';
import QuantTools from '@/components/quant/QuantTools';
import { readUniverse } from '@/lib/actions/universe.actions';
import { getI18n } from '@/lib/i18n';

// 6901 数据层自带 20s fetch 缓存；页面同频 ISR，导航秒开
export const revalidate = 20;

export default async function QuantPage() {
    const { locale, t } = await getI18n();

    // 只读接口，服务端并发拉取；失败不抛错，交由页面展示原因
    const [signalsRes, universeRes, universeState] = await Promise.all([
        safeRequest<QuantSignals>('/api/quant/signals'),
        safeRequest<QuantUniverse>('/api/qlib/universe'),
        readUniverse(),
    ]);

    const signals = signalsRes.data;
    const universe = universeRes.data;
    const error = signalsRes.error ?? universeRes.error;

    const universePath = universeState.path;

    return (
        <div className="min-h-screen bg-background p-6 text-foreground md:p-8">
            <PageHeading
                title={t('quant.title')}
                subtitle={t('quant.subtitle')}
                right={
                    signals?.asof ? (
                        <span className="text-xs text-muted-foreground">
                            {t('common.asOf')}{' '}
                            <span className="font-mono text-foreground/90">{signals.asof}</span>
                        </span>
                    ) : null
                }
            />

            <div className="space-y-6">
                {/* 股票池维护与数据更新：放在最上方，是每天动手最频繁的操作 */}
                <QuantTools
                    locale={locale}
                    count={universeState.symbols.length}
                    sections={universeState.sections.map((s) => s.name)}
                    universePath={universePath}
                />

                {!signals && error ? (
                    <ApiErrorPanel
                        title={t('quant.apiDown')}
                        error={error}
                        locale={locale}
                    />
                ) : (
                    <>
                        {signals ? <ModelStatusCard signals={signals} locale={locale} /> : null}

                        {signals ? (
                            <LeaderPanels
                                bullish={signals.top_bullish}
                                bearish={signals.top_bearish}
                                locale={locale}
                            />
                        ) : null}

                        {universe ? (
                            <SignalTable rows={universe.rows} locale={locale} />
                        ) : (
                            <ApiErrorPanel
                                title={t('quant.rankDown')}
                                error={universeRes.error ?? t('quant.noReturn')}
                                locale={locale}
                            />
                        )}

                        {signals && universe && signals.universe_size !== universe.count ? (
                            <p className="text-xs text-amber-400">
                                {t('quant.mismatch', {
                                    a: signals.universe_size,
                                    b: universe.count,
                                })}
                            </p>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
