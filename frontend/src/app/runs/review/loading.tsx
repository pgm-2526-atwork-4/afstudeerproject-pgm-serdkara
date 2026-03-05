import { Skeleton } from "@/components/ui/Skeleton"
import { PageHeader } from "@/components/layout/PageHeader"

export default function Loading() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Needs Review"
                description="Validations that were flagged by the Judge LLM and require human expert review."
            />

            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-warning/30 bg-warning/5 p-6">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-lg" />
                                <div>
                                    <Skeleton className="h-5 w-64 mb-2" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 bg-background rounded-lg p-5 border border-border/50">
                            <div>
                                <Skeleton className="h-4 w-32 mb-3" />
                                <Skeleton className="h-20 w-full rounded-md" />
                            </div>
                            <div>
                                <Skeleton className="h-4 w-32 mb-3" />
                                <Skeleton className="h-20 w-full rounded-md" />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Skeleton className="h-9 w-24 rounded-md" />
                            <Skeleton className="h-9 w-24 rounded-md" />
                            <Skeleton className="h-9 w-32 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
