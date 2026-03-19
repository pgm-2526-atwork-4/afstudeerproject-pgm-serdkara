"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function RegisterPage() {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [showApprovalNotice, setShowApprovalNotice] = useState(false)
    const { register } = useAuth()

    const handleEmailInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
        const input = e.currentTarget
        if (input.validity.valueMissing) {
            input.setCustomValidity("Email is required.")
            return
        }
        if (input.validity.typeMismatch) {
            input.setCustomValidity("Please enter a valid email address.")
            return
        }
        input.setCustomValidity("")
    }

    const handlePasswordInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
        const input = e.currentTarget
        if (input.validity.valueMissing) {
            input.setCustomValidity("Password is required.")
            return
        }
        input.setCustomValidity("")
    }

    useEffect(() => {
        setShowApprovalNotice(true)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)
        setIsSubmitting(true)

        try {
            const message = await register(name, email, password)
            setSuccessMessage(`${message}. A confirmation email has also been sent to your email address.`)
            setName("")
            setEmail("")
            setPassword("")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background fixed inset-0 z-50">
            {showApprovalNotice && (
                <div className="fixed top-4 right-4 z-[60] max-w-md rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-100 p-4 shadow-lg animate-in slide-in-from-top-4 duration-300">
                    <p className="text-sm font-semibold">Registration Requires Admin Approval</p>
                    <p className="text-xs mt-1 text-amber-100/90">
                        You can sign in only after a super admin approves your account.
                    </p>
                </div>
            )}

            <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                        Create an Account
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">Enter your details to register</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">
                            Name
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            placeholder="Jane Doe"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onInvalid={handleEmailInvalid}
                            onInput={(e) => e.currentTarget.setCustomValidity("")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            placeholder="name@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onInvalid={handlePasswordInvalid}
                            onInput={(e) => e.currentTarget.setCustomValidity("")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 mt-4 transition-colors cursor-pointer"
                    >
                        {isSubmitting ? "Submitting..." : "Sign Up"}
                    </button>
                </form>

                {error && (
                    <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 animate-in fade-in duration-300">
                        {successMessage}
                    </div>
                )}

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">Already have an account? </span>
                    <Link href="/login" className="font-medium text-primary hover:underline">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    )
}
