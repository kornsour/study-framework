"use client";

import { useAction } from "next-safe-action/hooks";
import { createBillingPortalSession, createCheckoutSession } from "@/lib/stripe/actions";

const buttonClass =
	"rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";

/**
 * Renders an "Upgrade" (checkout) button, or "Manage billing" (portal) if the
 * user already has an active subscription. Only rendered when billing is
 * enabled (see the dashboard).
 */
export function BillingButton({ hasSubscription }: { hasSubscription: boolean }) {
	const redirectTo = (url?: string) => {
		if (url) window.location.href = url;
	};
	const checkout = useAction(createCheckoutSession, {
		onSuccess: ({ data }) => redirectTo(data?.url),
	});
	const portal = useAction(createBillingPortalSession, {
		onSuccess: ({ data }) => redirectTo(data?.url),
	});

	if (hasSubscription) {
		return (
			<button
				type="button"
				className={buttonClass}
				disabled={portal.isPending}
				onClick={() => portal.execute({})}
			>
				{portal.isPending ? "Opening…" : "Manage billing"}
			</button>
		);
	}
	return (
		<button
			type="button"
			className={buttonClass}
			disabled={checkout.isPending}
			onClick={() => checkout.execute({})}
		>
			{checkout.isPending ? "Redirecting…" : "Upgrade"}
		</button>
	);
}
