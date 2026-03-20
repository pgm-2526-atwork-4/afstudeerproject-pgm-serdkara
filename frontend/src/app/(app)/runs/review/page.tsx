import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"

export default function ReviewPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Human Review"
                description="Override or confirm LLM Judge verdicts."
            />
            <Card>
                <CardHeader>
                    <CardTitle>Pending Reviews</CardTitle>
                    <CardDescription>Verdicts that require manual confirmation.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground p-8 text-center border rounded-lg border-dashed">
                        No pending reviews found.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
