/** Shown at the top of every page in src/app/(legal)/ until removed post-review. */
export function LegalTemplateNotice() {
	return (
		<div className="not-prose mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
			<strong>Template placeholder — not legal advice.</strong> This page is starter text generated
			for this project, not a reviewed legal document. Fill in{" "}
			<code>src/content/legal/config.ts</code> and have a licensed attorney review this page (and
			the rest of <code>src/app/(legal)/</code>) for your business and jurisdictions before launch.
			See <code>docs/legal.md</code>. Remove this notice once reviewed.
		</div>
	);
}
