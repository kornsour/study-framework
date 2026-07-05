import type { ExternalMetadata } from "../types";
import { fetchCrossref } from "./crossref";
import { fetchPubMed, pmidFromDoi } from "./pubmed";

/**
 * Turn whatever the user pasted — PMID, DOI, PubMed URL, doi.org URL — into
 * study text + registry metadata. Returns null when nothing could be resolved.
 */

export interface ResolvedStudy {
	title?: string;
	text: string;
	doi?: string;
	pmid?: string;
	metadata: ExternalMetadata;
	source: "pubmed" | "crossref";
}

export function parseIdentifier(raw: string): { kind: "pmid" | "doi"; value: string } | null {
	const trimmed = raw.trim();

	// PubMed URLs: pubmed.ncbi.nlm.nih.gov/12345678/
	const pubmedUrl = trimmed.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d{1,9})/i);
	if (pubmedUrl?.[1]) return { kind: "pmid", value: pubmedUrl[1] };

	// Bare PMID (avoid swallowing years: PMIDs of interest are ≥5 digits or explicit)
	const pmid = trimmed.match(/^(?:pmid:?\s*)?(\d{5,9})$/i);
	if (pmid?.[1]) return { kind: "pmid", value: pmid[1] };

	// DOI, bare or as a doi.org / publisher URL
	const doi = trimmed.match(/(10\.\d{4,9}\/[^\s"'<>]+)/);
	if (doi?.[1]) return { kind: "doi", value: doi[1].replace(/[.,;)\]]+$/, "") };

	return null;
}

export async function resolveStudy(raw: string): Promise<ResolvedStudy | null> {
	const id = parseIdentifier(raw);
	if (!id) return null;

	let pmid = id.kind === "pmid" ? id.value : null;
	const doi = id.kind === "doi" ? id.value : undefined;

	// PubMed first: it has publication types and retraction flags.
	if (!pmid && doi) {
		pmid = await pmidFromDoi(doi).catch(() => null);
	}
	if (pmid) {
		const record = await fetchPubMed(pmid).catch(() => null);
		if (record?.abstract) {
			return {
				title: record.title,
				text: record.abstract,
				doi,
				pmid,
				metadata: record,
				source: "pubmed",
			};
		}
	}

	// Crossref fallback (metadata only; abstracts are present for some publishers).
	if (doi) {
		const record = await fetchCrossref(doi).catch(() => null);
		if (record?.abstract) {
			return {
				title: record.title,
				text: record.abstract,
				doi,
				metadata: record,
				source: "crossref",
			};
		}
	}

	return null;
}
