"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-notice-dismissed";

/**
 * A notice, not a consent manager: this app only sets strictly necessary
 * cookies (the better-auth session cookie, plus a short-lived OAuth state
 * cookie if Google/Apple sign-in is enabled), which don't legally require
 * opt-in consent — just clear disclosure. If analytics/ads/tracking cookies
 * are ever added, replace this with a real accept/reject control before they
 * load. See src/app/(legal)/cookies/page.tsx.
 */
export function CookieBanner() {
	const [dismissed, setDismissed] = useState(true);

	useEffect(() => {
		setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
	}, []);

	if (dismissed) return null;

	function dismiss() {
		localStorage.setItem(STORAGE_KEY, "1");
		setDismissed(true);
	}

	return (
		<div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
			<div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-3">
				<p>
					We use essential cookies to keep you signed in and to run this site. See our{" "}
					<Link href="/cookies" className="underline underline-offset-2">
						Cookie Policy
					</Link>
					.
				</p>
				<button
					type="button"
					onClick={dismiss}
					className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
				>
					Got it
				</button>
			</div>
		</div>
	);
}
