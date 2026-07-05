import { z } from "zod/v4";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, passwordError } from "@/lib/password";

/**
 * Shared password + sign-up validation used in two places so the rules can't
 * drift: the sign-up form (client) and the server-side `databaseHooks` in
 * src/lib/auth.ts (defense in depth — the client can be bypassed).
 *
 * The single source of truth for *what makes a password acceptable* is
 * `passwordError()` in src/lib/password.ts (length + blocklist, plus an
 * optional composition toggle). This schema just adapts it to Zod.
 */

export const passwordSchema = z
	.string()
	.min(MIN_PASSWORD_LENGTH)
	.max(MAX_PASSWORD_LENGTH)
	.superRefine((pw, ctx) => {
		const err = passwordError(pw);
		if (err) ctx.addIssue({ code: "custom", message: err });
	});

export const signUpSchema = z
	.object({
		name: z.string().trim().min(1, "Enter your name.").max(100),
		email: z.email(),
		password: passwordSchema,
		confirmPassword: z.string(),
	})
	.refine((v) => v.password === v.confirmPassword, {
		message: "Passwords don't match.",
		path: ["confirmPassword"],
	});

export type SignUpInput = z.infer<typeof signUpSchema>;
