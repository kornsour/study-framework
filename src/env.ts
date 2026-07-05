import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
	server: {
		// ---- Required ----
		DATABASE_URL: z.url(),
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		// better-auth signing secret. Generate with: openssl rand -base64 32
		BETTER_AUTH_SECRET: z.string().min(1),

		// ---- Auth: social providers (optional — features gate on presence) ----
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
		APPLE_CLIENT_ID: z.string().optional(),
		APPLE_CLIENT_SECRET: z.string().optional(),

		// ---- Email: AWS SES (optional — falls back to console logging in dev) ----
		AWS_REGION: z.string().optional(),
		EMAIL_FROM: z.string().optional(),

		// ---- Billing: Stripe (optional — billing is inert until set) ----
		STRIPE_SECRET_KEY: z.string().optional(),
		STRIPE_WEBHOOK_SIGNING_SECRET: z.string().optional(),

		// ---- AI: Claude API (optional — study-eval AI assist is inert until set) ----
		ANTHROPIC_API_KEY: z.string().optional(),
	},
	client: {
		// Public base URL (used by better-auth, OAuth redirects, email links).
		NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
		// Show the OAuth buttons only when the provider is configured.
		NEXT_PUBLIC_GOOGLE_ENABLED: z.stringbool().default(false),
		NEXT_PUBLIC_APPLE_ENABLED: z.stringbool().default(false),
		// Publishable key + a default price for the demo checkout button.
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
		NEXT_PUBLIC_STRIPE_PRICE_ID: z.string().optional(),
	},
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
		APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET,
		AWS_REGION: process.env.AWS_REGION,
		EMAIL_FROM: process.env.EMAIL_FROM,
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SIGNING_SECRET: process.env.STRIPE_WEBHOOK_SIGNING_SECRET,
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_GOOGLE_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
		NEXT_PUBLIC_APPLE_ENABLED: process.env.NEXT_PUBLIC_APPLE_ENABLED,
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_STRIPE_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
