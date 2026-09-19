'use server';

import { revalidatePath } from 'next/cache';
import { store, LOCAL_USER_ID } from '@/lib/store/json-store';
import { addUniverseSymbol } from '@/lib/actions/universe.actions';

// 登录已移除，userId 参数保留以最小化调用方改动，实际统一归到本地单用户。
// -- CRUD Operations --

export async function addToWatchlist(userId: string, symbol: string, company: string) {
    try {
        const item = store.upsertWatchlist(userId || LOCAL_USER_ID, symbol, company);
        // 自动进入量化股池：universe.txt 去重写入（重复时无更改），配合「更新数据→训练导出」生效
        try {
            await addUniverseSymbol(item.symbol, '');
        } catch (err) {
            console.error('[watchlist] 自动加入股票池失败', err);
        }
        return item;
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        throw new Error('Failed to add to watchlist');
    } finally {
        revalidatePath('/watchlist');
    }
}

export async function removeFromWatchlist(userId: string, symbol: string) {
    try {
        store.removeWatchlist(userId || LOCAL_USER_ID, symbol);
        revalidatePath('/watchlist');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        throw new Error('Failed to remove from watchlist');
    }
}

export async function getUserWatchlist(userId: string) {
    try {
        return store.listWatchlist(userId || LOCAL_USER_ID);
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        return [];
    }
}

export async function isStockInWatchlist(userId: string, symbol: string) {
    try {
        return store.isInWatchlist(userId || LOCAL_USER_ID, symbol);
    } catch (error) {
        console.error('Error checking watchlist status:', error);
        return false;
    }
}

// 供流水线 / 其它模块按邮箱取自选（本地单用户，忽略 email）
export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];
    try {
        return store.watchlistSymbols();
    } catch (err) {
        console.error('getWatchlistSymbolsByEmail error:', err);
        return [];
    }
}
