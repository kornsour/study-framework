import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { LEGAL_VERSION } from "@/content/legal/config";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/env";
import { sendEmail } from "@/lib/email";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, passwordError } from "@/lib/password";

/** Only enable a social provider when both its id and secret are present. */
const socialProviders = {
	...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
		? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
		: {}),
	...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
		? { apple: { clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET } }
		: {}),
};

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
		},
	}),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.NEXT_PUBLIC_APP_URL,
	user: {
		additionalFields: {
			legalAcceptedVersion: { type: "string", required: false, input: true },
			legalAcceptedAt: { type: "date", required: false, input: true },
		},
	},
	emailAndPassword: {
		enabled: true,
		minPasswordLength: MIN_PASSWORD_LENGTH,
		maxPasswordLength: MAX_PASSWORD_LENGTH,
		// Only block sign-in on unverified email in production, so local dev and
		// e2e stay frictionless. The verification email is still sent below.
		requireEmailVerification: env.NODE_ENV === "production",
		sendResetPassword: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: "Reset your password",
				text: `Reset your password by opening this link:\n\n${url}\n\nIf you didn't request this, you can ignore this email.`,
			});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: "Verify your email",
				text: `Confirm your email address by opening this link:\n\n${url}`,
			});
		},
	},
	socialProviders,
	// better-auth's built-in limiter; auth routes get stricter per-path limits.
	rateLimit: {
		enabled: true,
		window: 60,
		max: 100,
	},
	hooks: {
		// Server-side password policy (defense in depth — the client form can be
		// bypassed). Enforces the full policy in src/lib/password.ts, not just the
		// min length better-auth checks natively.
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path === "/sign-up/email" || ctx.path === "/reset-password") {
				const pw = (ctx.body as { password?: string } | undefined)?.password;
				if (typeof pw === "string") {
					const err = passwordError(pw);
					if (err) throw new APIError("BAD_REQUEST", { message: err });
				}
			}
			// Server-side consent gate (defense in depth — the client checkbox in
			// auth-form.tsx can be bypassed). Requires the client to submit the
			// LEGAL_VERSION it displayed, so a stale/cached form can't sneak past a
			// terms update either.
			if (ctx.path === "/sign-up/email") {
				const version = (ctx.body as { legalAcceptedVersion?: string } | undefined)
					?.legalAcceptedVersion;
				if (version !== LEGAL_VERSION) {
					throw new APIError("BAD_REQUEST", {
						message: "You must accept the current Terms of Service and Privacy Policy.",
					});
				}
			}
		}),
	},
	// Ensures Set-Cookie headers from server actions are persisted (App Router).
	plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
