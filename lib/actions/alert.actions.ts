'use server';

import { revalidatePath } from 'next/cache';
import { store, LOCAL_USER_ID, type AlertItem } from '@/lib/store/json-store';

// 本地 JSON 存储，替代原 Mongoose 模型（登录已移除）。

export async function createAlert(params: {
    userId: string;
    symbol: string;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
}): Promise<AlertItem> {
    try {
        const created = store.createAlert({
            ...params,
            userId: params.userId || LOCAL_USER_ID,
        });
        revalidatePath('/watchlist');
        return created;
    } catch (error) {
        console.error('Error creating alert:', error);
        throw new Error('Failed to create alert');
    }
}

export async function getUserAlerts(userId: string): Promise<AlertItem[]> {
    try {
        return store.listAlerts(userId || LOCAL_USER_ID);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
    }
}

export async function deleteAlert(alertId: string) {
    try {
        store.deleteAlert(alertId);
        revalidatePath('/watchlist');
        return { success: true };
    } catch (error) {
        console.error('Error deleting alert:', error);
        throw new Error('Failed to delete alert');
    }
}

export async function toggleAlert(alertId: string, active: boolean) {
    try {
        store.setAlertActive(alertId, active);
        revalidatePath('/watchlist');
        return { success: true };
    } catch (error) {
        console.error('Error toggling alert:', error);
        throw new Error('Failed to update alert');
    }
}
