import Link from "next/link";
import Image from "next/image";
import NavItems, { type NavItem } from "@/components/NavItems";
import LanguageToggle from "@/components/LanguageToggle";
import HeaderSearch from "@/components/HeaderSearch";
import { popularSymbolsAction } from "@/lib/actions/search.actions";
import { getI18n } from "@/lib/i18n";
import { APP_NAME } from "@/lib/app-config";

const Header = async () => {
    // 关键：这里原来是 searchStocks()（无 query 时并发 10 个 Finnhub profile2 请求），
    // 布局每次渲染都会跑 —— 这是页面切换慢的主因。改为读本地股票池，零网络。
    const initialStocks = await popularSymbolsAction(12);
    const { locale, t } = await getI18n();

    const items: NavItem[] = [
        { href: '/', label: t('nav.dashboard') },
        { href: '/quant', label: t('nav.quant') },
        { href: '/analysis', label: t('nav.analysis') },
        { href: '/decisions', label: t('nav.decisions') },
        { href: '/macro', label: locale === 'en' ? 'Macro' : '宏观' },
        { href: '/watchlist', label: t('nav.watchlist') },
    ];

    return (
        <header className="sticky top-0 header">
            <div className="container header-wrapper">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/assets/icons/app.ico"
                        alt=""
                        width={30}
                        height={30}
                        className="rounded-md"
                        unoptimized
                    />
                    <span className="font-display text-[15px] font-semibold tracking-tight text-gray-100">
                        {APP_NAME}
                    </span>
                </Link>
                <nav className="hidden md:block">
                    <NavItems initialStocks={initialStocks} items={items} locale={locale} />
                </nav>

                <div className="flex items-center gap-2">
                    <HeaderSearch locale={locale} />
                    <LanguageToggle locale={locale} />
                </div>
            </div>
        </header>
    )
}
export default Header
