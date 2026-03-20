import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="space-y-8 max-h-[calc(100vh-8rem)] flex flex-col">
            <div className="shrink-0">
                <Skeleton className="h-8 w-48 mb-6" />

                {/* Stepper Wizard Skeleton */}
                <div className="rounded-xl border border-border bg-card p-8 mb-6">
                    <div className="flex items-center justify-between max-w-3xl mx-auto">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-full" />
                                <div className="space-y-2 flex flex-col items-center">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Skeleton className="h-6 w-64 mb-4" />
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Sidebar Skeleton */}
                <div className="w-64 shrink-0 flex flex-col gap-4">
                    <Skeleton className="h-10 w-full" /> {/* Search */}
                    <div className="rounded-lg border border-border p-4 space-y-4 flex-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-4" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area Skeleton */}
                <div className="flex-1 rounded-xl border border-border p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-9 w-24 rounded-md" />
                    </div>

                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </div>
            </div>
        </div>
    )
}
