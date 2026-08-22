/// <reference path="./.sst/platform/config.d.ts" />

const optionalSecret = (name: string) => new sst.Secret(name, "");

export default $config({
	app(input) {
		return {
			name: "crapstudy",
			home: "aws",
			protect: input?.stage === "production",
			removal: input?.stage === "production" ? "retain" : "remove",
			providers: {
				aws: {
					region: "us-west-2",
				},
			},
		};
	},
	async run() {
		// NOTE: gestplate's config applies a permissions boundary here
		// (arn:aws:iam::915275040938:policy/applications-workload-boundary).
		// That policy lives in the Secondary account (915275040938), not in
		// Lurking Walrus (410536315347) where this app deploys — the boundary
		// does not exist in this account, so applying it would break every
		// IAM role SST creates. It is deliberately omitted here. Reintroduce a
		// $transform(aws.iam.Role, ...) boundary once an equivalent policy
		// exists in the Lurking Walrus (410536315347) account.

		const databaseUrl = new sst.Secret("DatabaseUrl");
		const betterAuthSecret = new sst.Secret("BetterAuthSecret");
		const appUrl = new sst.Secret("AppUrl", "http://localhost:3000");
		const googleClientId = optionalSecret("GoogleClientId");
		const googleClientSecret = optionalSecret("GoogleClientSecret");
		const appleClientId = optionalSecret("AppleClientId");
		const appleClientSecret = optionalSecret("AppleClientSecret");
		const emailFrom = optionalSecret("EmailFrom");
		const stripeSecretKey = optionalSecret("StripeSecretKey");
		const stripeWebhookSigningSecret = optionalSecret("StripeWebhookSigningSecret");
		const stripePublishableKey = optionalSecret("StripePublishableKey");
		const stripePriceId = optionalSecret("StripePriceId");
		const anthropicApiKey = optionalSecret("AnthropicApiKey");

		const web = new sst.aws.Nextjs("Web", {
			environment: {
				DATABASE_URL: databaseUrl.value,
				BETTER_AUTH_SECRET: betterAuthSecret.value,
				GOOGLE_CLIENT_ID: googleClientId.value,
				GOOGLE_CLIENT_SECRET: googleClientSecret.value,
				APPLE_CLIENT_ID: appleClientId.value,
				APPLE_CLIENT_SECRET: appleClientSecret.value,
				// AWS_REGION is deliberately NOT passed here. It is a Lambda-reserved
				// environment variable, and Lambda rejects any function configuration
				// that sets one — that fails the whole deploy rather than degrading.
				// src/env.ts marks it optional, and the AWS SDK's default provider
				// chain already resolves the region inside the execution environment,
				// so SES sends correctly without it.
				EMAIL_FROM: emailFrom.value,
				STRIPE_SECRET_KEY: stripeSecretKey.value,
				STRIPE_WEBHOOK_SIGNING_SECRET: stripeWebhookSigningSecret.value,
				ANTHROPIC_API_KEY: anthropicApiKey.value,
				// Abuse-control caps (src/lib/study-eval/quota.ts). Non-secret —
				// mirrors the defaults in src/env.ts; bump here if the defaults
				// ever need to differ per deployed stage.
				AI_FREE_EVALS_PER_MONTH: "3",
				AI_PRO_EVALS_PER_MONTH: "100",
				AI_GLOBAL_MONTHLY_TOKEN_CAP: "1000000",
				NEXT_PUBLIC_APP_URL: appUrl.value,
				NEXT_PUBLIC_GOOGLE_ENABLED: "false",
				NEXT_PUBLIC_APPLE_ENABLED: "false",
				NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripePublishableKey.value,
				NEXT_PUBLIC_STRIPE_PRICE_ID: stripePriceId.value,
			},
			permissions: [
				{
					actions: ["ses:SendEmail"],
					resources: ["*"],
				},
			],
			protection: "oac-with-edge-signing",
			server: {
				architecture: "arm64",
				runtime: "nodejs24.x",
			},
			warm: 0,
			transform: {
				server: {
					logging: { retention: "1 week" },
				},
				imageOptimizer: {
					logging: { retention: "1 week" },
				},
				revalidationEventsSubscriber: {
					logging: { retention: "1 week" },
				},
				revalidationSeeder: {
					logging: { retention: "1 week" },
				},
			},
		});

		return {
			url: web.url,
		};
	},
});
