/**
 * 本地 JSON 存储层 —— 替代 MongoDB（登录功能已移除，单用户场景无需数据库）。
 *
 * 状态文件默认落在流水线产物目录，便于 daily_quant.py 读取自选股来优先保证数据新鲜度：
 *   E:\TradingAgents\results\app_state.json
 * 可用环境变量 APP_STATE_PATH 覆盖。
 *
 * 写入采用「临时文件 + 原子替换」，避免进程在中途被打断时写坏状态文件
 * （这台机器存在睡眠/控制台关闭导致进程被杀的情况）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { STATE_PATH } from '@/lib/config';

/** 登录已移除，全部数据归属这一个固定用户 */
export const LOCAL_USER_ID = 'local';

export interface WatchlistItem {
    userId: string;
    symbol: string;
    company: string;
    addedAt: string;
}

interface AppState {
    watchlist: WatchlistItem[];
}

function read(): AppState {
    try {
        const raw = fs.readFileSync(STATE_PATH, 'utf8');
        const parsed = JSON.parse(raw) as Partial<AppState>;
        return {
            watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
        };
    } catch {
        return { watchlist: [] };
    }
}

function write(state: AppState): void {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    const tmp = `${STATE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, STATE_PATH);
}

const now = () => new Date().toISOString();
const normalize = (symbol: string) => symbol.trim().toUpperCase();

export const store = {
    statePath: STATE_PATH,

    // ── 自选股 ──────────────────────────────────────────────
    listWatchlist(userId: string = LOCAL_USER_ID): WatchlistItem[] {
        return read()
            .watchlist.filter((i) => i.userId === userId)
            .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
    },

    upsertWatchlist(userId: string, symbol: string, company: string): WatchlistItem {
        const state = read();
        const sym = normalize(symbol);
        const idx = state.watchlist.findIndex(
            (i) => i.userId === userId && i.symbol === sym,
        );
        const item: WatchlistItem = {
            userId,
            symbol: sym,
            company: company || sym,
            addedAt: now(),
        };
        if (idx >= 0) {
            state.watchlist[idx] = { ...state.watchlist[idx], ...item };
        } else {
            state.watchlist.push(item);
        }
        write(state);
        return item;
    },

    removeWatchlist(userId: string, symbol: string): void {
        const state = read();
        const sym = normalize(symbol);
        state.watchlist = state.watchlist.filter(
            (i) => !(i.userId === userId && i.symbol === sym),
        );
        write(state);
    },

    isInWatchlist(userId: string, symbol: string): boolean {
        const sym = normalize(symbol);
        return read().watchlist.some(
            (i) => i.userId === userId && i.symbol === sym,
        );
    },

    watchlistSymbols(userId: string = LOCAL_USER_ID): string[] {
        return store.listWatchlist(userId).map((i) => i.symbol);
    },
};
