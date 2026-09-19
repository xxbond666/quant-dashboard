import { NextResponse } from 'next/server';
import { fetchCoverQuotes } from '@/lib/cover';

/** 封面数据墙轮询端点：getQuote 自带 60s fetch 缓存，这里再叠 60s 路由缓存 */
export const revalidate = 60;

export async function GET() {
    return NextResponse.json(await fetchCoverQuotes());
}
