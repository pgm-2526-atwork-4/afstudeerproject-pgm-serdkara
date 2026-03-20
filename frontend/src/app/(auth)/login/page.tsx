"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { login } = useAuth()

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)

        try {
            await login(email, password)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background fixed inset-0 z-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                        Welcome Back
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onInvalid={handleEmailInvalid}
                            onInput={(e) => e.currentTarget.setCustomValidity("")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="name@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onInvalid={handlePasswordInvalid}
                            onInput={(e) => e.currentTarget.setCustomValidity("")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 mt-4 cursor-pointer"
                    >
                        {isSubmitting ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                {error && (
                    <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                        {error}
                    </div>
                )}

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">Don&apos;t have an account? </span>
                    <Link href="/register" className="font-medium text-primary hover:underline">
                        Register
                    </Link>
                </div>
            </div>
        </div>
    )
}
