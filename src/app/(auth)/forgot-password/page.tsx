"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const inputClass =
	"rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [pending, setPending] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setPending(true);
		// Always report success to avoid leaking which emails are registered.
		await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
		setPending(false);
		setSent(true);
	}

	if (sent) {
		return (
			<div className="flex flex-col gap-4">
				<h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
				<p className="text-sm text-zinc-500">
					If an account exists for {email}, a password-reset link is on its way.
				</p>
				<Link
					href="/sign-in"
					className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
				>
					Back to sign in
				</Link>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-4">
			<h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
			<p className="text-sm text-zinc-500">Enter your email and we'll send you a reset link.</p>
			<input
				type="email"
				className={inputClass}
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				placeholder="you@example.com"
				autoComplete="email"
				required
			/>
			<button
				type="submit"
				disabled={pending}
				className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
			>
				{pending ? "Sending…" : "Send reset link"}
			</button>
		</form>
	);
}
