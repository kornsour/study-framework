import { expect, test } from "@playwright/test";

/**
 * Email/password happy path: sign up → land on the protected dashboard →
 * sign out → confirm the dashboard now redirects to sign-in.
 *
 * Requires a local database (the dev server connects to DATABASE_URL). Run with
 * `pnpm e2e` after `pnpm bootstrap`. E2E is local-only (ADR-0008).
 */
test("sign up, reach dashboard, sign out, get redirected", async ({ page }) => {
	// Unique email per run so re-runs don't collide on the unique constraint.
	const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	const email = `e2e-${stamp}@example.com`;
	const password = "correct horse battery staple";

	await page.goto("/sign-up");
	await page.getByLabel("Name").fill("E2E User");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByLabel("Confirm password").fill(password);
	await page.getByRole("button", { name: "Create account" }).click();

	await expect(page).toHaveURL(/\/dashboard/);
	await expect(page.getByText(email)).toBeVisible();

	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page).toHaveURL(/\/sign-in/);

	// Protected route now bounces to sign-in (via middleware cookie check or the
	// server-side requireUser guard — either way, no access).
	await page.goto("/dashboard");
	await expect(page).toHaveURL(/\/sign-in/);
});

test("middleware redirects a cold request to a protected route", async ({ browser }) => {
	// Fresh context = no cookies at all, so the optimistic middleware check fires
	// and preserves the intended destination in `next`.
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto("/dashboard");
	await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
	await context.close();
});
