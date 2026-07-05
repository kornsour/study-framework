import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordError, passwordScore } from "./password";

describe("passwordError", () => {
	it("rejects passwords shorter than the minimum", () => {
		expect(passwordError("short")).toMatch(/at least/i);
		expect(passwordError("a".repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(/at least/i);
	});

	it("rejects common passwords", () => {
		expect(passwordError("iloveyou1234")).toMatch(/too common/i);
	});

	it("rejects a single repeated character", () => {
		expect(passwordError("aaaaaaaaaaaa")).toMatch(/repeating/i);
	});

	it("accepts a sufficiently long, non-trivial password", () => {
		expect(passwordError("correct horse battery staple")).toBeNull();
		expect(passwordError("Tr0ub4dour&3xtra")).toBeNull();
	});
});

describe("passwordScore", () => {
	it("scores empty as 0 and a long varied password near max", () => {
		expect(passwordScore("")).toBe(0);
		expect(passwordScore("Tr0ub4dour&3xtraLong")).toBe(4);
	});

	it("increases with length", () => {
		expect(passwordScore("aaaaaaaaaaaa")).toBeLessThan(passwordScore("aaaaaaaaaaaaaaaa"));
	});
});
