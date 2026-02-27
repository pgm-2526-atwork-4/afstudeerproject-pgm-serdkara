"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function LLMSettingsPage() {
    const [showExtParams, setShowExtParams] = useState(false)
    const [showJudgeParams, setShowJudgeParams] = useState(false)
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-medium tracking-tight mb-6">Configuration</h1>

                {/* Stepper Wizard Mock for Phase 2 */}
                <Card className="p-8">
                    <div className="flex items-center justify-between max-w-3xl mx-auto relative">
                        {/* Connecting lines */}
                        <div className="absolute top-5 left-10 right-10 h-[2px] bg-border z-0"></div>
                        {/* Progress line extending fully to step 3 (100% width) */}
                        <div className="absolute top-5 left-10 right-10 h-[2px] bg-primary z-0"></div>

                        {/* Steps */}
                        <div className="relative z-10 flex flex-col items-center gap-3">
                            <Link href="/configuration/checks" className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">1</Link>
                            <div className="text-center">
                                <div className="text-sm font-semibold text-foreground">Checks Library</div>
                                <div className="text-xs text-muted-foreground">Define security requirements</div>
                            </div>
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-3">
                            <Link href="/configuration/judge-templates" className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">2</Link>
                            <div className="text-center">
                                <div className="text-sm font-semibold text-foreground">Judge Configuration</div>
                                <div className="text-xs text-muted-foreground">Configure evaluation rubric</div>
                            </div>
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-3">
                            <Link href="/configuration/settings" className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium shadow-[0_0_15px_rgba(109,85,255,0.4)] cursor-pointer hover:scale-105 transition-transform">3</Link>
                            <div className="text-center">
                                <div className="text-sm font-bold text-foreground">LLM Settings</div>
                                <div className="text-xs text-muted-foreground">Choose models & parameters</div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div>
                <h2 className="text-lg font-medium tracking-tight mb-4">LLM Models & Parameters</h2>
                <p className="text-sm text-muted-foreground mb-6">Configure <span className="font-semibold text-foreground">which</span> AI models to use for extraction and judging. You can use the same model (self-judging) or different models (cross-judging) to catch more errors.</p>

                <div className="grid grid-cols-2 gap-6">
                    {/* Extraction Model Column */}
                    <Card className="p-6">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-semibold text-foreground mb-4">Extraction Model</h3>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Model</label>
                                    <select className="w-full bg-sidebar border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary appearance-none">
                                        <option>gpt-4o</option>
                                        <option>claude-3-5-sonnet</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                                <button
                                    onClick={() => setShowExtParams(!showExtParams)}
                                    className="w-full bg-white/[0.02] hover:bg-white/[0.04] px-4 py-3 flex items-center justify-between transition-colors"
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
                                                <label className="text-sm font-medium text-foreground">Temperature: <span className="text-primary font-semibold">0.3</span></label>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.1" defaultValue="0.3" className="w-full accent-primary bg-sidebar appearance-none h-2 rounded-full" />
                                            <div className="text-xs text-muted-foreground">Lower = more focused, Higher = more creative</div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-sm font-medium text-foreground block">Max Tokens</label>
                                            <input type="number" defaultValue="2000" className="w-full bg-sidebar border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-foreground">Top-p: <span className="text-primary font-semibold">0.9</span></label>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.05" defaultValue="0.9" className="w-full accent-destructive bg-sidebar appearance-none h-2 rounded-full [&::-webkit-slider-thumb]:bg-destructive" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Judge Model Column */}
                    <Card className="p-6">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-semibold text-foreground mb-4">Judge Model</h3>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Model</label>
                                    <select
                                        defaultValue="claude-3-5-sonnet (cross-judge)"
                                        className="w-full bg-sidebar border border-primary rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                                    >
                                        <option>gpt-4o (self-judge: same as extraction)</option>
                                        <option>claude-3-5-sonnet (cross-judge)</option>
                                        <option>gpt-4o-mini</option>
                                        <option>gemini-2.0-flash</option>
                                    </select>
                                </div>

                                <div className="mt-3 bg-[#1e2343] border border-[#2d3b76] rounded-lg p-3 text-xs text-[#8o93e2] flex items-center gap-2">
                                    <span>💡</span> Cross judging (different model than extraction) often catches more errors
                                </div>
                            </div>

                            <div className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200">
                                <button
                                    onClick={() => setShowJudgeParams(!showJudgeParams)}
                                    className="w-full bg-white/[0.02] hover:bg-white/[0.04] px-4 py-3 flex items-center justify-between transition-colors"
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
                                                <label className="text-sm font-medium text-foreground">Temperature: <span className="text-primary font-semibold">0.1</span></label>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.1" defaultValue="0.1" className="w-full accent-primary bg-sidebar appearance-none h-2 rounded-full" />
                                            <div className="text-xs text-muted-foreground">Judges should be more deterministic</div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-sm font-medium text-foreground block">Max Tokens</label>
                                            <input type="number" defaultValue="1000" className="w-full bg-sidebar border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-foreground">Top-p: <span className="text-primary font-semibold">0.95</span></label>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.05" defaultValue="0.95" className="w-full accent-destructive bg-sidebar appearance-none h-2 rounded-full [&::-webkit-slider-thumb]:bg-destructive" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-between mt-8">
                    <Button asChild variant="outline" className="bg-transparent border-border text-muted-foreground hover:text-foreground">
                        <Link href="/configuration/judge-templates">← Back: Judge Configuration</Link>
                    </Button>
                    <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white transition-colors px-6">
                        <Link href="/runs/results?newRun=true">Complete Setup ✓</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
