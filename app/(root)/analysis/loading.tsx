export default function AnalysisLoading() {
    return (
        <div className="min-h-screen bg-background p-6 md:p-8">
            <div className="mb-6 h-9 w-32 animate-pulse rounded bg-muted" />
            <div className="space-y-6">
                <div className="h-[190px] animate-pulse rounded-2xl border border-border bg-card" />
                <div className="h-[260px] animate-pulse rounded-2xl border border-border bg-card" />
            </div>
        </div>
    );
}
