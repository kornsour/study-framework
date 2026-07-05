import { describe, expect, it } from "vitest";
import { passwordSchema, signUpSchema } from "./password-schema";

describe("passwordSchema", () => {
	it("rejects a weak password", () => {
		expect(passwordSchema.safeParse("short").success).toBe(false);
	});
	it("accepts a strong password", () => {
		expect(passwordSchema.safeParse("correct horse battery staple").success).toBe(true);
	});
});

describe("signUpSchema", () => {
	const base = {
		name: "Ada",
		email: "ada@example.com",
		password: "correct horse battery staple",
		confirmPassword: "correct horse battery staple",
	};

	it("accepts a valid, matching sign-up", () => {
		expect(signUpSchema.safeParse(base).success).toBe(true);
	});

	it("rejects when confirmation doesn't match", () => {
		const res = signUpSchema.safeParse({ ...base, confirmPassword: "different but long enough" });
		expect(res.success).toBe(false);
		if (!res.success) {
			expect(res.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
		}
	});

	it("rejects an invalid email", () => {
		expect(signUpSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
	});
});
