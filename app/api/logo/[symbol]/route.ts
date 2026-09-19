import { NextRequest, NextResponse } from 'next/server';

/**
 * 公司 logo 代理：Finnhub profile2 → logo URL → 服务端取字节回给 <img>。
 *
 * 为什么代理：① 浏览器可能不带代理直连 static2.finnhub.io 失败；
 * ② 内存缓存后同一 symbol 只吃一次 Finnhub 配额（免费档 60/min）。
 * 失败返回 404，前端 <img onError> 自动降级为字母头像。
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';

const mem = new Map<string, { buf: ArrayBuffer; type: string }>();
const inflight = new Map<string, Promise<{ buf: ArrayBuffer; type: string } | null>>();

async function loadLogo(symbol: string) {
    const cached = mem.get(symbol);
    if (cached) return cached;
    if (!FINNHUB_KEY) return null;

    let job = inflight.get(symbol);
    if (!job) {
        job = (async () => {
            try {
                const prof = await fetch(
                    `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`,
                    { next: { revalidate: 86400 * 7 } },
                );
                if (!prof.ok) return null;
                const j = (await prof.json()) as { logo?: string };
                if (!j.logo) return null;
                const img = await fetch(j.logo, { next: { revalidate: 86400 * 7 } });
                if (!img.ok) return null;
                const buf = await img.arrayBuffer();
                if (!buf.byteLength) return null;
                const out = { buf, type: img.headers.get('content-type') ?? 'image/png' };
                mem.set(symbol, out);
                return out;
            } catch {
                return null;
            } finally {
                inflight.delete(symbol);
            }
        })();
        inflight.set(symbol, job);
    }
    return job;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
    const { symbol } = await params;
    const s = decodeURIComponent(symbol).trim().toUpperCase();
    if (!s || s.length > 12) {
        return NextResponse.next({ status: 404 });
    }
    const logo = await loadLogo(s);
    if (!logo) {
        return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(logo.buf, {
        headers: {
            'content-type': logo.type,
            'cache-control': 'public, max-age=604800, stale-while-revalidate=86400',
        },
    });
}
