"use client";

import React from "react";
import { removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { X } from "lucide-react";

interface WatchlistStockChipProps {
    symbol: string;
    userId: string;
}

export default function WatchlistStockChip({ symbol, userId }: WatchlistStockChipProps) {
    const handleRemove = async () => {
        await removeFromWatchlist(userId, symbol);
    };

    return (
        <div className="group flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-muted/80 rounded-full border border-border transition-all">
            <a href={`/stocks/${symbol}`} className="font-semibold text-sm text-foreground hover:text-white">
                {symbol}
            </a>

            {/* Divider */}
            <div className="w-px h-4 bg-accent mx-1"></div>

            {/* Remove Button */}
            <form action={handleRemove}>
                <button type="submit" className="text-muted-foreground hover:text-red-400 p-0.5" title="Remove">
                    <X className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );
}
