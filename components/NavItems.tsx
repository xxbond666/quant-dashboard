'use client'

import React from 'react'
import Link from "next/link";
import { type Locale } from "@/lib/i18n/messages";
import { usePathname } from "next/navigation";
import SearchCommand from "@/components/SearchCommand";

export interface NavItem {
    href: string;
    label: string;
}

const NavItems = ({
    initialStocks,
    items,
    locale = 'zh',
}: {
    initialStocks: StockWithWatchlistStatus[];
    items: NavItem[];
    locale?: Locale;
}) => {
    const pathname = usePathname()

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/'
        return pathname.startsWith(path);
    }

    return (
        <ul className="flex flex-col sm:flex-row p-1.5 gap-1 sm:gap-1.5 font-medium">
            {items.map(({ href, label }) => {
                if (href === '/search') return (
                    <li key="search-trigger">
                        <SearchCommand
                            renderAs="text"
                            label={label}
                            initialStocks={initialStocks}
                            locale={locale}
                        />
                    </li>
                )
                return <li key={href}>
                    <Link
                        href={href}
                        className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                            isActive(href)
                                ? 'bg-white text-black font-semibold'
                                : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                        }`}
                    >
                        {label}
                    </Link>
                </li>
            })}
        </ul>
    )
}
export default NavItems
