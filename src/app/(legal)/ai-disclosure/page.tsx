import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_VERSION, legalConfig } from "@/content/legal/config";

export const metadata: Metadata = { title: "AI Disclosure" };

export default function AiDisclosurePage() {
	const c = legalConfig;
	const providerList =
		c.aiSubprocessors.length > 0 ? c.aiSubprocessors.join(", ") : "none currently";
	return (
		<>
			<h1>AI Disclosure &amp; Transparency</h1>
			<p>
				Version {LEGAL_VERSION} · Effective {c.effectiveDate} · Last updated {c.lastUpdated}
			</p>

			<h2>1. You are interacting with AI</h2>
			<p>
				The study evaluator's "AI assist" feature uses artificial intelligence — specifically a
				large language model — to add reasoning and a plain-language summary to your evaluation.{" "}
				<strong>
					When you enable AI assist, you are interacting with an automated system, not a human.
				</strong>{" "}
				This disclosure is provided consistent with AI chatbot-disclosure laws (e.g. California's
				Bot Disclosure Law, Cal. Bus. &amp; Prof. Code §17941) and the EU AI Act's transparency
				obligations for systems that interact with natural persons (Article 50).
			</p>

			<h2>2. What AI assist actually does here</h2>
			<p>
				The Good Study Framework evaluator scores a study on 7 dimensions (design, causation, size,
				measurement, statistics, robustness, applicability) using{" "}
				<strong>deterministic, rule-based extraction and scoring</strong> — regular-expression and
				metadata-based checks against the study text and, where available, PubMed/Crossref registry
				data (e.g. publication type, retraction status). That scorecard runs for every evaluation
				and does not use AI. It is always available, whether or not AI assist is enabled, and
				whether or not you're signed in.
			</p>
			<p>
				If you separately opt in to <strong>AI assist</strong> (a checkbox on the evaluation form),
				your submitted study text and the deterministic scorecard are sent to the AI provider named
				in Section 3, which returns:
			</p>
			<ul>
				<li>
					<strong>Confounder reasoning</strong> — plausible third variables that could explain an
					observed association, beyond what the deterministic checks can identify from text patterns
					alone.
				</li>
				<li>
					<strong>A second opinion on low-confidence dimensions</strong> — the deterministic engine
					flags specific dimensions it isn't confident scoring from the text; AI assist reviews only
					those flagged dimensions and may adjust their score, never the dimensions the engine
					already scored confidently.
				</li>
				<li>
					<strong>A plain-speak bottom line</strong> — a short, non-jargon summary of the biggest
					strength, biggest weakness, and whether the finding should change anyone's behavior.
				</li>
			</ul>
			<p>
				AI assist never overrides the deterministic scorecard wholesale — it only augments the
				specific dimensions the engine marked as needing review, and adds narrative output alongside
				the score. If the AI call fails or is withheld (see Section 4), the deterministic scorecard
				is shown on its own.
			</p>

			<h2>3. Who processes your input</h2>
			<p>
				When you enable AI assist, the study text you submit (and the deterministic scorecard) is
				sent to the following third-party AI provider for processing: {providerList}. See our{" "}
				<Link href="/privacy">Privacy Policy</Link> for how we handle that data more generally, and
				the provider's own privacy/data-use terms for how they handle it on their side (in
				particular, whether your input is used to train their models — confirm this with your
				provider agreement and disclose it here).
			</p>

			<h2>4. Usage limits — AI assist is free today, with limits</h2>
			<p>
				There is no charge to use this Service or its AI-assist feature today. That said, AI assist
				is metered by two independent abuse controls, both designed so the deterministic scorecard
				is never affected — only the optional AI section is withheld when a limit is hit:
			</p>
			<ul>
				<li>
					<strong>Sign-in required, with a per-account monthly limit.</strong> AI assist is
					available only when you're signed in, and each account gets a limited number of AI-assist
					evaluations per calendar month. This keeps AI usage tied to a stable account rather than
					an easily-rotated IP address. Once you've used your monthly allowance, further evaluations
					still run the full deterministic scorecard; only the AI-assist section is withheld until
					the next month. The deterministic scorecard never requires sign-in.
				</li>
				<li>
					<strong>Site-wide monthly token cap.</strong> Independent of any individual visitor's
					usage, the Service enforces a hard ceiling on the total AI tokens it will spend across all
					users in a calendar month, as a cost/abuse backstop. If that cap is reached, AI assist
					pauses for everyone until the next month, regardless of any individual visitor's remaining
					allowance.
				</li>
			</ul>
			<p>
				These are usage/abuse controls, not a paid pricing tier — you are not charged for AI assist,
				and reaching a limit only means AI assist is paused, not that your account is affected.
			</p>

			<h2>5. Limitations — please read</h2>
			<ul>
				<li>
					AI-assist output can be <strong>inaccurate, incomplete, outdated, or biased</strong>. It
					reflects patterns in training data and the text you submitted, not verified facts about
					the underlying research.
				</li>
				<li>
					AI-assist output is <strong>not professional advice</strong> — not medical, scientific,
					statistical, legal, or financial advice — even if it's phrased confidently.
				</li>
				<li>
					Neither the deterministic scorecard nor AI assist is a substitute for peer review or your
					own critical reading of the study.
				</li>
				<li>
					You're responsible for independently verifying anything you rely on before acting on it,
					especially the "bottom line" and "behavior answer" outputs, which are intentionally
					opinionated summaries, not neutral facts.
				</li>
			</ul>

			<h2>6. High-risk &amp; consequential uses</h2>
			<p>
				This Service's default AI disclosure and safeguards are <strong>not sufficient</strong> if
				you use (or let others use) this Service's output to make or materially inform a decision
				about a specific person in an area such as employment, credit/lending, housing, insurance,
				healthcare, or education. Depending on your jurisdiction and use case, that can trigger
				additional obligations, for example:
			</p>
			<ul>
				<li>
					The Colorado AI Act (SB 24-205) — impact assessments, consumer notice, and an opportunity
					to correct/appeal for "high-risk" AI systems used in consequential decisions.
				</li>
				<li>
					NYC Local Law 144 — bias audits and candidate notice for automated employment-decision
					tools used by NYC employers.
				</li>
				<li>
					The EU AI Act (Regulation (EU) 2024/1689) — Annex III "high-risk" obligations (risk
					management, human oversight, logging) if the system is offered to users in the EU.
				</li>
				<li>
					Illinois, and a growing list of other states, regulate AI use in specific contexts like
					employment interviews and insurance underwriting.
				</li>
			</ul>
			<p>
				This Service is built for general research literacy, not as a decision-support tool for the
				high-risk uses above. If that use case emerges, we will add feature-specific disclosures, a
				human-review and appeal path, and any documented impact assessments required by applicable
				law before deployment.
			</p>

			<h2>7. Synthetic content</h2>
			<p>
				AI assist only generates text (reasoning and summaries) — the Service does not generate
				images, audio, or video, so synthetic-media labeling requirements (e.g. California's AI
				Transparency Act, SB 942) are not currently applicable. Revisit this if that changes.
			</p>

			<h2>8. Your choices</h2>
			<p>
				AI assist is opt-in per evaluation — it only runs when you check the "AI assist" box on the
				evaluation form. You can always use the deterministic scorecard on its own by leaving that
				box unchecked. There is currently no mechanism to request that your input be excluded from
				the AI provider's own model-training use, beyond what's described in their terms; confirm
				this with the provider agreement and update this section if that changes.
			</p>

			<h2>9. Contact</h2>
			<p>Questions about our use of AI: {c.contactEmail}.</p>
		</>
	);
}
