"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { apiUrl } from "@/lib/api"

export default function LLMSettingsPage() {
    const [showExtParams, setShowExtParams] = useState(false)
    const [showJudgeParams, setShowJudgeParams] = useState(false)
    const [extractionModel, setExtractionModel] = useState("")
    const [judgeModel, setJudgeModel] = useState("")
    
    // Params state
    const [extTemp, setExtTemp] = useState(0.3)
    const [extMaxTokens, setExtMaxTokens] = useState(2000)
    const [extTopP, setExtTopP] = useState(0.9)
    const [judgeMaxTokens, setJudgeMaxTokens] = useState(1000)
    const [judgeTopP, setJudgeTopP] = useState(0.95)

    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

    useEffect(() => {
        fetch(apiUrl("/api/config/llm"))
            .then(res => res.json())
            .then(data => {
                if (data.extraction_model) setExtractionModel(data.extraction_model)
                if (data.judge_model) setJudgeModel(data.judge_model)
                
                if (data.extraction_temperature !== undefined) setExtTemp(data.extraction_temperature)
                if (data.extraction_max_tokens !== undefined) setExtMaxTokens(data.extraction_max_tokens)
                if (data.extraction_top_p !== undefined) setExtTopP(data.extraction_top_p)
                if (data.judge_max_tokens !== undefined) setJudgeMaxTokens(data.judge_max_tokens)
                if (data.judge_top_p !== undefined) setJudgeTopP(data.judge_top_p)
            })
            .catch(err => console.error("Failed to fetch config", err))
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        setSaveStatus("idle")
        try {
            const res = await fetch(apiUrl("/api/config/llm"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    extraction_model: extractionModel,
                    judge_model: judgeModel,
                    extraction_temperature: Number(extTemp),
                    extraction_max_tokens: Number(extMaxTokens),
                    extraction_top_p: Number(extTopP),
                    judge_max_tokens: Number(judgeMaxTokens),
                    judge_top_p: Number(judgeTopP)
                })
            })
            if (res.ok) {
                setSaveStatus("success")
                setTimeout(() => setSaveStatus("idle"), 3000)
            } else {
                setSaveStatus("error")
            }
        } catch (err) {
            console.error("Save error:", err)
            setSaveStatus("error")
        }
        setIsSaving(false)
    }
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-6">Configuration</h1>

                {/* Stepper Wizard Mock for Phase 2 */}
                <Card className="p-8">
                    <div className="flex items-start justify-between max-w-3xl mx-auto relative px-4 lg:px-0">
                        {/* Connecting lines background */}
                        <div className="absolute top-5 left-10 right-10 lg:left-14 lg:right-14 h-0.5 bg-border z-0"></div>
                        {/* Progress line (Step 3 -> 100% width) */}
                        <div className="absolute top-5 left-10 lg:left-14 right-10 lg:right-14 h-0.5 bg-primary z-0 transition-all duration-500"></div>

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
                            <Link href="/configuration/settings" className="w-10 h-10 rounded-full shrink-0 bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">3</Link>
                            <div className="text-center h-auto min-h-12 px-1">
                                <div className="text-xs lg:text-sm font-bold text-foreground">LLM Settings</div>
                                <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">Choose models & parameters</div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div>
                <h2 className="text-lg font-medium tracking-tight mb-4">LLM Models & Parameters</h2>
                <p className="text-sm text-muted-foreground mb-6">Configure <span className="font-semibold text-foreground">which</span> AI models to use for extraction and judging. You can use the same model (self-judging) or different models (cross-judging) to catch more errors.</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Extraction Model Column */}
                    <Card className="p-6 min-w-0">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-semibold text-foreground mb-4">Extraction Model</h3>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Model</label>
                                    <input
                                        type="text"
                                        value={extractionModel}
                                        onChange={(e) => setExtractionModel(e.target.value)}
                                        placeholder="e.g. openai/gpt-4o or anthropic/claude-3-5-sonnet"
                                        className="w-full bg-sidebar border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                                <button
                                    onClick={() => setShowExtParams(!showExtParams)}
                                    className="w-full bg-white/2 hover:bg-white/4 px-4 py-3 flex items-center justify-between transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-primary">⚡</span>
                                        <span className="text-sm font-medium">Parameters</span>
                                    </div>
                                    {showExtParams ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                </button>

                                {showExtParams && (
                                    <div className="p-5 space-y-6 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-foreground">Temperature: <span className="text-primary font-semibold">{extTemp}</span></label>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.1" value={extTemp} onChange={(e) => setExtTemp(Number(e.target.value))} className="w-full accent-primary bg-sidebar appearance-none h-2 rounded-full" />
                                            <div className="text-xs text-muted-foreground">Lower = more focused, Higher = more creative</div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-sm font-medium text-foreground block">Max Tokens</label>
                                            <input type="number" value={extMaxTokens} onChange={(e) => setExtMaxTokens(Number(e.target.value))} className="w-full bg-sidebar border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-foreground">Top-p: <span className="text-primary font-semibold">{extTopP}</span></label>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.05" value={extTopP} onChange={(e) => setExtTopP(Number(e.target.value))} className="w-full accent-destructive bg-sidebar appearance-none h-2 rounded-full [&::-webkit-slider-thumb]:bg-destructive" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Judge Model Column */}
                    <Card className="p-6 min-w-0">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-semibold text-foreground mb-4">Judge Model</h3>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Model</label>
                                    <input
                                        type="text"
                                        value={judgeModel}
                                        onChange={(e) => setJudgeModel(e.target.value)}
                                        placeholder="e.g. anthropic/claude-3.5-sonnet"
                                        className="w-full bg-sidebar border border-primary rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                                <button
                                    onClick={() => setShowJudgeParams(!showJudgeParams)}
                                    className="w-full bg-white/2 hover:bg-white/4 px-4 py-3 flex items-center justify-between transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-primary">⚡</span>
                                        <span className="text-sm font-medium">Parameters</span>
                                    </div>
                                    {showJudgeParams ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                </button>

                                {showJudgeParams && (
                                    <div className="p-5 space-y-6 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-foreground">Temperature: <span className="text-primary font-semibold">0.0</span></label>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.1" value="0" disabled className="w-full accent-primary bg-sidebar appearance-none h-2 rounded-full cursor-not-allowed opacity-50" />
                                            <div className="text-xs text-muted-foreground">The judge model must always be deterministic (temperature 0) for consistent evaluations.</div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-sm font-medium text-foreground block">Max Tokens</label>
                                            <input type="number" value={judgeMaxTokens} onChange={(e) => setJudgeMaxTokens(Number(e.target.value))} className="w-full bg-sidebar border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-foreground">Top-p: <span className="text-primary font-semibold">{judgeTopP}</span></label>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.05" value={judgeTopP} onChange={(e) => setJudgeTopP(Number(e.target.value))} className="w-full accent-destructive bg-sidebar appearance-none h-2 rounded-full [&::-webkit-slider-thumb]:bg-destructive" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-8">
                    <Button asChild variant="outline" className="bg-transparent w-full sm:w-auto border-border text-muted-foreground hover:text-foreground">
                        <Link href="/configuration/judge">← Back: Judge Config</Link>
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className={`w-full sm:w-auto text-white transition-colors px-6 cursor-pointer ${saveStatus === 'error' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                        {isSaving ? "Saving..." : saveStatus === "success" ? "Saved Successfully ✓" : saveStatus === "error" ? "Error Saving!" : "Save Settings"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
