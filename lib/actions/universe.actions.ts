'use server';

/**
 * 股票池（universe.txt）的读写。
 *
 * 权威路径由本地 Python 服务决定（server.py 的 QLIB_ROOT → qlib_workspace/universe.txt），
 * 默认读 lib/config.ts 的 UNIVERSE_PATH（环境变量 QLIB_UNIVERSE_PATH 可覆盖）。
 *
 * 安全措施：写入前先做 .bak 备份、校验代码格式、查重，再用「临时文件 + 原子替换」落盘，
 * 避免进程被打断（本机存在睡眠/控制台关闭导致进程被杀的情况）时把股票池写坏。
 */
import fs from 'node:fs';
import path from 'node:path';
import { UNIVERSE_PATH } from '@/lib/config';

const SECTION_RE = /^#\s*-{2,}\s*(.+?)\s*-{2,}\s*$/;
/** Yahoo 风格代码：字母开头，可含数字、点或连字符 */
const SYMBOL_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export interface UniverseState {
    ok: boolean;
    path: string;
    symbols: string[];
    sections: { name: string; count: number }[];
    skipped: string[];
    error?: string;
}

export interface AddResult {
    ok: boolean;
    code: 'added' | 'duplicate' | 'invalid' | 'error';
    symbol: string;
    count?: number;
    backup?: string;
    error?: string;
}

function readLines(): string[] {
    const raw = fs.readFileSync(UNIVERSE_PATH, 'utf8');
    return raw.split(/\r?\n/);
}

/** 解析：返回纯代码列表 / 分组统计 / 被跳过的行 */
function parse(lines: string[]) {
    const symbols: string[] = [];
    const sections: { name: string; count: number }[] = [];
    const skipped: string[] = [];
    let current: { name: string; count: number } | null = null;

    for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        const sec = t.match(SECTION_RE);
        if (sec) {
            current = { name: sec[1], count: 0 };
            sections.push(current);
            continue;
        }
        if (t.startsWith('#')) continue;
        // 一行可能带行内注释，取第一段
        const token = t.split(/[\s,]+/)[0].trim();
        const sym = token.replace(/\./g, '-').toUpperCase();
        if (SYMBOL_RE.test(sym)) {
            symbols.push(sym);
            if (current) current.count += 1;
        } else if (token) {
            skipped.push(token);
        }
    }
    return { symbols, sections, skipped };
}

export async function readUniverse(): Promise<UniverseState> {
    try {
        const lines = readLines();
        const { symbols, sections, skipped } = parse(lines);
        return { ok: true, path: UNIVERSE_PATH, symbols, sections, skipped };
    } catch (err) {
        return {
            ok: false,
            path: UNIVERSE_PATH,
            symbols: [],
            sections: [],
            skipped: [],
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

/** 新增一只标的到股票池；指定分组时插入到该分组末尾，否则追加到文件末尾 */
export async function addUniverseSymbol(
    rawSymbol: string,
    section?: string,
): Promise<AddResult> {
    const symbol = (rawSymbol || '').trim().replace(/\./g, '-').toUpperCase();

    if (!SYMBOL_RE.test(symbol)) {
        return { ok: false, code: 'invalid', symbol };
    }

    try {
        if (!fs.existsSync(UNIVERSE_PATH)) {
            return { ok: false, code: 'error', symbol, error: `股票池文件不存在：${UNIVERSE_PATH}` };
        }

        const original = fs.readFileSync(UNIVERSE_PATH, 'utf8');
        const eol = original.includes('\r\n') ? '\r\n' : '\n';
        const lines = original.split(/\r?\n/);
        const { symbols } = parse(lines);

        if (symbols.includes(symbol)) {
            return { ok: false, code: 'duplicate', symbol, count: symbols.length };
        }

        // 备份（同一秒内重复调用也不覆盖：加序号）
        const stamp = new Date()
            .toISOString()
            .replace(/[-:T]/g, '')
            .slice(0, 14);
        let backup = path.join(path.dirname(UNIVERSE_PATH), `universe_backup_${stamp}.txt`);
        let n = 1;
        while (fs.existsSync(backup)) {
            backup = path.join(
                path.dirname(UNIVERSE_PATH),
                `universe_backup_${stamp}_${n++}.txt`,
            );
        }
        fs.writeFileSync(backup, original, 'utf8');

        const wantSection = (section || '').trim();
        if (wantSection) {
            const idx = lines.findIndex((l) => {
                const m = l.trim().match(SECTION_RE);
                return m && m[1].toLowerCase() === wantSection.toLowerCase();
            });
            if (idx === -1) {
                // 该分组不存在：新建到文件末尾（前面留一个空行）
                if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
                lines.push(`# ---------- ${wantSection} ----------`);
                lines.push(symbol);
            } else {
                // 插到该分组内最后一个非空行之后
                let insertAt = idx + 1;
                for (let i = idx + 1; i < lines.length; i++) {
                    const t = lines[i].trim();
                    if (SECTION_RE.test(t)) break;
                    if (t) insertAt = i + 1;
                }
                lines.splice(insertAt, 0, symbol);
            }
        } else {
            if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
            lines.push(symbol);
        }

        const out = lines.join(eol);
        const tmp = `${UNIVERSE_PATH}.tmp`;
        fs.writeFileSync(tmp, out, 'utf8');
        fs.renameSync(tmp, UNIVERSE_PATH);

        return {
            ok: true,
            code: 'added',
            symbol,
            count: symbols.length + 1,
            backup,
        };
    } catch (err) {
        return {
            ok: false,
            code: 'error',
            symbol,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
