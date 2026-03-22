"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { CheckCircle2, ArrowRight, X } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

const TUTORIAL_STEPS = [
    {
        title: "1. The High-Level Overview",
        description: "Your compliance health at a glance.",
        content: "The Dashboard tracks how accurately the AI is judging documents compared to your human experts. Monitor your Ground Truth Baselines here.",
        targetId: "dashboard",
        route: "/"
    },
    {
        title: "2. Drop & Go Analysis",
        description: "The fastest way to validate a document.",
        content: "Upload your policy PDFs here. We automatically detect the framework and run the relevant checks instantly.",
        targetId: "documents",
        route: "/documents"
    },
    {
        title: "3. Review & Iterate",
        description: "Deep dive into the AI's assessment.",
        content: "View the side-by-side comparison, read the Conversational Judge's reasoning, and easily 'Agree' or 'Disagree' to improve future runs.",
        targetId: "runs",
        route: "/runs/results"
    },
    {
        title: "4. Complete Customization",
        description: "Tailor the AI to your exact needs.",
        content: "Define your Checks Library, tune the Judge's Evaluation Rubric, and configure LLM settings all from this central hub.",
        targetId: "configuration",
        route: "/configuration/checks"
    },
    {
        title: "5. The Checks Library",
        description: "What exactly are we verifying?",
        content: "Checks are individual compliance requirements. You define exactly what needs to be verified in a document, such as verifying MFA or an Incident Response policy.",
        targetId: "checks-library",
        route: "/configuration/checks"
    },
    {
        title: "6. The Extraction Prompt",
        description: "Giving the AI sharp eyes.",
        content: "This tells the primary LLM precisely what text snippet to pull from the uploaded policy. Keep it specific so the Judge has the exact context it needs.",
        targetId: "extraction-prompt",
        route: "/configuration/checks"
    },
    {
        title: "7. Ground Truth Baselines",
        description: "The ground truth to measure against.",
        content: "This is crucial! Upload past documents and declare exactly what the answer *should* be. The system will track how often the AI agrees with your authoritative baseline.",
        targetId: "golden-baselines",
        route: "/configuration/checks"
    }
]

