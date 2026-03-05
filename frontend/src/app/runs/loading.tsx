import { Skeleton } from "@/components/ui/Skeleton"
import { PageHeader } from "@/components/layout/PageHeader"

export default function Loading() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Validation Runs"
                description="History of all document analyses and their compliance scores."
            />

            <div className="flex justify-between items-end mb-6">
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-64 rounded-md" />
                    <Skeleton className="h-9 w-24 rounded-md" />
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border p-4 flex justify-between">
                    <Skeleton className="h-5 w-48" />
                </div>

                <div className="divide-y divide-border">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div>
                                    <Skeleton className="h-4 w-48 mb-2" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-6 w-24 rounded-full" />
                                <Skeleton className="h-8 w-24 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
