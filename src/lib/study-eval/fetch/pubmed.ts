import type { ExternalMetadata } from "../types";

/**
 * PubMed E-utilities client (free, no API key; NCBI asks for ≤3 req/s).
 * Publication types here are assigned by NLM indexers — the most reliable
 * study-design signal we can get without reading the paper.
 */

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string): Promise<Response> {
	return fetch(url, {
		signal: AbortSignal.timeout(TIMEOUT_MS),
		headers: { "User-Agent": "good-study-framework/1.0" },
	});
}

/** Look up the PMID for a DOI. Returns null when PubMed doesn't index it. */
export async function pmidFromDoi(doi: string): Promise<string | null> {
	const url = `${EUTILS}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(doi)}[doi]&retmode=json`;
	const res = await fetchWithTimeout(url);
	if (!res.ok) return null;
	const json = (await res.json()) as { esearchresult?: { idlist?: string[] } };
	return json.esearchresult?.idlist?.[0] ?? null;
}

/** Pull one tag's text contents out of a PubMed XML record (regex is fine for this fixed format). */
function xmlTexts(xml: string, tag: string): string[] {
	const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g");
	const out: string[] = [];
	for (const m of xml.matchAll(re)) {
		const inner = (m[1] ?? "")
			.replace(/<[^>]+>/g, " ") // strip nested tags (e.g. <i>, <sup>)
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&#x?\w+;/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		if (inner) out.push(inner);
	}
	return out;
}

export interface PubMedRecord extends ExternalMetadata {
	pmid: string;
}

/** Fetch title, abstract, publication types, MeSH terms, and retraction status. */
export async function fetchPubMed(pmid: string): Promise<PubMedRecord | null> {
	const url = `${EUTILS}/efetch.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&retmode=xml`;
	const res = await fetchWithTimeout(url);
	if (!res.ok) return null;
	const xml = await res.text();
	if (!xml.includes("<PubmedArticle")) return null;

	const publicationTypes = xmlTexts(xml, "PublicationType");
	return {
		pmid,
		title: xmlTexts(xml, "ArticleTitle")[0],
		abstract: xmlTexts(xml, "AbstractText").join(" "),
		publicationTypes,
		meshTerms: xmlTexts(xml, "DescriptorName"),
		journal: xmlTexts(xml, "Title")[0],
		year: Number.parseInt(xmlTexts(xml, "Year")[0] ?? "", 10) || undefined,
		// NLM flags retracted papers with a dedicated publication type, and adds
		// a CommentsCorrections banner we also catch for belt-and-suspenders.
		retracted:
			publicationTypes.some((t) => t.toLowerCase() === "retracted publication") ||
			xml.includes('RefType="RetractionIn"'),
	};
}
