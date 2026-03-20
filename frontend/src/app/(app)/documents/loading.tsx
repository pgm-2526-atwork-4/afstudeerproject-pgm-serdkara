import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="max-w-6xl mx-auto pb-12">
            <div className="flex justify-between items-end mb-8 mt-4">
                <div>
                    <Skeleton className="h-10 w-64 mb-3" />
                    <Skeleton className="h-5 w-96" />
                </div>
            </div>

            {/* Drop & Go Area Skeleton */}
            <Skeleton className="w-full min-h-[300px] rounded-2xl mb-12" />

            {/* Recent Activity List Skeleton */}
            <div>
                <Skeleton className="h-7 w-48 mb-6" />
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-border rounded-xl">
                            <div className="flex items-start gap-4">
                                <Skeleton className="w-10 h-10 rounded-lg" />
                                <div>
                                    <Skeleton className="h-5 w-48 mb-2" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4 sm:mt-0">
                                <Skeleton className="h-9 w-28 rounded-lg" />
                                <Skeleton className="h-9 w-32 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
