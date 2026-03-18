"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { InfoTooltip } from "@/components/ui/InfoTooltip"
import { Spinner } from "@/components/ui/Spinner"
import { apiUrl } from "@/lib/api"

export default function JudgeTemplatesPage() {
    const [showTestRubric, setShowTestRubric] = useState(false)
    const [isTestingJudge, setIsTestingJudge] = useState(false)
    const [judgeTestResult, setJudgeTestResult] = useState<{ verdict?: string; classification?: string; reasoning?: string; error?: string } | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [systemPrompt, setSystemPrompt] = useState("")
    const [rubric, setRubric] = useState("")
    const [sourceText, setSourceText] = useState("")
    const [claimText, setClaimText] = useState("")
    const [latestAgreement, setLatestAgreement] = useState<{ agreement_rate: number; correct: number; total: number } | null>(null)

    useEffect(() => {
        fetch(apiUrl("/api/config/llm"))
            .then(res => res.json())
            .then(data => {
                if (data.judge_system_prompt) setSystemPrompt(data.judge_system_prompt);
                if (data.judge_evaluation_rubric) setRubric(data.judge_evaluation_rubric);
            })
            .catch(err => console.error("Failed to fetch judge config", err));
    }, [])

    useEffect(() => {
        fetch(apiUrl('/api/golden-set/benchmark/latest'))
            .then(res => res.json())
            .then(data => {
                const latest = data?.latest
                if (latest && typeof latest.agreement_rate === 'number') {
                    setLatestAgreement({
                        agreement_rate: latest.agreement_rate,
                        correct: latest.correct || 0,
                        total: latest.total || 0,
                    })
                }
            })
            .catch(err => console.error('Failed to fetch latest benchmark', err))
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await fetch(apiUrl("/api/config/llm"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    judge_system_prompt: systemPrompt,
                    judge_evaluation_rubric: rubric
                })
            });
        } catch (err) {
            console.error("Failed to save judge config", err);
        }
        setIsSaving(false)
    }

    const handleRunJudgeTest = async () => {
        if (!sourceText.trim() || !claimText.trim()) {
            setJudgeTestResult({ error: 'Please provide both source text and extracted claim.' })
            return
        }

        setIsTestingJudge(true)
        setJudgeTestResult(null)
        try {
            const res = await fetch(apiUrl('/api/config/llm/test-judge'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_text: sourceText,
                    claim: claimText,
                    system_prompt: systemPrompt,
                    rubric,
                })
            })
            const data = await res.json()
            if (!res.ok) {
                setJudgeTestResult({ error: data?.error || 'Judge test failed' })
                return
            }
            setJudgeTestResult(data)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            setJudgeTestResult({ error: message })
        } finally {
            setIsTestingJudge(false)
        }
    }
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-medium tracking-tight mb-6">Configuration</h1>

                {/* Stepper Wizard Mock for Phase 2 */}
                <Card className="p-8">
                    <div className="flex items-start justify-between max-w-3xl mx-auto relative px-4 lg:px-0">
                        {/* Connecting lines background */}
                        <div className="absolute top-5 left-10 right-10 lg:left-14 lg:right-14 h-0.5 bg-border z-0"></div>
                        {/* Progress line (Step 2 -> 50% width) */}
                        <div className="absolute top-5 left-10 lg:left-14 w-1/2 h-0.5 bg-primary z-0 transition-all duration-500"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center gap-2 lg:gap-3 flex-1">
                            <Link href="/configuration/checks" className="w-10 h-10 rounded-full shrink-0 bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">1</Link>
                            <div className="text-center h-auto min-h-12 px-1">
                                <div className="text-xs lg:text-sm font-semibold text-foreground">Checks Library</div>
                                <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">Define security requirements</div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center gap-2 lg:gap-3 flex-1">
                            <Link href="/configuration/judge" className="w-10 h-10 rounded-full shrink-0 bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">2</Link>
                            <div className="text-center h-auto min-h-12 px-1">
                                <div className="text-xs lg:text-sm font-semibold text-foreground">Judge Configuration</div>
                                <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">Configure evaluation rubric</div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center gap-2 lg:gap-3 flex-1">
                            <Link href="/configuration/settings" className="w-10 h-10 rounded-full shrink-0 bg-sidebar border-2 border-border text-muted-foreground flex items-center justify-center font-medium cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors">3</Link>
                            <div className="text-center h-auto min-h-12 px-1">
                                <div className="text-xs lg:text-sm font-medium text-muted-foreground">LLM Settings</div>
                                <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">Choose models & parameters</div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div>
                <h2 className="text-lg font-medium tracking-tight mb-4">Judge Configuration</h2>
                <p className="text-sm text-muted-foreground mb-6">Configure <span className="font-semibold text-foreground">how</span> the judge LLM evaluates extraction outputs. The judge&apos;s verdict is compared against your human expert reviews to track agreement and improve accuracy over time.</p>

                <Card className="p-6">
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground flex items-center">
                                Evaluation Rubric
                                <InfoTooltip title="Evaluation Rubric">
                                    This defines the exact criteria the Judge LLM uses to score the extracted policy text. The 1-5 scale across different dimensions (Correctness, Completeness, Consistency, Security Relevance, Traceability) determines whether the check passes or fails.
                                </InfoTooltip>
                            </h3>
                            <div className="bg-[#2a245a] border border-[#3b2d71] rounded-lg p-4">
                                <div className="text-sm font-medium text-primary-foreground mb-1">
                                    Human Agreement: <span className="text-emerald-400">{latestAgreement ? `${latestAgreement.agreement_rate.toFixed(1)}%` : 'N/A'}</span>
                                    {latestAgreement ? ` (${latestAgreement.correct} agree / ${latestAgreement.total - latestAgreement.correct} disagree across ${latestAgreement.total} reviews)` : ' (run benchmark to populate)'}
                                </div>
                                <div className="text-xs text-[#a59ce0] flex gap-2">
                                    <span>💡</span> When you accept/deny extraction results in Runs, this tracks how often the judge&apos;s verdict matches your expert opinion.
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">System Prompt</h3>
                            <textarea
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                className="w-full bg-sidebar border border-border rounded-lg p-4 text-xs font-mono text-muted-foreground min-h-20 focus:outline-none focus:border-primary/50"
                            />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Evaluation Rubric</h3>
                            <textarea
                                value={rubric}
                                onChange={(e) => setRubric(e.target.value)}
                                className="w-full bg-sidebar border border-border rounded-lg p-4 text-xs font-mono text-muted-foreground h-55 focus:outline-none focus:border-primary/50"
                            />
                        </div>

                        <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                            <button
                                onClick={() => setShowTestRubric(!showTestRubric)}
                                className="w-full bg-primary/20 hover:bg-primary/30 transition-colors border border-primary/30 rounded-lg p-3 flex items-center justify-between cursor-pointer"
                            >
                                <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground">
                                    <span className="opacity-70">🧪</span> Test Judge Rubric
                                </div>
                                {showTestRubric ? <ChevronDown className="h-4 w-4 text-primary-foreground" /> : <ChevronRight className="h-4 w-4 text-primary-foreground" />}
                            </button>

                            {showTestRubric && (
                                <div className="p-5 space-y-6 border-t border-border/50 animate-in fade-in slide-in-from-top-2 bg-primary/5 rounded-b-lg">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-foreground">Source Text:</h4>
                                        <textarea
                                            value={sourceText}
                                            onChange={(e) => setSourceText(e.target.value)}
                                            placeholder="Paste source policy text here..."
                                            className="w-full bg-sidebar border border-border/50 rounded-lg p-4 text-sm text-foreground min-h-25 focus:outline-none focus:border-primary/50 resize-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-foreground">Extracted Claim:</h4>
                                        <textarea
                                            value={claimText}
                                            onChange={(e) => setClaimText(e.target.value)}
                                            placeholder="Paste the extracted claim you want the Judge to evaluate..."
                                            className="w-full bg-sidebar border border-border/50 rounded-lg p-4 text-sm text-foreground min-h-25 focus:outline-none focus:border-primary/50 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <Button
                                            onClick={handleRunJudgeTest}
                                            disabled={isTestingJudge}
                                            className="bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors"
                                        >
                                            {isTestingJudge ? <Spinner size="sm" className="mr-2" /> : null}
                                            {isTestingJudge ? 'Running...' : 'Run Judge Test'}
                                        </Button>
                                    </div>

                                    {judgeTestResult && (
                                        <div className="bg-[#1a1d27] border border-border/40 rounded-lg p-5 space-y-3 animate-in fade-in slide-in-from-top-2 mt-4">
                                            <h4 className="text-sm font-bold text-foreground">Judge Result:</h4>
                                            {judgeTestResult.error ? (
                                                <div className="text-sm text-rose-500">{judgeTestResult.error}</div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground leading-relaxed">
                                                    Verdict: <span className="text-foreground font-medium">{judgeTestResult.verdict || 'UNKNOWN'}</span> <span className="mx-2 opacity-50">|</span>
                                                    Classification: <span className="text-foreground font-medium">{judgeTestResult.classification || 'UNKNOWN'}</span>
                                                    <p className="mt-2"><span className="text-foreground font-medium">Reasoning:</span> {judgeTestResult.reasoning || 'No reasoning returned.'}</p>
                                                </div>
                                            )}
                                            <div className="bg-black/20 border border-white/5 rounded pl-3 pr-4 py-2 mt-2 flex items-center gap-2 text-xs text-muted-foreground/80">
                                                <span className="opacity-90">💡</span> Iterate on your rubric above and re-test until you get the desired evaluation behavior.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-primary hover:bg-primary/90 text-white font-medium px-6"
                            >
                                {isSaving ? <Spinner size="sm" className="mr-2 text-white" /> : null}
                                {isSaving ? "Saving..." : "Save Rubric"}
                            </Button>
                        </div>
                    </div>
                </Card>

                <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-8">
                    <Button asChild variant="outline" className="bg-transparent w-full sm:w-auto border-transparent text-muted-foreground hover:text-foreground">
                        <Link href="/configuration/checks">← Back: Checks</Link>
                    </Button>
                    <Button asChild className="bg-primary w-full sm:w-auto text-white hover:bg-primary/90 transition-colors">
                        <Link href="/configuration/settings">Next: Settings →</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
