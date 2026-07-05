"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
	const router = useRouter();
	const [pending, setPending] = useState(false);

	async function onClick() {
		setPending(true);
		await signOut();
		router.push("/sign-in");
		router.refresh();
	}

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={pending}
			className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
		>
			{pending ? "Signing out…" : "Sign out"}
		</button>
	);
}
