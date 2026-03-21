"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { authFetch } from "@/lib/api"
import { Spinner } from "@/components/ui/Spinner"

type ReviewItem = {
    run_id: string
    document_id: string
    document_name: string
    check_id: string
    check_name: string
    status: 'agree' | 'disagree' | 'flag'
    comments?: string
    timestamp?: string
    judge_verdict?: string
    judge_score?: number
}

export default function ReviewPage() {
    const [items, setItems] = useState<ReviewItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'flag' | 'disagree' | 'agree'>('all')

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const qs = filter === 'all' ? '' : `?status=${filter}`
                const res = await authFetch(`/api/reviews${qs}`)
                if (!res.ok) {
                    setItems([])
                    return
                }
                const data = await res.json()
                setItems(Array.isArray(data?.items) ? data.items : [])
            } catch {
                setItems([])
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [filter])

    const statusCounts = useMemo(() => ({
        agree: items.filter(i => i.status === 'agree').length,
        disagree: items.filter(i => i.status === 'disagree').length,
        flag: items.filter(i => i.status === 'flag').length,
    }), [items])

    return (
        <div className="space-y-6">
            <PageHeader
                title="Human Review"
                description="Review outcomes are run-level confirmations (agree, disagree, flag), separate from baseline benchmark scores."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Reviewed Checks</CardTitle>
                    <CardDescription>Filter and open the original run result directly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 text-xs rounded border ${filter === 'all' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-sidebar border-border text-muted-foreground hover:text-foreground'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('flag')}
                            className={`px-3 py-1.5 text-xs rounded border ${filter === 'flag' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-sidebar border-border text-muted-foreground hover:text-foreground'}`}
                        >
                            Flag
                        </button>
                        <button
                            onClick={() => setFilter('disagree')}
                            className={`px-3 py-1.5 text-xs rounded border ${filter === 'disagree' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-sidebar border-border text-muted-foreground hover:text-foreground'}`}
                        >
                            Disagree
                        </button>
                        <button
                            onClick={() => setFilter('agree')}
                            className={`px-3 py-1.5 text-xs rounded border ${filter === 'agree' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-sidebar border-border text-muted-foreground hover:text-foreground'}`}
                        >
                            Agree
                        </button>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Visible counts - Agree: {statusCounts.agree}, Disagree: {statusCounts.disagree}, Flag: {statusCounts.flag}
                    </div>

                    {isLoading ? (
                        <div className="text-sm text-muted-foreground p-8 text-center border rounded-lg border-dashed flex items-center justify-center gap-2">
                            <Spinner size="sm" /> Loading reviews...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-8 text-center border rounded-lg border-dashed">
                            No reviewed checks found for this filter.
                        </div>
                    ) : (
                        <div className="border border-border rounded-lg overflow-x-auto">
                            <table className="w-full text-sm min-w-180">
                                <thead className="bg-sidebar border-b border-border text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Timestamp</th>
                                        <th className="px-3 py-2 text-left">Document</th>
                                        <th className="px-3 py-2 text-left">Check</th>
                                        <th className="px-3 py-2 text-left">Review</th>
                                        <th className="px-3 py-2 text-left">Judge</th>
                                        <th className="px-3 py-2 text-right">Open</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {items.map((item) => {
                                        const statusClass = item.status === 'agree'
                                            ? 'text-emerald-500 bg-emerald-500/10'
                                            : item.status === 'disagree'
                                                ? 'text-rose-500 bg-rose-500/10'
                                                : 'text-amber-500 bg-amber-500/10'
                                        return (
                                            <tr key={`${item.run_id}-${item.check_id}-${item.timestamp || ''}`} className="hover:bg-sidebar/30">
                                                <td className="px-3 py-2 text-muted-foreground">{item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}</td>
                                                <td className="px-3 py-2">{item.document_name}</td>
                                                <td className="px-3 py-2">{item.check_id} - {item.check_name}</td>
                                                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>{item.status}</span></td>
                                                <td className="px-3 py-2 text-muted-foreground">{item.judge_verdict || '-'} {typeof item.judge_score === 'number' ? `(${item.judge_score}/5)` : ''}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <Link
                                                        href={`/runs/results?runId=${encodeURIComponent(item.run_id)}`}
                                                        className="text-primary hover:text-primary/80"
                                                    >
                                                        Open Run
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