export function UserTutorial() {
    const { isTutorialActive, endTutorial } = useAuth()
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!isTutorialActive) return;

        let animationFrameId: number;
        const step = TUTORIAL_STEPS[currentStep]

        // Auto-scroll to element on step change with a slight delay to allow for page routing/rendering
        setTimeout(() => {
            if (step.targetId) {
                // Find all matching elements and get the first one that has actual layout dimensions (is visible)
                const els = document.querySelectorAll(`[data-tutorial-step="${step.targetId}"]`)
                let targetEl: HTMLElement | null = null
                for (let i = 0; i < els.length; i++) {
                    const el = els[i] as HTMLElement
                    const rect = el.getBoundingClientRect()
                    if (rect.width > 0 && rect.height > 0) {
                        targetEl = el
                        break
                    }
                }

                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }
        }, 150)

        // Continuous polling for ultra-smooth tracking during scroll, resize, or layout shifts
        const loop = () => {
            if (step.targetId) {
                const els = document.querySelectorAll(`[data-tutorial-step="${step.targetId}"]`)
                let targetEl: HTMLElement | null = null
                for (let i = 0; i < els.length; i++) {
                    const el = els[i] as HTMLElement
                    const rect = el.getBoundingClientRect()
                    if (rect.width > 0 && rect.height > 0) {
                        targetEl = el
                        break
                    }
                }

                if (targetEl) {
                    const rect = targetEl.getBoundingClientRect()
                    setTargetRect((prev) => {
                        if (!prev || prev.x !== rect.x || prev.y !== rect.y || prev.width !== rect.width || prev.height !== rect.height) {
                            return rect
                        }
                        return prev
                    })
                } else {
                    setTargetRect((prev) => prev !== null ? null : prev)
                }
            } else {
                setTargetRect((prev) => prev !== null ? null : prev)
            }
            animationFrameId = requestAnimationFrame(loop)
        }

        loop()

        return () => {
            cancelAnimationFrame(animationFrameId)
        }
    }, [currentStep, isTutorialActive])

    if (!isTutorialActive) return null

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            const nextStepIndex = currentStep + 1;
            setCurrentStep(nextStepIndex)
            const nextRoute = TUTORIAL_STEPS[nextStepIndex].route
            if (nextRoute && pathname !== nextRoute) {
                router.push(nextRoute)
            }
        } else {
            handleComplete()
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            const prevStepIndex = currentStep - 1;
            setCurrentStep(prevStepIndex)
            const prevRoute = TUTORIAL_STEPS[prevStepIndex].route
            if (prevRoute && pathname !== prevRoute) {
                router.push(prevRoute)
            }
        }
    }

    const handleExit = () => {
        setCurrentStep(0)
        endTutorial()
    }

    const handleComplete = () => {
        setCurrentStep(0)
        endTutorial()
        router.push("/")
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
    let dialogLeft: string | number = "50%"
    let dialogTop: string | number | undefined = "50%"
    let dialogBottom: string | number | undefined = undefined
    let dialogTransform = "translate(-50%, -50%)"

    if (targetRect) {
        boxX = targetRect.left - padding
        boxY = targetRect.top - padding
        boxW = targetRect.width + (padding * 2)
        boxH = targetRect.height + (padding * 2)

        // Calculate dynamic positioning to keep dialog in viewport
        const left = boxX + boxW + 24

        dialogLeft = `${left}px`
        dialogTop = `${boxY}px`

        if (typeof window !== 'undefined') {
            const isMobile = window.innerWidth < 768
            const dialogWidth = window.innerWidth < 432 ? window.innerWidth - 32 : 400
            const dialogHeight = 350 // approximate max height

            if (isMobile) {
                // On mobile, try to place above first, then below if not enough room
                dialogLeft = `${Math.max(16, (window.innerWidth - dialogWidth) / 2)}px` // center horizontally

                // Try top placement (anchoring to bottom so height adjusts upwards)
                if (boxY - dialogHeight - 16 > 0) {
                    dialogTop = undefined
                    dialogBottom = `${window.innerHeight - boxY + 16}px`
                } else {
                    // Fallback to bottom placement
                    dialogTop = `${boxY + boxH + 16}px`
                    dialogBottom = undefined
                }
            } else {
                // Desktop placement (to the right)
                // If it exceeds the right edge, flip it to the left side
                if (left + dialogWidth > window.innerWidth) {
                    dialogLeft = `${Math.max(24, boxX - dialogWidth - 24)}px`
                }

                // If it exceeds the bottom edge, shift it up
                if (boxY + dialogHeight > window.innerHeight) {
                    dialogTop = `${Math.max(24, window.innerHeight - dialogHeight - 24)}px`
                }
            }
        }

        dialogTransform = "translate(0, 0)"
    }

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none">
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
                className="absolute bg-card border border-border shadow-2xl rounded-2xl w-[calc(100vw-32px)] sm:w-[400px] max-w-[400px] overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-auto"
                style={{
                    left: dialogLeft,
                    top: dialogTop,
                    bottom: dialogBottom,
                    transform: dialogTransform,
                    transition: 'left 0.1s linear, top 0.1s linear, bottom 0.1s linear, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header Actions */}
                <div className="flex justify-end p-3 pb-0">
                    <button
                        onClick={handleExit}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
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
                <div className="p-4 bg-sidebar border-t border-border flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex gap-1.5">
                            {TUTORIAL_STEPS.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-5 bg-primary' : 'w-1.5 bg-primary/20'}`}
                                />
                            ))}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleExit}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-1 cursor-pointer"
                        >
                            Skip Tour
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrev}
                                disabled={currentStep === 0}
                                className="px-4 py-2 bg-background border border-border text-foreground hover:bg-sidebar rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleNext}
                                className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                            >
                                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                                    <>Finish <CheckCircle2 className="w-4 h-4" /></>
                                ) : (
                                    <>Next <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
