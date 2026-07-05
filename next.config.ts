import type { NextConfig } from "next";

/**
 * Baseline security headers applied to every response.
 * See docs/adr/0009-security-headers.md.
 *
 * The Content-Security-Policy is NOT set here — it's a per-request nonce-based
 * policy set in `src/proxy.ts` (see docs/adr/0014-content-security-policy.md).
 * Tighten that policy to each app's real origins.
 */
const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
	{ key: "X-DNS-Prefetch-Control", value: "on" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
	async headers() {
		return [
			{
				source: "/:path*",
				headers: securityHeaders,
			},
		];
	},
};

export default nextConfig;
