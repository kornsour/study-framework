/**
 * Password policy, length-first per current guidance (NIST 800-63B / OWASP):
 * require a decent minimum length and reject obviously weak / common choices,
 * rather than mandating composition rules (which push users toward predictable
 * `Password1!` patterns and are now considered *weaker*). The strength meter is
 * advisory only and rewards length + character variety.
 *
 * If your project must enforce hard composition rules (e.g. "at least one
 * special character"), flip REQUIRE_COMPOSITION to true — it's the single knob.
 */

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128; // upper bound: avoids DoS on the hash

/** Set true to additionally require upper + lower + number + special char. */
export const REQUIRE_COMPOSITION = false;

const COMMON = new Set([
	"password",
	"password1",
	"password12",
	"password123",
	"passw0rd1234",
	"123456789012",
	"1234567890123",
	"qwertyuiop12",
	"letmein12345",
	"iloveyou1234",
	"adminadmin12",
	"changemenow12",
]);

/** Returns an error message if the password is unacceptable, otherwise null. */
export function passwordError(pw: string): string | null {
	if (pw.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
	if (pw.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
	if (COMMON.has(pw.toLowerCase())) return "That password is too common — pick something else.";
	if (/^(.)\1+$/.test(pw)) return "Avoid repeating a single character.";
	if (REQUIRE_COMPOSITION) {
		if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) return "Use both uppercase and lowercase letters.";
		if (!/\d/.test(pw)) return "Include at least one number.";
		if (!/[^a-zA-Z0-9]/.test(pw)) return "Include at least one special character.";
	}
	return null;
}

/** 0–4 advisory strength score, rewarding length and character variety. */
export function passwordScore(pw: string): number {
	if (!pw) return 0;
	let score = 0;
	if (pw.length >= MIN_PASSWORD_LENGTH) score++;
	if (pw.length >= 16) score++;
	if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
	if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score++;
	return Math.min(score, 4);
}

export const STRENGTH_LABELS = ["Too weak", "Weak", "Okay", "Good", "Strong"] as const;
