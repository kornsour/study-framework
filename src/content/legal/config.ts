/**
 * Single source of truth for legal policy metadata used by src/app/(legal)/.
 * Bump LEGAL_VERSION any time those pages materially change.
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
	effectiveDate: "July 7, 2026",
	lastUpdated: "July 7, 2026",
	aiSubprocessors: ["Anthropic"],
} as const;
