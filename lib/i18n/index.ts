/**
 * i18n 服务端入口。
 *
 * 字典与纯函数在 ./messages（客户端也可用）；这里只放依赖 next/headers 的部分。
 * 语言存 cookie（默认 zh），服务端组件用 cookies() 读取，因此服务端渲染的页面也能跟着切。
 * 切换由 components/LanguageToggle.tsx 调 server action → 写 cookie → router.refresh()。
 */
import { cookies } from 'next/headers';
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    isLocale,
    translate,
    type Locale,
    type MessageKey,
} from '@/lib/i18n/messages';

export * from '@/lib/i18n/messages';

/** 服务端读取当前语言（默认中文） */
export async function getLocale(): Promise<Locale> {
    try {
        const store = await cookies();
        const v = store.get(LOCALE_COOKIE)?.value;
        return isLocale(v) ? v : DEFAULT_LOCALE;
    } catch {
        return DEFAULT_LOCALE;
    }
}

/** 服务端便捷入口：拿到 locale 与翻译函数 */
export async function getI18n() {
    const locale = await getLocale();
    return {
        locale,
        t: (key: MessageKey, vars?: Record<string, string | number>) =>
            translate(locale, key, vars),
    };
}
