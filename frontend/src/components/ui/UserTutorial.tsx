"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { CheckCircle2, ArrowRight, X } from "lucide-react"

const TUTORIAL_STEPS = [
    {
        title: "1. The High-Level Overview",
        description: "Your compliance health at a glance.",
        content: "The Dashboard tracks how accurately the AI is judging documents compared to your human experts. Monitor your Golden Baselines here.",
        targetId: "dashboard"
    },
    {
        title: "2. Drop & Go Analysis",
        description: "The fastest way to validate a document.",
        content: "Upload your policy PDFs here. We automatically detect the framework and run the relevant checks instantly.",
        targetId: "documents"
    },
    {
        title: "3. Complete Customization",
        description: "Tailor the AI to your exact needs.",
        content: "Define your Checks Library, tune the Judge's Evaluation Rubric, and configure LLM settings all from this central hub.",
        targetId: "configuration"
    },
    {
        title: "4. Review & Iterate",
        description: "Deep dive into the AI's assessment.",
        content: "View the side-by-side comparison, read the Conversational Judge's reasoning, and easily 'Agree' or 'Disagree' to improve future runs.",
        targetId: "runs"
    }
]

export function UserTutorial() {
    const { isTutorialActive, endTutorial } = useAuth()
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

    useEffect(() => {
        if (!isTutorialActive) return;

        const updateRect = () => {
            const step = TUTORIAL_STEPS[currentStep]
            if (!step.targetId) {
                setTargetRect(null)
                return
            }
            const el = document.querySelector(`[data-tutorial-step="${step.targetId}"]`)
            if (el) {
                setTargetRect(el.getBoundingClientRect())
            } else {
                setTargetRect(null)
            }
        }

        updateRect()
        window.addEventListener('resize', updateRect)
        // A short delay to ensure rendering is complete
        const timeout = setTimeout(updateRect, 100)

        return () => {
            window.removeEventListener('resize', updateRect)
            clearTimeout(timeout)
        }
    }, [currentStep, isTutorialActive])

    if (!isTutorialActive) return null

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            handleComplete()
        }
    }

    const handleComplete = () => {
        setCurrentStep(0)
        endTutorial()
    }

    const step = TUTORIAL_STEPS[currentStep]

    // Calculate Spotlight constraints
    // Padding around the highlighted element
    const padding = 8

    let boxX = 0;
    let boxY = 0;
    let boxW = 0;
    let boxH = 0;

    // Dialog Positioning
    let dialogLeft = "50%"
    let dialogTop = "50%"
    let dialogTransform = "translate(-50%, -50%)"

    if (targetRect) {
        boxX = targetRect.left - padding
        boxY = targetRect.top - padding
        boxW = targetRect.width + (padding * 2)
        boxH = targetRect.height + (padding * 2)

        // Position dialog to the right of the spotlight with a 24px gap
        // Since the sidebar is on the left, this works perfectly.
        dialogLeft = `${boxX + boxW + 24}px`
        dialogTop = `${boxY}px`
        dialogTransform = "translate(0, 0)"
    }

    return (
        <div className="fixed inset-0 z-[200] pointer-events-auto">
            {/* SVG Overlay for Spotlight effect */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <mask id="spotlight-mask">
                        {/* Fill mask with white (opaque) */}
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {/* Draw black (transparent) cutout over the target */}
                        {targetRect && (
                            <rect
                                x={boxX}
                                y={boxY}
                                width={boxW}
                                height={boxH}
                                rx="12"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                {/* The actual darkened backdrop */}
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.7)"
                    mask="url(#spotlight-mask)"
                    className="backdrop-blur-[2px]"
                />

                {/* Optional: Add a pulsing border around the cutout */}
                {targetRect && (
                    <rect
                        x={boxX}
                        y={boxY}
                        width={boxW}
                        height={boxH}
                        rx="12"
                        fill="none"
                        stroke="rgba(109, 85, 255, 0.8)" /* Primary color */
                        strokeWidth="2"
                        className="animate-pulse"
                    />
                )}
            </svg>

            {/* Explanatory Dialog */}
            <div
                className="absolute bg-card border border-border shadow-2xl rounded-2xl w-[400px] overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-auto"
                style={{
                    left: dialogLeft,
                    top: dialogTop,
                    transform: dialogTransform,
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header Actions */}
                <div className="flex justify-end p-3 pb-0">
                    <button
                        onClick={handleComplete}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                        title="Skip Tutorial"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 pt-1 flex flex-col">
                    <h2 className="text-xl font-bold mb-2 text-foreground">{step.title}</h2>
                    <p className="text-sm font-medium text-primary mb-3">{step.description}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>
                </div>

                {/* Footer/Navigation */}
                <div className="p-4 bg-sidebar border-t border-border flex items-center justify-between">
                    <div className="flex gap-1.5">
                        {TUTORIAL_STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-5 bg-primary' : 'w-1.5 bg-primary/20'}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                    >
                        {currentStep === TUTORIAL_STEPS.length - 1 ? (
                            <>Got it <CheckCircle2 className="w-4 h-4" /></>
                        ) : (
                            <>Next <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
