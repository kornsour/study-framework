import { createSafeActionClient } from "next-safe-action";
import { getSession } from "@/lib/auth/session";

export const actionClient = createSafeActionClient();

/**
 * Action client that requires an authenticated user. The session's user is
 * available as `ctx.user` inside the action. Throws (surfaced as the action's
 * error) rather than redirecting, so callers can show an inline message.
 */
export const authActionClient = actionClient.use(async ({ next }) => {
	const session = await getSession();
	if (!session?.user) throw new Error("You must be signed in to do that.");
	return next({ ctx: { user: session.user } });
});
