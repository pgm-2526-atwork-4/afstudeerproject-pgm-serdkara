import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="space-y-8 max-w-4xl">
            <div>
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
            </div>

            <div>
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-6" />

                <div className="space-y-6">
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-xl border border-border p-6 space-y-6">
                            <Skeleton className="h-6 w-48" />

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-64" />
                                    </div>
                                    <Skeleton className="h-10 w-48 rounded-md" />
                                </div>
                                <div className="flex items-center justify-between border-t border-border pt-6">
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-40" />
                                        <Skeleton className="h-4 w-72" />
                                    </div>
                                    <Skeleton className="h-6 w-12 rounded-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
