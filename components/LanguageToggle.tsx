'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { setLocaleAction } from '@/lib/i18n/actions';
import { LOCALE_LABEL, LOCALES, type Locale } from '@/lib/i18n/messages';

/** 语言切换：写 cookie 后 refresh，使服务端渲染的页面一并切换 */
export default function LanguageToggle({ locale }: { locale: Locale }) {
    const router = useRouter();
    const [current, setCurrent] = useState<Locale>(locale);
    const [pending, startTransition] = useTransition();

    const pick = (next: Locale) => {
        if (next === current) return;
        setCurrent(next);
        startTransition(async () => {
            await setLocaleAction(next);
            router.refresh();
        });
    };

    return (
        <div
            className={`flex items-center gap-1 rounded-lg border border-border p-0.5 ${
                pending ? 'opacity-60' : ''
            }`}
            role="group"
            aria-label="Language"
        >
            {LOCALES.map((l) => (
                <button
                    key={l}
                    type="button"
                    onClick={() => pick(l)}
                    className={`rounded px-2 py-0.5 text-xs transition-colors ${
                        l === current
                            ? 'bg-teal-500 font-medium text-black'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {LOCALE_LABEL[l]}
                </button>
            ))}
        </div>
    );
}
