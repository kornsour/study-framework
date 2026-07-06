"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LEGAL_VERSION } from "@/content/legal/config";
import { env } from "@/env";
import { signIn, signUp } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH, passwordError, passwordScore, STRENGTH_LABELS } from "@/lib/password";

const AFTER_AUTH = "/dashboard";
const BAR_COLORS = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-green-600"];

const inputClass =
	"rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";

function StrengthBar({ score }: { score: number }) {
	return (
		<div className="mt-1 flex gap-1" aria-hidden>
			{[0, 1, 2, 3].map((i) => (
				<div
					key={i}
					className={`h-1 flex-1 rounded-full ${i < score ? BAR_COLORS[score] : "bg-black/10 dark:bg-white/10"}`}
				/>
			))}
		</div>
	);
}

function OAuthButtons({ next }: { next: string }) {
	const anyEnabled = env.NEXT_PUBLIC_GOOGLE_ENABLED || env.NEXT_PUBLIC_APPLE_ENABLED;
	if (!anyEnabled) return null;

	async function social(provider: "google" | "apple") {
		await signIn.social({ provider, callbackURL: next });
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-2">
				{env.NEXT_PUBLIC_GOOGLE_ENABLED && (
					<button
						type="button"
						onClick={() => social("google")}
						className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
					>
						Continue with Google
					</button>
				)}
				{env.NEXT_PUBLIC_APPLE_ENABLED && (
					<button
						type="button"
						onClick={() => social("apple")}
						className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
					>
						Continue with Apple
					</button>
				)}
			</div>
			<div className="flex items-center gap-3 text-xs text-zinc-500">
				<span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
				or
				<span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
			</div>
		</div>
	);
}

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const isSignUp = mode === "sign-up";
	const nextParam = searchParams.get("next");
	const next = nextParam?.startsWith("/") ? nextParam : AFTER_AUTH;

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [agreedToTerms, setAgreedToTerms] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const pwError = isSignUp && password ? passwordError(password) : null;
	const confirmError =
		isSignUp && confirm && password !== confirm ? "Passwords don't match." : null;
	const score = passwordScore(password);
	const blockSignUp =
		isSignUp &&
		(pwError !== null || confirmError !== null || !password || !confirm || !name || !agreedToTerms);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (isSignUp) {
			const firstErr =
				(!name ? "Enter your name." : null) ||
				passwordError(password) ||
				(password !== confirm ? "Passwords don't match." : null) ||
				(!agreedToTerms ? "You must agree to the Terms of Service and Privacy Policy." : null);
			if (firstErr) {
				setError(firstErr);
				return;
			}
		}
		setPending(true);
		const result = isSignUp
			? await signUp.email({
					email,
					password,
					name,
					callbackURL: next,
					legalAcceptedVersion: LEGAL_VERSION,
					legalAcceptedAt: new Date(),
				})
			: await signIn.email({ email, password });
		setPending(false);
		if (result.error) {
			setError(result.error.message ?? "Something went wrong.");
			return;
		}
		router.push(next);
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-5">
			<OAuthButtons next={next} />
			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				{isSignUp && (
					<div className="flex flex-col gap-1.5">
						<label htmlFor="name" className="text-sm font-medium">
							Name
						</label>
						<input
							id="name"
							name="name"
							className={inputClass}
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoComplete="name"
							required
						/>
					</div>
				)}
				<div className="flex flex-col gap-1.5">
					<label htmlFor="email" className="text-sm font-medium">
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						className={inputClass}
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoComplete="email"
						required
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<label htmlFor="password" className="text-sm font-medium">
							Password
						</label>
						{!isSignUp && (
							<Link
								href="/forgot-password"
								className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
							>
								Forgot?
							</Link>
						)}
					</div>
					<input
						id="password"
						name="password"
						type="password"
						className={inputClass}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						autoComplete={isSignUp ? "new-password" : "current-password"}
						minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
						required
					/>
					{isSignUp && password && (
						<>
							<StrengthBar score={score} />
							{pwError ? (
								<span className="text-xs text-red-600">{pwError}</span>
							) : (
								<span className="text-xs text-zinc-500">
									{STRENGTH_LABELS[score]} · at least {MIN_PASSWORD_LENGTH} characters
								</span>
							)}
						</>
					)}
				</div>
				{isSignUp && (
					<div className="flex flex-col gap-1.5">
						<label htmlFor="confirm" className="text-sm font-medium">
							Confirm password
						</label>
						<input
							id="confirm"
							name="confirm"
							type="password"
							className={inputClass}
							value={confirm}
							onChange={(e) => setConfirm(e.target.value)}
							autoComplete="new-password"
							required
						/>
						{confirmError && <span className="text-xs text-red-600">{confirmError}</span>}
					</div>
				)}
				{isSignUp && (
					<label
						htmlFor="agree-to-terms"
						className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
					>
						<input
							id="agree-to-terms"
							type="checkbox"
							className="mt-0.5"
							checked={agreedToTerms}
							onChange={(e) => setAgreedToTerms(e.target.checked)}
							required
						/>
						<span>
							I agree to the{" "}
							<Link href="/terms" target="_blank" className="underline underline-offset-2">
								Terms of Service
							</Link>{" "}
							and{" "}
							<Link href="/privacy" target="_blank" className="underline underline-offset-2">
								Privacy Policy
							</Link>
							.
						</span>
					</label>
				)}
				{error && <p className="text-sm text-red-600">{error}</p>}
				<button
					type="submit"
					disabled={pending || blockSignUp}
					className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
				>
					{pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
				</button>
			</form>
			<p className="text-center text-sm text-zinc-500">
				{isSignUp ? (
					<>
						Already have an account?{" "}
						<Link
							href="/sign-in"
							className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
						>
							Sign in
						</Link>
					</>
				) : (
					<>
						Need an account?{" "}
						<Link
							href="/sign-up"
							className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
						>
							Sign up
						</Link>
					</>
				)}
			</p>
		</div>
	);
}
