# Auth setup

Email/password works out of the box. Google and Apple are inert until you add
their keys and flip the `NEXT_PUBLIC_*_ENABLED` flag. Auth is better-auth,
self-hosted — see [ADR-0012](../adr/0012-auth-better-auth.md).

Redirect/callback URL shape for every provider: `<APP_URL>/api/auth/callback/<provider>`
(register both `http://localhost:3000/...` and your production URL).

## Google

1. Cloud Console → **OAuth consent screen** (External): add scopes `email`,
   `profile`, `openid`.
2. **Credentials → Create OAuth client ID → Web application.** Authorized
   redirect URIs: `http://localhost:3000/api/auth/callback/google` and the prod URL.
3. In `.env`:
   ```
   NEXT_PUBLIC_GOOGLE_ENABLED="1"
   GOOGLE_CLIENT_ID="…"
   GOOGLE_CLIENT_SECRET="…"
   ```

`gcloud` can create/select the GCP project, but the OAuth consent screen and
client-ID creation are Console UI.

## Apple (paid, more involved)

Requires the **Apple Developer Program ($99/yr)**.

1. **App ID** → **Services ID** (this is `APPLE_CLIENT_ID`, e.g.
   `com.example.app.web`); enable Sign in with Apple; add return URL
   `<APP_URL>/api/auth/callback/apple`.
2. Create a **Sign in with Apple key** (.p8); note **Key ID** and **Team ID**.
3. Generate the **client secret JWT** (ES256; `iss`=Team ID, `sub`=Services ID,
   `aud`=`https://appleid.apple.com`, `kid`=Key ID). ⚠️ **Expires in ≤ 6 months
   — set a rotation reminder.**
4. In `.env`:
   ```
   NEXT_PUBLIC_APPLE_ENABLED="1"
   APPLE_CLIENT_ID="com.example.app.web"
   APPLE_CLIENT_SECRET="<the generated JWT>"
   ```

## Password policy

Length ≥ 12 + a common-password blocklist (NIST 800-63B), enforced on the form,
in the shared Zod schema, and server-side in a better-auth `before` hook. To
require composition (upper/lower/number/special), flip `REQUIRE_COMPOSITION` in
`src/lib/password.ts` — the one knob.

## Email verification & reset

better-auth sends verification + reset emails through `src/lib/email` (console in
dev, AWS SES when `AWS_REGION` is set). Verification is only *required* in
production, so local dev and e2e aren't blocked on it.
