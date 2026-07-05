import { matchPhrases, matchSnippets } from "../text";
import type { RegistrationExtraction } from "../types";

/** Trial/protocol registry identifiers — strong, checkable pre-registration evidence. */
const REGISTRY_ID_PATTERNS: RegExp[] = [
	/\bNCT\d{8}\b/gi, // ClinicalTrials.gov
	/\bISRCTN\d{8}\b/gi,
	/\bCRD42\d{6,8}\b/gi, // PROSPERO
	/\bACTRN\d{14}\b/gi, // ANZCTR
	/\bChiCTR[-\w]*\d{8,}\b/gi,
	/\bUMIN\d{9}\b/gi,
	/\bEudraCT\s*(?:number\s*)?[:#]?\s*\d{4}-\d{6}-\d{2}\b/gi,
];

const PREREG_PHRASES = [
	"pre-registered",
	"preregistered",
	"pre-registration",
	"preregistration",
	"registered protocol",
	"published protocol",
	"analysis plan was registered",
	"osf.io",
	"open science framework",
	"aspredicted",
] as const;

const DATA_SHARING_PHRASES = [
	"data are available",
	"data is available",
	"data availability",
	"code is available",
	"code are available",
	"publicly available data",
	"openly available",
	"github.com",
	"data and code",
	"replication files",
] as const;

export function extractRegistration(text: string): RegistrationExtraction {
	const identifiers: string[] = [];
	for (const pattern of REGISTRY_ID_PATTERNS) {
		for (const snippet of matchSnippets(text, pattern, 0)) {
			identifiers.push(snippet);
		}
	}
	const preregPhrases = matchPhrases(text, PREREG_PHRASES);
	return {
		registered: identifiers.length > 0 || preregPhrases.length > 0,
		identifiers: [...new Set([...identifiers, ...preregPhrases])],
		dataSharingSignals: matchPhrases(text, DATA_SHARING_PHRASES),
	};
}
