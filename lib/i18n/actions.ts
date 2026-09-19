'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, isLocale, type Locale } from '@/lib/i18n/messages';

/** 切换界面语言：写 cookie，一年有效 */
export async function setLocaleAction(locale: Locale): Promise<{ ok: boolean; locale: Locale }> {
    const next: Locale = isLocale(locale) ? locale : 'zh';
    const store = await cookies();
    store.set(LOCALE_COOKIE, next, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
    });
    return { ok: true, locale: next };
}
