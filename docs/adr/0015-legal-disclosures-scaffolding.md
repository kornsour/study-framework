# ADR-0015: Legal-disclosure page scaffolding (ToS, Privacy, AUP, AI Disclosure, Cookies)

- Status: Accepted
- Date: 2026-07-05

## Context

This app collects accounts and puts a real AI feature directly in front of end
users: the study evaluator's optional AI-assist pass, which sends submitted
study text to the Anthropic API. That combination sits under several
overlapping legal regimes: US state consumer-privacy laws (CCPA/CPRA and
similar in VA/CO/CT/UT/etc.), GDPR/UK GDPR if any EU/UK visitors show up
(which a public Vercel deployment doesn't prevent), COPPA, and a fast-moving
set of AI-specific transparency/disclosure laws (chatbot-disclosure statutes,
the EU AI Act's Article 50 transparency obligation, and
"high-risk"/consequential-decision regimes like the Colorado AI Act and NYC
Local Law 144). Shipping with no legal pages at all, or with generic legal
pages that don't mention the AI-assist feature, are both worse starting points
than a scaffold that at least names the right categories and describes what
the feature actually does.

This scaffold was ported from the `typescript-template` starter (see that
repo's own ADR-0015) and adapted to this app's real auth setup (better-auth,
no prior legal fields) and real AI feature (the study evaluator, not a generic
placeholder). Claude Code is not a law firm and this scaffold ships no legally
reviewed text. The goal is narrower: make it structurally hard to forget the
legal-disclosure surface a real launch needs, and put the AI-specific
disclosure at the point of use, not just buried in a footer link.

## Decision

- Five pages under `src/app/(legal)/`: `terms`, `privacy`, `acceptable-use`,
  `ai-disclosure`, `cookies`. Full starter boilerplate text (not just section
  headers), each carrying a visible `LegalTemplateNotice` banner stating it's
  unreviewed template text.
- `src/content/legal/config.ts` centralizes the fill-in-before-launch facts
  (company name/entity/address, contact emails, governing law, AI
  sub-processors) plus a `LEGAL_VERSION` constant. `contactEmail` /
  `privacyEmail` currently point at the owner's personal Gmail — this project
  has no live custom domain yet, so there's no real support address to use
  instead.
- Sign-up requires an explicit "I agree to the Terms and Privacy Policy"
  checkbox (`src/components/auth-form.tsx`), enforced **server-side** in
  `src/lib/auth.ts`'s existing `before` hook (the same defense-in-depth pattern
  already used for password policy) — a request missing or mismatching the
  current `LEGAL_VERSION` is rejected, not just soft-validated client-side.
  Acceptance is persisted on the `user` row (new `legalAcceptedVersion`,
  `legalAcceptedAt` columns) via better-auth's `additionalFields`.
- Unlike the upstream template (which gates the AI Disclosure footer link
  behind `NEXT_PUBLIC_AI_FEATURES_ENABLED`), this app's footer always shows the
  AI Disclosure link — study-eval's AI assist is a core, always-present part
  of the product, not an optional feature some deployments skip, so there's no
  env flag to gate on here.
- The AI Disclosure page (`src/app/(legal)/ai-disclosure/page.tsx`) is grounded
  in the actual code path in `src/lib/study-eval/ai.ts` and
  `src/lib/study-eval/quota.ts`: the deterministic 7-dimension scorecard always
  runs and is unaffected by AI assist; AI assist (opt-in per evaluation) adds
  confounder reasoning, a second opinion limited to low-confidence dimensions,
  and a plain-speak bottom line; it's gated by a per-visitor-IP monthly free
  limit and a site-wide monthly token cap, both of which only withhold the AI
  section, never the scorecard. There's no paid tier today, so the page
  frames these as free-tier usage limits, not billing.
- `<AiDisclosureNotice>` (`src/components/ai-disclosure-notice.tsx`) is dropped
  into the shared `ReportView` component in `src/components/study-evaluator.tsx`,
  next to the AI "Bottom line" section — the one place AI-assist output is
  actually rendered, covering both the live `/evaluate` flow and saved
  `/reports/[id]` views.
- `<CookieBanner>` is a notice, not a consent manager: this app only sets
  strictly-necessary cookies (better-auth session, optional OAuth state),
  which don't require opt-in consent under GDPR/ePrivacy, only disclosure.
  `docs/legal.md` and the Cookie Policy page both flag that adding
  analytics/ads/tracking cookies later requires upgrading this to a real
  accept/reject control first.
- `docs/legal.md` is the pre-launch checklist and a summary of the researched
  landscape, explicitly framed as not legal advice.

## Consequences

- The legal-page surface is wired up (routes, footer links, sign-up gating,
  versioned acceptance tracking) — but the actual legal text is still
  AI-drafted boilerplate, not attorney-reviewed. `LegalTemplateNotice` makes
  that gap visible on every page instead of silent.
- `LEGAL_VERSION` bump on a policy change flips existing users' stored version
  out of sync with the current constant; this scaffold does not force
  re-acceptance for existing sessions on a version bump — only new sign-ups
  are gated. Force re-acceptance at `requireUser()`/`getSession()` call sites
  if that's ever needed.
- The placeholder contact email (owner's personal Gmail) needs to be swapped
  for a real domain-based address once this project has a live domain — this
  is flagged in `src/content/legal/config.ts`, `docs/legal.md`, and the PR that
  introduced this scaffold.
- `high-risk`/consequential-decision AI use (employment, credit, housing,
  insurance, healthcare, education) needs more than what's here — impact
  assessments, human-review/appeal paths, and jurisdiction-specific notices.
  The AI Disclosure page flags this explicitly; the study evaluator is built
  for general research literacy, not decision-support about a specific person.
