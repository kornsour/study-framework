import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 "proxy" (formerly "middleware"). Two jobs:
 *   1. Optimistic auth redirect for protected routes (fast UX only — the real
 *      gate is `requireUser()` in each page/action; never trust this alone).
 *   2. A nonce-based Content-Security-Policy (the piece ADR-0009 deferred; see
 *      ADR-0014).
 */

const PROTECTED_PREFIXES = ["/dashboard"];

/**
 *   - Production: strict — scripts must carry the per-request nonce.
 *   - Development: adds 'unsafe-eval'/'unsafe-inline' so Turbopack HMR works.
 * Stripe hosts are allowed so Stripe.js / hosted checkout function if used.
 */
function buildCsp(nonce: string): string {
	const dev = process.env.NODE_ENV !== "production";
	const scriptSrc = dev
		? `'self' 'unsafe-eval' 'unsafe-inline'`
		: `'self' 'nonce-${nonce}' 'strict-dynamic'`;
	return [
		`default-src 'self'`,
		`script-src ${scriptSrc} https://js.stripe.com`,
		`style-src 'self' 'unsafe-inline'`,
		`img-src 'self' data: blob: https:`,
		`font-src 'self'`,
		`connect-src 'self' https://api.stripe.com`,
		`frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com`,
		`frame-ancestors 'none'`,
		`base-uri 'self'`,
		`form-action 'self'`,
		`object-src 'none'`,
	].join("; ");
}

export default function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Optimistic auth gate.
	if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
		const sessionCookie = getSessionCookie(request);
		if (!sessionCookie) {
			const url = new URL("/sign-in", request.url);
			url.searchParams.set("next", pathname);
			return NextResponse.redirect(url);
		}
	}

	// Nonce-based CSP: expose the nonce to the app via a request header so Next
	// can stamp it onto its own scripts, and echo the policy on the response.
	const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
	const csp = buildCsp(nonce);
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-nonce", nonce);
	requestHeaders.set("content-security-policy", csp);

	const response = NextResponse.next({ request: { headers: requestHeaders } });
	response.headers.set("content-security-policy", csp);
	return response;
}

export const config = {
	// Run on pages, not on static assets, images, or API routes (webhooks set
	// their own responses and must not receive an HTML CSP).
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
