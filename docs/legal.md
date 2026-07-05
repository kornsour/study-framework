# Legal disclosures

> **Not legal advice.** This document and the pages under `src/app/(legal)/`
> are a starting scaffold, ported from the `typescript-template` starter and
> adapted to describe this app's actual study-evaluator AI-assist feature.
> They are not a substitute for review by a licensed attorney in the state(s)
> and countries where this business and its users are. Treat everything below
> as "things to check with counsel," not as a compliance guarantee.

## What's scaffolded

| Page | Route | Covers |
|------|-------|--------|
| Terms of Service | `/terms` | Account terms, billing, IP, liability, governing law |
| Privacy Policy | `/privacy` | What's collected, why, sharing, retention, rights requests |
| Acceptable Use Policy | `/acceptable-use` | Prohibited conduct, including AI-assist misuse |
| AI Disclosure | `/ai-disclosure` | What the study evaluator's AI assist does, its usage limits, limitations, high-risk-use warning |
| Cookie Policy | `/cookies` | Current (essential-only) cookie use |

Plus:
- `src/content/legal/config.ts` — company info, governing law, and `LEGAL_VERSION` in one place.
- Sign-up requires an explicit ToS/Privacy checkbox, enforced server-side in `src/lib/auth.ts` (not just client-side), and the accepted version + timestamp is stored on the `user` row (`legalAcceptedVersion` / `legalAcceptedAt`).
- `<AiDisclosureNotice>` (`src/components/ai-disclosure-notice.tsx`) — dropped into `ReportView` in `src/components/study-evaluator.tsx`, next to the AI "Bottom line" section, so the disclosure is at the point of use (covers both `/evaluate` and saved `/reports/[id]` views).
- The AI Disclosure footer link is always shown (not env-flagged) — AI assist is a core, always-present part of this app, unlike the template's opt-in `NEXT_PUBLIC_AI_FEATURES_ENABLED` posture.
- `<CookieBanner>` — a notice, not a consent manager (see "Cookies" below).

## This app's real AI feature (grounding for the AI Disclosure page)

The study evaluator (`src/lib/study-eval/`) always runs a **deterministic**,
rule-based scorecard (7 dimensions, 0–2 each) — no AI involved, no network
calls beyond optional PubMed/Crossref lookups for DOI/PMID resolution.

Opting in to **AI assist** (`src/lib/study-eval/ai.ts`) sends the study text
and the deterministic scorecard to the Anthropic API (Claude), which returns
confounder reasoning, a second opinion limited to the specific dimensions the
deterministic pass flagged as low-confidence, and a plain-speak bottom line.
The deterministic scorecard is never affected by whether AI assist runs.

Abuse controls (`src/lib/study-eval/quota.ts`, backed by the `ai_usage`
table): a per-visitor-IP monthly free-evaluation limit
(`AI_FREE_EVALS_PER_MONTH`), and a site-wide monthly Claude-token cap
(`AI_GLOBAL_MONTHLY_TOKEN_CAP`) as a cost/abuse backstop. Hitting either limit
only withholds the AI-assist section; the scorecard is unaffected. There is no
paid pricing tier today — these are free-tier usage limits, not billing.

## Before you launch

1. Get all five pages reviewed by an attorney licensed in Michigan (or wherever this business incorporates) — and in any other jurisdiction with a meaningful user base — before treating this as production-ready.
2. **Contact email placeholder**: `contactEmail` / `privacyEmail` in `src/content/legal/config.ts` currently point at the owner's personal Gmail because this project has no live custom domain yet. Swap for a domain-based address (e.g. `legal@studyframework.app`) once one exists.
3. Confirm the AI-disclosure content in `src/app/(legal)/ai-disclosure/page.tsx` against the actual behavior of `src/lib/study-eval/ai.ts` and `src/lib/study-eval/quota.ts` any time that code changes — this page is only accurate as of the PR that added it.
4. Decide whether you need a **GDPR/UK GDPR Article 27 representative** — relevant if there's a meaningful EU/UK user base.
5. Decide whether you want a mandatory-arbitration / class-action-waiver clause in the ToS. Deliberately left out as a business decision, not a default.
6. If billing (`STRIPE_SECRET_KEY`) is ever turned on for real, revisit `/terms` Section 5, which currently describes the feature as free with placeholder billing language for a future paid tier.
7. When you materially change a legal page, bump `LEGAL_VERSION` in `src/content/legal/config.ts`. New sign-ups are gated on the current version automatically; **existing users are not automatically re-prompted** — add that check to `requireUser()`/`getSession()` call sites if you need to force re-acceptance.
8. If analytics, ads, or any non-essential tracking cookie is added, upgrade `src/components/cookie-banner.tsx` from a notice into a real accept/reject consent control *before* those trackers load, and list them in the Cookie Policy.

## The researched landscape (general awareness, not advice)

**US state consumer-privacy laws.** California's CCPA/CPRA (Cal. Civ. Code
§1798.100 et seq.) is the most prescriptive — rights to know, delete, correct,
and opt out of sale/sharing, plus a specific rights-request channel. Virginia
(VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), and a growing list
of other states have broadly similar (not identical) comprehensive privacy
laws, generally triggered by revenue or data-volume thresholds.

**Children's privacy.** COPPA applies to services directed at, or that
knowingly collect data from, children under 13. This app's default posture is
"not directed to children" — if that's not true, this needs much more than a
footer disclosure.

**GDPR / UK GDPR.** Applies based on *who your users are*, not where the
company is incorporated. Key differences from US law: an affirmative lawful
basis is needed for each processing purpose (not just a disclosure), consent
must be opt-in for non-essential cookies/tracking, and data-subject rights
(access, erasure, portability, objection) are broader than most US state
rights.

**AI-specific — the fast-moving part.**
- **Chatbot/bot-disclosure laws** — e.g. California's Bot Disclosure Law (Cal.
  Bus. & Prof. Code §17941) — require disclosing that a user is interacting
  with an automated system, at least in commercial/influence contexts.
- **EU AI Act (Regulation (EU) 2024/1689)** — Article 50 requires informing
  users they're interacting with an AI system; Annex III lists "high-risk" use
  cases (employment, credit, education, law enforcement, etc.) that carry much
  heavier obligations.
- **Colorado AI Act (SB 24-205)** — impact assessments, consumer notice, and a
  correction/appeal path for "high-risk" AI systems used in "consequential
  decisions" about a person.
- **NYC Local Law 144** — bias audits + candidate notice for automated
  employment-decision tools used by NYC employers.
- **California SB 942 (AI Transparency Act)** and **AB 2013 (Training Data
  Transparency Act)** — provenance/detection-tool and training-data-disclosure
  obligations, generally aimed at larger-scale generative-AI providers.
- **Utah AI Policy Act** — disclosure obligations for generative AI used in
  certain regulated consumer interactions.

None of the above is a complete list. This app's study evaluator is built for
general research literacy, not as a decision-support tool for employment,
lending, housing, insurance, healthcare, or education decisions about a
specific person — if that ever changes, get counsel involved before shipping,
not after.
