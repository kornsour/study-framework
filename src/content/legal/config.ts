/**
 * Single source of truth for the legal pages under src/app/(legal)/.
 *
 * NOT LEGAL ADVICE. This scaffold was AI-drafted (ported from the
 * typescript-template starter, see docs/adr/0015-legal-disclosures-scaffolding.md)
 * and has not been reviewed by a licensed attorney. Treat every value below as
 * a placeholder to confirm with counsel before launch — in particular the
 * contact email, which currently falls back to the owner's personal address
 * because this project has no live domain yet.
 *
 * Bump LEGAL_VERSION any time the legal pages change in a way existing users
 * should re-acknowledge; src/lib/auth.ts compares a signing-up user's
 * submitted version against this constant.
 */
export const LEGAL_VERSION = "1.0";

export const legalConfig = {
	companyName: "Kaiserauer Solutions LLC",
	companyEntityType: "a Michigan limited liability company",
	registeredAddress: "Available upon written request to the contact email below.",
	// TODO: no custom domain exists for this project yet — swap for a
	// domain-based address (e.g. legal@studyframework.app) once one is live.
	contactEmail: "ajkaiserauer@gmail.com",
	privacyEmail: "ajkaiserauer@gmail.com",
	// Governing law / venue for the ToS. Defaults to the founder's home state.
	governingLawState: "Michigan",
	governingLawVenue: "Wayne County, Michigan",
	effectiveDate: "July 5, 2026",
	lastUpdated: "July 5, 2026",
	// Shown alongside the AI disclosure. The study evaluator's AI-assist pass
	// (src/lib/study-eval/ai.ts) calls the Anthropic API.
	aiSubprocessors: ["Anthropic"],
} as const;
