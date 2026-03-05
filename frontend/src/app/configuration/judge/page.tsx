"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { InfoTooltip } from "@/components/ui/InfoTooltip"
import { Spinner } from "@/components/ui/Spinner"

export default function JudgeTemplatesPage() {
    const [showTestRubric, setShowTestRubric] = useState(false)
    const [showJudgeResult, setShowJudgeResult] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = () => {
        setIsSaving(true)
        setTimeout(() => setIsSaving(false), 800)
    }
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-medium tracking-tight mb-6">Configuration</h1>

                {/* Stepper Wizard Mock for Phase 2 */}
                <Card className="p-8">
                    <div className="flex items-center justify-between max-w-3xl mx-auto relative">
                        {/* Connecting lines */}
                        <div className="absolute top-5 left-[16%] right-[16%] h-[2px] bg-border z-0"></div>
                        {/* Progress line extending to step 2 (50% width between step 1 and 3) */}
                        <div className="absolute top-5 left-[16%] right-1/2 h-[2px] bg-primary z-0"></div>

                        {/* Steps Container */}
                        <div className="relative z-10 grid grid-cols-3 w-full">
                            {/* Step 1 */}
                            <div className="flex flex-col items-center gap-2 md:gap-3">
                                <Link href="/configuration/checks" className="w-10 h-10 rounded-full shrink-0 bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">1</Link>
                                <div className="text-center h-12 md:h-auto">
                                    <div className="text-xs md:text-sm font-semibold text-foreground">Checks Library</div>
                                    <div className="hidden md:block text-xs text-muted-foreground">Define security requirements</div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col items-center gap-2 md:gap-3">
                                <Link href="/configuration/judge" className="w-10 h-10 rounded-full shrink-0 bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">2</Link>
                                <div className="text-center h-12 md:h-auto">
                                    <div className="text-xs md:text-sm font-semibold text-foreground">Judge Configuration</div>
                                    <div className="hidden md:block text-xs text-muted-foreground">Configure evaluation rubric</div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col items-center gap-2 md:gap-3">
                                <Link href="/configuration/settings" className="w-10 h-10 rounded-full shrink-0 bg-sidebar border-2 border-border text-muted-foreground flex items-center justify-center font-medium cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors">3</Link>
                                <div className="text-center h-12 md:h-auto">
                                    <div className="text-xs md:text-sm font-medium text-muted-foreground">LLM Settings</div>
                                    <div className="hidden md:block text-xs text-muted-foreground">Choose models & parameters</div>
                                </div>
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
                                    Human Agreement: <span className="text-emerald-400">87%</span> (41 agree / 6 disagree across 47 reviews)
                                </div>
                                <div className="text-xs text-[#a59ce0] flex gap-2">
                                    <span>💡</span> When you accept/deny extraction results in Runs, this tracks how often the judge&apos;s verdict matches your expert opinion.
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">System Prompt</h3>
                            <textarea
                                defaultValue="You are a security policy validator. Your task is to evaluate extracted information from security documents and provide a verdict on whether the extraction satisfactorily answers the check requirement."
                                className="w-full bg-sidebar border border-border rounded-lg p-4 text-xs font-mono text-muted-foreground min-h-[80px] focus:outline-none focus:border-primary/50"
                            />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Evaluation Rubric</h3>
                            <textarea
                                defaultValue={`3. Consistency: Is it internally consistent and logical?
   1=Major contradictions, 3=Mostly consistent, 5=Perfectly consistent

4. Security Relevance: Does it directly address the security requirement?
   1=Off-topic, 3=Somewhat relevant, 5=Perfectly on-target

5. Traceability: Can findings be traced to specific sections?
   1=No sources cited, 3=Some sources, 5=All claims sourced

Provide: Overall Verdict (Satisfactory/Unsatisfactory), Overall Score (average of 5 criteria), Brief reasoning, Confidence %`}
                                className="w-full bg-sidebar border border-border rounded-lg p-4 text-xs font-mono text-muted-foreground h-[220px] focus:outline-none focus:border-primary/50"
                            />
                        </div>

                        <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                            <button
                                onClick={() => setShowTestRubric(!showTestRubric)}
                                className="w-full bg-primary/20 hover:bg-primary/30 transition-colors border border-primary/30 rounded-lg p-3 flex items-center justify-between transition-colors"
                            >
                                <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground">
                                    <span className="opacity-70">🧪</span> Test Judge Rubric
                                </div>
                                {showTestRubric ? <ChevronDown className="h-4 w-4 text-primary-foreground" /> : <ChevronRight className="h-4 w-4 text-primary-foreground" />}
                            </button>

                            {showTestRubric && (
                                <div className="p-5 space-y-6 border-t border-border/50 animate-in fade-in slide-in-from-top-2 bg-primary/5 rounded-b-lg">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-foreground">Sample Extraction Output:</h4>
                                        <textarea
                                            placeholder="Paste a sample extraction output here to test how your judge rubric evaluates it..."
                                            className="w-full bg-sidebar border border-border/50 rounded-lg p-4 text-sm text-foreground min-h-[100px] focus:outline-none focus:border-primary/50 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <Button
                                            onClick={() => setShowJudgeResult(true)}
                                            className="bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors"
                                        >
                                            Run Judge Test
                                        </Button>
                                    </div>

                                    {showJudgeResult && (
                                        <div className="bg-[#1a1d27] border border-border/40 rounded-lg p-5 space-y-3 animate-in fade-in slide-in-from-top-2 mt-4">
                                            <h4 className="text-sm font-bold text-foreground">Judge Result:</h4>
                                            <div className="text-sm text-muted-foreground leading-relaxed">
                                                Verdict: <span className="text-foreground font-medium">Satisfactory</span> <span className="mx-2 opacity-50">|</span>
                                                Score: <span className="text-foreground font-medium">4.2/5</span> <span className="mx-2 opacity-50">|</span>
                                                Correctness: <span className="text-foreground">5</span>,
                                                Completeness: <span className="text-foreground">4</span>,
                                                Consistency: <span className="text-foreground">4</span>,
                                                Security Relevance: <span className="text-foreground">5</span>,
                                                Traceability: <span className="text-foreground">3</span> <span className="mx-2 opacity-50">|</span>
                                                Confidence: <span className="text-foreground font-medium">87%</span>
                                            </div>
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
                    <Button asChild className="bg-primary/20 w-full sm:w-auto text-primary hover:bg-primary hover:text-white transition-colors">
                        <Link href="/configuration/settings">Next: Settings →</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
