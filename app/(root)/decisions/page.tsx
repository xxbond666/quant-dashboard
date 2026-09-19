import { safeRequest, type DecisionsResponse, type Decision } from '@/lib/quant/api';
import { PageHeading, ApiErrorPanel } from '@/components/quant/ApiErrorPanel';
import { stanceStyle, stanceLabel } from '@/components/quant/QuantPanels';
import { getI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/messages';

export const revalidate = 20;

function DecisionCard({ d, locale }: { d: Decision; locale: Locale }) {
    const s = stanceStyle(d.qlib?.stance ?? 'neutral');
    const pdfHref = `/api/report/${encodeURIComponent(d.name)}`;
    return (
        <article className="rounded-2xl border border-border bg-card p-5">
            <header className="flex flex-wrap items-center gap-3">
                <a
                    href={`/stocks/${d.ticker}`}
                    className="font-mono text-lg font-semibold text-foreground hover:text-teal-400"
                >
                    {d.ticker}
                </a>
                {d.qlib?.stance_zh ? (
                    <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs ${s.border} ${s.bg} ${s.text}`}
                    >
                        {locale === 'zh' ? '量化' : 'Quant'}：
                        {stanceLabel({ stance: d.qlib.stance ?? 'neutral', stance_zh: d.qlib.stance_zh }, locale)}
                    </span>
                ) : null}
                {d.rating ? (
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground/90">
                        {d.rating}
                    </span>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">{d.ran_at}</span>
                {d.has_pdf ? (
                    <a
                        href={pdfHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-teal-400"
                    >
                        {locale === 'zh' ? '打开 PDF 报告' : 'Open PDF report'}
                    </a>
                ) : null}
            </header>

            <a
                href={d.has_pdf ? pdfHref : undefined}
                target={d.has_pdf ? '_blank' : undefined}
                rel="noopener noreferrer"
                className={`mt-3 block whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 ${
                    d.has_pdf ? 'cursor-pointer transition-colors hover:text-teal-300' : ''
                }`}
            >
                {d.excerpt}
            </a>

            <footer className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                {d.has_pdf ? (
                    <a href={pdfHref} target="_blank" rel="noopener noreferrer" className="font-mono text-teal-400 hover:underline">
                        {d.name}
                    </a>
                ) : (
                    <span className="font-mono">{d.name}</span>
                )}
                {d.has_pdf ? (
                    <span className="text-teal-400">{locale === 'zh' ? 'PDF 已生成' : 'PDF ready'}</span>
                ) : null}
                {d.has_html ? (
                    <span className="text-teal-400">{locale === 'zh' ? 'HTML 已生成' : 'HTML ready'}</span>
                ) : null}
            </footer>
        </article>
    );
}

export default async function DecisionsPage() {
    const { locale, t } = await getI18n();
    const { data, error } = await safeRequest<DecisionsResponse>('/api/quant/decisions?limit=20');
    const decisions = data?.decisions ?? [];

    return (
        <div className="min-h-screen bg-background p-6 text-foreground md:p-8">
            <PageHeading
                title={t('decisions.title')}
                subtitle={t('decisions.subtitle')}
                right={
                    <span className="text-xs text-muted-foreground">
                        {t('decisions.count', { n: decisions.length })}
                    </span>
                }
            />

            {error ? (
                <ApiErrorPanel title={t('quant.apiDown')} error={error} locale={locale} />
            ) : decisions.length === 0 ? (
                <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                    {t('decisions.empty')}
                </p>
            ) : (
                <div className="space-y-5">
                    {decisions.map((d) => (
                        <DecisionCard key={d.name} d={d} locale={locale} />
                    ))}
                </div>
            )}
        </div>
    );
}
