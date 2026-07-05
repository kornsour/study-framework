"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH, passwordError } from "@/lib/password";

const inputClass =
	"rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";

function ResetForm() {
	const router = useRouter();
	const params = useSearchParams();
	const token = params.get("token");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	if (!token) {
		return <p className="text-sm text-red-600">This reset link is invalid or has expired.</p>;
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const firstErr =
			passwordError(password) || (password !== confirm ? "Passwords don't match." : null);
		if (firstErr) {
			setError(firstErr);
			return;
		}
		setPending(true);
		const res = await authClient.resetPassword({ newPassword: password, token: token as string });
		setPending(false);
		if (res.error) {
			setError(res.error.message ?? "Could not reset password.");
			return;
		}
		router.push("/sign-in");
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-4">
			<h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
			<input
				type="password"
				className={inputClass}
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				placeholder="New password"
				autoComplete="new-password"
				minLength={MIN_PASSWORD_LENGTH}
				required
			/>
			<input
				type="password"
				className={inputClass}
				value={confirm}
				onChange={(e) => setConfirm(e.target.value)}
				placeholder="Confirm new password"
				autoComplete="new-password"
				required
			/>
			{error && <p className="text-sm text-red-600">{error}</p>}
			<button
				type="submit"
				disabled={pending}
				className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
			>
				{pending ? "Saving…" : "Reset password"}
			</button>
			<Link href="/sign-in" className="text-center text-sm text-zinc-500 hover:underline">
				Back to sign in
			</Link>
		</form>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense>
			<ResetForm />
		</Suspense>
	);
}
