import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_VERSION, legalConfig } from "@/content/legal/config";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
	const c = legalConfig;
	return (
		<>
			<h1>Cookie Policy</h1>
			<p>
				Version {LEGAL_VERSION} · Effective {c.effectiveDate} · Last updated {c.lastUpdated}
			</p>

			<h2>1. What we use today</h2>
			<p>
				As shipped, this Service only sets <strong>strictly necessary</strong> cookies: a signed
				session cookie (set by better-auth) used to keep you signed in, and — if you use Google or
				Apple sign-in — a short-lived state cookie used to complete that OAuth flow. We don't use
				the AI-assist feature's per-visitor usage limit to set a cookie; that limit is tracked
				server-side by IP address (see <Link href="/ai-disclosure">AI Disclosure</Link>), not by
				anything stored in your browser. Under GDPR/ePrivacy and similar laws, strictly necessary
				cookies don't require consent, only clear disclosure — which is what this page and the
				cookie notice banner provide.
			</p>

			<h2>2. If we add analytics, ads, or other tracking</h2>
			<p>
				<em>
					This Service does not ship analytics, advertising, or other non-essential cookies/trackers
					today. If we add one (e.g. product analytics, ad pixels, session replay), we must: list it
					here with its purpose and duration, and — for EU/UK visitors and California's
					opt-out-of-sale/sharing rules — upgrade <code>src/components/cookie-banner.tsx</code> from
					a notice into a real accept/reject consent control before it loads. Non-essential trackers
					should not fire before consent.
				</em>
			</p>

			<h2>3. Managing cookies</h2>
			<p>
				Most browsers let you block or delete cookies in their settings. Blocking the session cookie
				will sign you out and may prevent you from using features that require an account, such as
				saved evaluation reports.
			</p>

			<h2>4. Contact</h2>
			<p>Questions about our cookie use: {c.privacyEmail}.</p>
		</>
	);
}
