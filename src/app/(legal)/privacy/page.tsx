import type { Metadata } from "next";
import Link from "next/link";
import { LegalTemplateNotice } from "@/components/legal-template-notice";
import { LEGAL_VERSION, legalConfig } from "@/content/legal/config";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
	const c = legalConfig;
	return (
		<>
			<LegalTemplateNotice />
			<h1>Privacy Policy</h1>
			<p>
				Version {LEGAL_VERSION} · Effective {c.effectiveDate} · Last updated {c.lastUpdated}
			</p>

			<h2>1. Who we are</h2>
			<p>
				{c.companyName}, {c.companyEntityType} ("we", "us"), located at {c.registeredAddress},
				operates this website and application, including the Good Study Framework study evaluator
				(the "Service"). This policy explains what personal information we collect, why, and the
				choices and rights you have.
			</p>

			<h2>2. Information we collect</h2>
			<p>
				<strong>Account data:</strong> name, email address, and password (stored as a salted hash,
				never in plain text) — or, if you sign in with Google/Apple, the profile information those
				providers share with us.
			</p>
			<p>
				<strong>Billing data:</strong> if we ever offer a paid plan and you subscribe, our payment
				processor Stripe collects and stores your payment method; we receive your subscription
				status and Stripe customer ID, not your full card number.
			</p>
			<p>
				<strong>Content you provide:</strong> the study text, abstract, DOI, or PMID you submit to
				the evaluator, and — if you're signed in — the resulting evaluation reports we save to your
				account history. Anonymous (signed-out) evaluations are not stored. See{" "}
				<Link href="/ai-disclosure">AI Disclosure</Link> for what's sent to our AI provider when you
				enable AI assist.
			</p>
			<p>
				<strong>Technical data:</strong> IP address, browser/device information, session tokens, and
				log data, collected automatically to operate and secure the Service. Your IP address is also
				used, in hashed/bucketed form, to enforce the AI-assist free-usage limit described in the{" "}
				<Link href="/ai-disclosure">AI Disclosure</Link>.
			</p>
			<p>
				<strong>Cookies:</strong> see our <Link href="/cookies">Cookie Policy</Link>.
			</p>

			<h2>3. How we use information</h2>
			<ul>
				<li>
					To provide, maintain, and secure the Service (e.g. authentication, fraud prevention, and
					enforcing AI-assist usage limits).
				</li>
				<li>To process payments and manage subscriptions, if and when we offer them.</li>
				<li>To send account, security, and (where applicable) billing emails.</li>
				<li>
					To run AI assist when you request it, including sending your submitted study text to the
					AI provider named in the AI Disclosure.
				</li>
				<li>
					To comply with legal obligations and enforce our <Link href="/terms">Terms</Link> and{" "}
					<Link href="/acceptable-use">Acceptable Use Policy</Link>.
				</li>
			</ul>
			<p>
				<em>
					[TODO: if you add analytics, marketing, or advertising tools, list them here and in the{" "}
					<Link href="/cookies">Cookie Policy</Link>, and add the required consent/opt-out mechanism
					before enabling them.]
				</em>
			</p>

			<h2>4. Legal basis (EU/UK visitors)</h2>
			<p>
				If you're in the EEA, UK, or Switzerland, the GDPR/UK GDPR requires a lawful basis for each
				use above: performance of a contract (providing the Service you signed up for), legitimate
				interests (security, fraud prevention, abuse-limit enforcement, product improvement),
				consent (where we ask for it, e.g. optional cookies), and legal obligation (tax,
				compliance). You can withdraw consent-based processing at any time without affecting past
				processing.
			</p>

			<h2>5. Who we share information with</h2>
			<p>We don't sell your personal information. We share it only with:</p>
			<ul>
				<li>
					Service providers who process data on our behalf (e.g. hosting/infrastructure, Stripe for
					billing if enabled, our email provider for transactional email).
				</li>
				<li>
					AI providers, when you use AI assist — currently: {c.aiSubprocessors.join(", ")} (see{" "}
					<Link href="/ai-disclosure">AI Disclosure</Link> for what's sent and why).
				</li>
				<li>
					PubMed/NCBI and Crossref, when you submit a DOI, PMID, or PubMed link, so we can retrieve
					the study's metadata and abstract text.
				</li>
				<li>
					Law enforcement or other parties when required by law, or to protect the rights, safety,
					or property of us or others.
				</li>
				<li>
					A successor entity in the event of a merger, acquisition, or asset sale, with notice to
					you.
				</li>
			</ul>

			<h2>6. Data retention</h2>
			<p>
				We retain account data, and saved evaluation reports, for as long as your account is active,
				and for a reasonable period afterward to comply with legal, tax, and security obligations.
				You can request deletion at any time (Section 8); some data may be retained where law
				requires it (e.g. billing records).
			</p>

			<h2>7. International transfers</h2>
			<p>
				We're based in the United States, and information we collect is processed there and by
				service providers in other countries. Where GDPR applies, we rely on appropriate safeguards
				for transfers out of the EEA/UK (e.g. Standard Contractual Clauses) with our providers.
			</p>

			<h2>8. Your rights</h2>
			<p>
				<strong>California residents (CCPA/CPRA):</strong> you have the right to know what personal
				information we collect and how we use/disclose it, to request deletion, to correct
				inaccurate information, and to opt out of the sale or sharing of personal information — we
				don't sell or share personal information as those terms are defined by the CCPA/CPRA. You
				won't be discriminated against for exercising these rights.
			</p>
			<p>
				<strong>Other U.S. states</strong> (e.g. Virginia, Colorado, Connecticut, Utah, and others
				with comprehensive privacy laws) provide similar rights to access, correct, delete, and
				obtain a copy of your data, and to opt out of targeted advertising, sale, or certain
				profiling — to the extent those laws apply to us.
			</p>
			<p>
				<strong>EEA/UK/Switzerland residents (GDPR/UK GDPR):</strong> you have the right to access,
				correct, delete, restrict or object to processing, and receive a portable copy of your data,
				and to lodge a complaint with your local data protection authority.
			</p>
			<p>
				To exercise any of these rights, email {c.privacyEmail}. We may need to verify your identity
				before fulfilling a request.
			</p>
			<p>
				<em>
					[TODO: if you'll have a meaningful EU/UK user base, confirm whether you need to appoint an
					Article 27 GDPR representative / UK GDPR representative, and consider whether a
					cookie/consent banner needs a "reject non-essential" control — see{" "}
					<Link href="/cookies">Cookie Policy</Link>.]
				</em>
			</p>

			<h2>9. Children's privacy</h2>
			<p>
				The Service isn't directed to children under 13 (or under 16 where required by applicable
				law), and we don't knowingly collect personal information from them. If you believe a child
				has provided us personal information, contact {c.privacyEmail} and we'll delete it.
			</p>

			<h2>10. Security</h2>
			<p>
				We use technical and organizational measures appropriate to the sensitivity of the data we
				hold (encryption in transit, hashed passwords, access controls) — see{" "}
				<code>docs/security.md</code> in this project for the current baseline. No method of
				transmission or storage is 100% secure.
			</p>

			<h2>11. Changes to this policy</h2>
			<p>
				We may update this policy from time to time. Material changes will update the "Version" and
				"Last updated" date above, and where required by law we'll provide additional notice.
			</p>

			<h2>12. Contact</h2>
			<p>
				Questions or rights requests: {c.privacyEmail} — {c.registeredAddress}.
			</p>
		</>
	);
}
