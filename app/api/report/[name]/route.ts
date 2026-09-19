import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { REPORTS_DIR } from '@/lib/config';

/**
 * 决策报告 PDF 直读：/api/report/{报告目录名} → 流式返回
 * {REPORTS_DIR}/{目录名}/complete_report.pdf，浏览器新标签直接打开。
 *
 * 安全：本路由与 6901 同样无鉴权（仅本机使用），但必须防目录穿越——
 * name 只允许「代码_日期_时间」这类字符集，且拼完路径后校验仍在根目录内。
 */

const REPORTS_ROOT = path.resolve(REPORTS_DIR);

const NAME_RE = /^[A-Za-z0-9_\-.]+$/;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const dir = decodeURIComponent(name);
    if (!NAME_RE.test(dir) || dir.includes('..')) {
        return new NextResponse('bad request', { status: 400 });
    }
    const file = path.resolve(REPORTS_ROOT, dir, 'complete_report.pdf');
    if (!file.startsWith(REPORTS_ROOT + path.sep)) {
        return new NextResponse('bad request', { status: 400 });
    }
    if (!fs.existsSync(file)) {
        return new NextResponse('report not found', { status: 404 });
    }
    const buf = fs.readFileSync(file);
    return new NextResponse(buf, {
        headers: {
            'content-type': 'application/pdf',
            'content-length': String(buf.byteLength),
            'content-disposition': `inline; filename="${dir}.pdf"`,
            'cache-control': 'public, max-age=86400',
        },
    });
}
