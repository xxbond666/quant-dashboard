'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchSymbolsAction, popularSymbolsAction } from '@/lib/actions/search.actions';
import { translate, type Locale } from '@/lib/i18n/messages';

interface Result {
    symbol: string;
    name?: string;
}

/** 页头内联搜索栏：输入即搜（本地池优先），下拉结果点击直达个股页 */
export default function HeaderSearch({ locale }: { locale: Locale }) {
    const router = useRouter();
    const [term, setTerm] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [popularLoaded, setPopularLoaded] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    useEffect(() => {
        if (timer.current) clearTimeout(timer.current);
        const q = term.trim();
        if (!q) return; // 空输入不触发搜索；热门标的只在点击/聚焦时展示
        timer.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await searchSymbolsAction(q);
                setResults(res as Result[]);
                setOpen(true);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);
    }, [term]);

    const go = (symbol: string) => {
        setOpen(false);
        setTerm('');
        router.push(`/stocks/${symbol}`);
    };

    return (
        <div ref={boxRef} className="relative">
            <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onFocus={() => term.trim() && setOpen(true)}
                onClick={async () => {
                if (!term.trim() && !popularLoaded) {
                    setPopularLoaded(true);
                    try {
                        const pop = await popularSymbolsAction(8);
                        setResults(pop as Result[]);
                        setOpen(true);
                    } catch {
                        setResults([]);
                    }
                }
            }}
            onKeyDown={(e) => {
                    if (e.key === 'Enter' && results.length) go(results[0].symbol);
                    if (e.key === 'Escape') setOpen(false);
                }}
                placeholder={translate(locale, 'search.placeholder')}
                className="h-9 w-40 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-foreground outline-none transition-all placeholder:text-gray-500 focus:w-56 focus:border-white/30 focus:bg-white/[0.06]"
            />
            {open && (loading || results.length > 0) ? (
                <div className="absolute right-0 top-11 z-50 max-h-[420px] w-72 overflow-auto rounded-2xl border border-white/10 bg-[#141417]/95 p-1 shadow-2xl backdrop-blur-xl">
                    {loading ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                            {translate(locale, 'search.loading')}
                        </p>
                    ) : (
                        results.map((r) => (
                            <button
                                key={r.symbol}
                                type="button"
                                onClick={() => go(r.symbol)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left hover:bg-accent/40"
                            >
                                <span className="font-mono text-sm font-semibold text-foreground">{r.symbol}</span>
                                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.name}</span>
                            </button>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}
