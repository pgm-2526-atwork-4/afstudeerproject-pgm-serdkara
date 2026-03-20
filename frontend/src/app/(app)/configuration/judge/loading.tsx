import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="space-y-8">
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
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-full max-w-2xl mb-6" />
                <Skeleton className="h-4 w-3/4 max-w-2xl mb-8" />

                <div className="rounded-xl border border-border p-6 space-y-8">
                    {/* Rubric metrics */}
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                    </div>

                    {/* Textareas */}
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                    </div>

                    <div className="space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-[220px] w-full rounded-lg" />
                    </div>

                    {/* Test accordion */}
                    <Skeleton className="h-12 w-full rounded-lg" />

                    {/* Save button */}
                    <Skeleton className="h-10 w-32 rounded-md" />
                </div>
            </div>
        </div>
    )
}
