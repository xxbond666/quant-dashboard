import { getMacroSnapshot } from '@/lib/actions/macro.actions';
import { MacroPanels } from '@/components/macro/MacroPanels';
import { PageHeading } from '@/components/quant/ApiErrorPanel';
import { getI18n } from '@/lib/i18n';

// FRED 数据本身缓存 1 天，页面缓存 1 小时足够
export const revalidate = 3600;

export default async function MacroPage() {
    const { locale } = await getI18n();
    const series = await getMacroSnapshot();

    return (
        <div className="min-h-screen bg-background p-6 text-foreground md:p-8">
            <PageHeading
                title={locale === 'en' ? 'Macro' : '宏观'}
                subtitle={locale === 'en'
                    ? 'FRED indicators by category (rates / inflation / jobs / growth / risk) · per-chart time range · cached 1 day'
                    : 'FRED 指标按类别（利率 / 通胀 / 就业 / 增长货币地产 / 风险美元）· 每张图可选时间范围 · 缓存 1 天'}
            />
            <MacroPanels series={series} />
        </div>
    );
}
