export default function DecisionsLoading() {
    return (
        <div className="min-h-screen bg-background p-6 md:p-8">
            <div className="mb-6 h-9 w-40 animate-pulse rounded bg-muted" />
            <div className="space-y-5">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-[180px] animate-pulse rounded-2xl border border-border bg-card"
                    />
                ))}
            </div>
        </div>
    );
}
