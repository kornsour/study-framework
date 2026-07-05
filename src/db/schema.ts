import { boolean, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  better-auth core tables                                                    */
/*  Field shapes must match what better-auth's Drizzle adapter expects.        */
/*  The `account` table already carries OAuth token columns + `providerId`,    */
/*  so Google / Apple / any social provider needs no schema change.            */
/*  See docs/adr/0012-auth-better-auth.md.                                      */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified")
		.$defaultFn(() => false)
		.notNull(),
	image: text("image"),
	// Coarse app-level role for gating. Multi-tenant org/RBAC is intentionally
	// left to each app (see the plan's "out of scope").
	role: text("role").default("user").notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => new Date())
		.notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

/* -------------------------------------------------------------------------- */
/*  Stripe billing tables                                                       */
/*  Populated by the webhook at src/app/api/webhooks/stripe/route.ts.          */
/*  Inert until STRIPE_SECRET_KEY is set. See docs/adr/0013-stripe-billing.md.  */
/* -------------------------------------------------------------------------- */

export const customer = pgTable("customer", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	stripeCustomerId: text("stripe_customer_id").notNull().unique(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
});

/* -------------------------------------------------------------------------- */
/*  AI-assist usage metering                                                    */
/*  Backs the abuse controls on the study evaluator's optional Claude pass:     */
/*    - one row per (bucketKey, period) where period is a UTC "YYYY-MM" month.  */
/*    - bucketKey "ip:<addr>" tracks a visitor's monthly free-eval count.       */
/*    - bucketKey "global" is the site-wide backstop (total tokens spent).      */
/*  See src/lib/study-eval/quota.ts.                                            */
/* -------------------------------------------------------------------------- */

export const aiUsage = pgTable(
	"ai_usage",
	{
		bucketKey: text("bucket_key").notNull(),
		period: text("period").notNull(),
		count: integer("count").default(0).notNull(),
		tokens: integer("tokens").default(0).notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(t) => [primaryKey({ columns: [t.bucketKey, t.period] })],
);

export const subscription = pgTable("subscription", {
	// Stripe subscription id (sub_…) is the natural primary key.
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	stripeCustomerId: text("stripe_customer_id").notNull(),
	// active | trialing | past_due | canceled | incomplete | … (Stripe status string)
	status: text("status").notNull(),
	priceId: text("price_id"),
	currentPeriodEnd: timestamp("current_period_end"),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => new Date())
		.notNull(),
});
