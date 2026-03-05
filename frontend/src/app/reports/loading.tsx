import { Skeleton } from "@/components/ui/Skeleton"
import { PageHeader } from "@/components/layout/PageHeader"

export default function Loading() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Reports & Analytics"
                description="System-wide agreement scores and validation metrics."
            />
            <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-border bg-card text-card-foreground shadow space-y-1.5 p-6">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
            </div>

            <div className="mt-8">
                <Skeleton className="h-10 w-48 mb-4" />
                <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
        </div>
    )
}
