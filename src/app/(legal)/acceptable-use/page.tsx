import type { Metadata } from "next";
import Link from "next/link";
import { LegalTemplateNotice } from "@/components/legal-template-notice";
import { LEGAL_VERSION, legalConfig } from "@/content/legal/config";

export const metadata: Metadata = { title: "Acceptable Use Policy" };

export default function AcceptableUsePage() {
	const c = legalConfig;
	return (
		<>
			<LegalTemplateNotice />
			<h1>Acceptable Use Policy</h1>
			<p>
				Version {LEGAL_VERSION} · Effective {c.effectiveDate} · Last updated {c.lastUpdated}
			</p>
			<p>
				This policy is part of our <Link href="/terms">Terms of Service</Link>. Violating it can
				result in content removal, suspension, or termination of your account.
			</p>

			<h2>1. General prohibited conduct</h2>
			<p>You may not use the Service to:</p>
			<ul>
				<li>Violate any applicable law or regulation.</li>
				<li>Infringe anyone's intellectual property, privacy, or other rights.</li>
				<li>
					Transmit malware, or attempt to gain unauthorized access to the Service or other users'
					accounts.
				</li>
				<li>
					Scrape, crawl, or bulk-extract data from the Service except through an API we explicitly
					provide for that purpose.
				</li>
				<li>
					Reverse-engineer, decompile, or attempt to derive the source code of the Service, except
					as permitted by law.
				</li>
				<li>
					Interfere with or disrupt the integrity or performance of the Service (e.g.
					denial-of-service, excessive automated requests outside documented rate/quota limits —
					including scripting around the AI-assist free-usage limit described in the{" "}
					<Link href="/ai-disclosure">AI Disclosure</Link>).
				</li>
				<li>
					Resell or provide the Service to third parties as your own, except as your plan explicitly
					permits.
				</li>
			</ul>

			<h2>2. Content you submit</h2>
			<p>
				You may not submit content, including study text or titles submitted for evaluation, that:
			</p>
			<ul>
				<li>Is illegal, fraudulent, or deceptive.</li>
				<li>Is defamatory, harassing, hateful, or threatens violence against a person or group.</li>
				<li>Sexually exploits or endangers minors in any way.</li>
				<li>
					Infringes someone else's intellectual property or violates their privacy or publicity
					rights.
				</li>
				<li>
					Impersonates a person or organization in a misleading way, including AI-generated
					deepfakes of real people without consent.
				</li>
			</ul>

			<h2>3. AI-assist misuse</h2>
			<p>
				The study evaluator's AI-assist feature (see{" "}
				<Link href="/ai-disclosure">AI Disclosure</Link>) adds AI-generated reasoning and a
				plain-speak summary on top of the deterministic scorecard. You additionally may not:
			</p>
			<ul>
				<li>
					Attempt to bypass, "jailbreak," or manipulate the AI-assist feature's safety controls, or
					circumvent the per-visitor free-usage limit or the site-wide monthly cap (e.g. by rotating
					IP addresses or automating requests).
				</li>
				<li>
					Use AI assist to generate content prohibited under Section 2, or to build a competing
					product by systematically extracting its outputs.
				</li>
				<li>
					Present AI-assist output as a substitute for professional scientific, medical, or
					statistical judgment, or as independently peer-reviewed analysis.
				</li>
				<li>
					Rely on AI-assist output for a "consequential decision" about a specific person — e.g.
					employment, lending, housing, insurance, healthcare, or education — unless you've
					confirmed with counsel that your specific use complies with applicable AI-specific law
					(see <code>docs/legal.md</code>) and have added the human-review/appeal process those laws
					require.
				</li>
			</ul>

			<h2>4. Reporting violations</h2>
			<p>To report a suspected violation of this policy, contact {c.contactEmail}.</p>
		</>
	);
}
