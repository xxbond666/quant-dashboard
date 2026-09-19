"use client";

import React from "react";
import { translate, type Locale } from '@/lib/i18n/messages';
import { Trash2, Bell } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { deleteAlert } from "@/lib/actions/alert.actions";
import type { AlertItem } from "@/lib/store/json-store";

interface AlertsPanelProps {
    alerts: AlertItem[];
    onRefresh?: () => void;
}

export default function AlertsPanel({ alerts, onRefresh, locale = 'zh' }: AlertsPanelProps & { locale?: Locale }) {
    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this alert?")) {
            await deleteAlert(id);
            if (onRefresh) onRefresh();
        }
    };

    return (
        <div className="bg-background/30 rounded-lg border border-border p-4 h-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-yellow-500" />
                    {translate(locale, 'watchlist.alerts')}
                </h2>
                {/* <button className="text-sm text-yellow-500 hover:underline">Create Alert</button> */}
            </div>

            <div className="space-y-3">
                {alerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        {translate(locale, 'watchlist.noAlerts')}
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div key={alert._id} className="bg-muted/40 rounded-lg p-3 border border-border relative group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-xs text-foreground">
                                            {alert.symbol[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-foreground text-sm">{alert.symbol}</div>
                                            <div className="text-xs text-muted-foreground">Target: {formatCurrency(alert.targetPrice)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-yellow-500 font-medium">
                                        {translate(locale, 'watchlist.condition', { cond: alert.condition.toLowerCase(), price: formatCurrency(alert.targetPrice) })}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                        Active until {new Date(new Date(alert.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <button
                                        onClick={() => handleDelete(alert._id)}
                                        className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
