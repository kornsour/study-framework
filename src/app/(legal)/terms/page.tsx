import type { Metadata } from "next";
import Link from "next/link";
import { LegalTemplateNotice } from "@/components/legal-template-notice";
import { LEGAL_VERSION, legalConfig } from "@/content/legal/config";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
	const c = legalConfig;
	return (
		<>
			<LegalTemplateNotice />
			<h1>Terms of Service</h1>
			<p>
				Version {LEGAL_VERSION} · Effective {c.effectiveDate} · Last updated {c.lastUpdated}
			</p>

			<h2>1. Acceptance of terms</h2>
			<p>
				These Terms of Service ("Terms") are a binding agreement between you and {c.companyName},{" "}
				{c.companyEntityType} ("{c.companyName}", "we", "us"). By creating an account or otherwise
				using our website, application, or related services (the "Service"), including the Good
				Study Framework study evaluator, you agree to these Terms and to our{" "}
				<Link href="/privacy">Privacy Policy</Link> and{" "}
				<Link href="/acceptable-use">Acceptable Use Policy</Link>, which are incorporated by
				reference. If you do not agree, do not use the Service.
			</p>

			<h2>2. Eligibility</h2>
			<p>
				You must be at least 18 years old, or the age of legal majority in your jurisdiction, to
				create an account. The Service is not directed to children under 13, and we do not knowingly
				collect personal information from them (see <Link href="/privacy">Privacy Policy</Link>). If
				you use the Service on behalf of a company or other entity, you represent that you have
				authority to bind that entity to these Terms.
			</p>

			<h2>3. The Service</h2>
			<p>
				The Service evaluates a scientific study against a deterministic 7-dimension scorecard, and
				optionally uses artificial intelligence to add reasoning and a plain-language summary on top
				of that scorecard. Section 7 and our <Link href="/ai-disclosure">AI Disclosure</Link> govern
				your use of the AI-assist feature and take precedence over this section for anything
				AI-related. We may add, change, or remove features at any time.
			</p>

			<h2>4. Accounts</h2>
			<p>
				You're responsible for maintaining the confidentiality of your login credentials and for all
				activity under your account. Notify us immediately of any unauthorized use. We may suspend
				or terminate accounts that violate these Terms or the{" "}
				<Link href="/acceptable-use">Acceptable Use Policy</Link>.
			</p>

			<h2>5. Subscriptions &amp; billing</h2>
			<p>
				The deterministic scorecard and AI-assist feature are currently free to use, subject to the
				usage limits described in Section 7. If we introduce paid plans, they will be billed in
				advance on a recurring basis through our payment processor, Stripe, and this section will be
				updated (with a version bump) before any charge applies to you. You can cancel at any time;
				cancellation would take effect at the end of the current billing period unless we state
				otherwise.
			</p>

			<h2>6. Acceptable use</h2>
			<p>
				You agree to use the Service only as permitted by these Terms, applicable law, and our{" "}
				<Link href="/acceptable-use">Acceptable Use Policy</Link>, which describes prohibited
				conduct in detail (including misuse of the AI-assist feature). We may remove content or
				suspend access for violations.
			</p>

			<h2>7. AI features &amp; disclaimers</h2>
			<p>
				The study evaluator's deterministic scorecard is produced by rule-based extraction and
				scoring, not AI, and is always available. If you enable AI assist, your study text and the
				scorecard are sent to a third-party AI provider to add confounder reasoning, a second
				opinion on any low-confidence dimensions, and a plain-language bottom line. That output is
				produced by a machine-learning model and may be incorrect, incomplete, biased, or
				overstated. AI output is provided "as is" and is <strong>not</strong> professional advice
				(medical, scientific, legal, financial, or otherwise). You are responsible for independently
				verifying any AI output before relying on it. AI assist is subject to a free-use monthly
				limit per visitor and a site-wide monthly cap described in the{" "}
				<Link href="/ai-disclosure">AI Disclosure</Link>, which has full detail.
			</p>

			<h2>8. Your content</h2>
			<p>
				You retain ownership of content you submit to the Service ("User Content"), including any
				study text you paste in for evaluation. You grant us a worldwide, non-exclusive,
				royalty-free license to host, store, process, and display User Content solely to operate and
				improve the Service, including sending it to the third-party AI provider described in the{" "}
				<Link href="/ai-disclosure">AI Disclosure</Link> when you enable AI assist. If you're signed
				in, we save your evaluation reports to your account history so you can revisit them; you can
				request deletion at any time (see <Link href="/privacy">Privacy Policy</Link>). You
				represent that you have the rights necessary to grant this license and that your User
				Content doesn't infringe or violate anyone's rights.
			</p>

			<h2>9. Intellectual property</h2>
			<p>
				The Service, including its software, design, and branding (excluding User Content), is owned
				by {c.companyName} or its licensors and protected by intellectual property laws. These Terms
				don't grant you any rights to our trademarks or branding.
			</p>

			<h2>10. Third-party services</h2>
			<p>
				The Service integrates with third-party services, including Anthropic (for AI assist),
				PubMed/Crossref (to resolve DOIs and PMIDs), and — if enabled — Stripe, Google, or Apple. We
				aren't responsible for third-party services, and your use of them is subject to their own
				terms and privacy policies.
			</p>

			<h2>11. Disclaimer of warranties</h2>
			<p>
				THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS
				OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
				NON-INFRINGEMENT. WE DON'T WARRANT THAT THE SERVICE (INCLUDING THE SCORECARD OR ANY
				AI-ASSIST OUTPUT) WILL BE UNINTERRUPTED, ERROR-FREE, OR ACCURATE. THE SERVICE IS NOT A
				SUBSTITUTE FOR YOUR OWN JUDGMENT, A PEER REVIEW, OR PROFESSIONAL ADVICE ABOUT ANY STUDY OR
				ITS FINDINGS.
			</p>

			<h2>12. Limitation of liability</h2>
			<p>
				TO THE MAXIMUM EXTENT PERMITTED BY LAW, {c.companyName.toUpperCase()} WILL NOT BE LIABLE FOR
				ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
				PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE OR RELIANCE ON ITS OUTPUT.
				OUR TOTAL LIABILITY FOR ANY CLAIM WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US
				IN THE 12 MONTHS BEFORE THE CLAIM AROSE, OR (B) $100.
			</p>

			<h2>13. Indemnification</h2>
			<p>
				You agree to indemnify and hold {c.companyName} harmless from claims, damages, and expenses
				(including reasonable attorneys' fees) arising from your use of the Service, your User
				Content, or your violation of these Terms or applicable law.
			</p>

			<h2>14. Term &amp; termination</h2>
			<p>
				These Terms apply from when you first use the Service until terminated. You may stop using
				the Service and delete your account at any time. We may suspend or terminate your access for
				violation of these Terms, non-payment, or as required by law. Sections that by their nature
				should survive termination (e.g. 9, 11–13) will survive.
			</p>

			<h2>15. Governing law &amp; disputes</h2>
			<p>
				These Terms are governed by the laws of the State of {c.governingLawState}, without regard
				to conflict-of-laws rules. Any dispute not otherwise resolved will be brought exclusively in
				the state or federal courts located in {c.governingLawVenue}, and you consent to that
				jurisdiction and venue.{" "}
				<em>
					[TODO: decide with counsel whether to add a mandatory arbitration / class-action-waiver
					clause — deliberately omitted here as a business decision, not a technical default.]
				</em>
			</p>

			<h2>16. Changes to these Terms</h2>
			<p>
				We may update these Terms from time to time. Material changes will update the "Version" and
				"Last updated" date above; where required by law, or where you've already registered an
				account, we'll provide additional notice (e.g. email or in-app) and may require you to
				re-accept before continuing to use the Service.
			</p>

			<h2>17. Contact</h2>
			<p>
				Questions about these Terms: {c.contactEmail} — {c.registeredAddress}.
			</p>
		</>
	);
}
