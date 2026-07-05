import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Read the current session (or null) inside a Server Component / server action. */
export async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

/**
 * Require an authenticated user; redirect to sign-in otherwise. This is the real
 * enforcement point — the middleware redirect is only an optimistic cookie check.
 * Call this in every protected page/action so auth can't be forgotten.
 */
export async function requireUser() {
	const session = await getSession();
	if (!session?.user) redirect("/sign-in");
	return session.user;
}
