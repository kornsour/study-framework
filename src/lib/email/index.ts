import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { env } from "@/env";

/**
 * Pluggable transactional email.
 *
 *   - No AWS_REGION  → log the message (incl. any links) to the server
 *     console. This keeps email-verification and password-reset flows fully
 *     working in local development with zero setup.
 *   - AWS_REGION set  → send for real via AWS SES. Credentials come from the
 *     SDK's default provider chain (IAM role, SSO profile, etc.) — no secret
 *     env vars to manage.
 *
 * Swap the `sendViaSes` body for Resend/Postmark/etc. if you prefer another
 * provider — the rest of the app only depends on `sendEmail`.
 */

export type SendEmailInput = {
	to: string;
	subject: string;
	/** Plain-text body. `html` is optional and falls back to text. */
	text: string;
	html?: string;
};

const FROM = env.EMAIL_FROM ?? "noreply@example.com";

export async function sendEmail(input: SendEmailInput): Promise<void> {
	if (!env.AWS_REGION) {
		console.info(
			`\n📧 [dev email — no AWS_REGION set]\n  to:      ${input.to}\n  subject: ${input.subject}\n  ${input.text}\n`,
		);
		return;
	}
	await sendViaSes(input);
}

const sesClient = new SESv2Client({});

async function sendViaSes(input: SendEmailInput): Promise<void> {
	await sesClient.send(
		new SendEmailCommand({
			FromEmailAddress: FROM,
			Destination: { ToAddresses: [input.to] },
			Content: {
				Simple: {
					Subject: { Data: input.subject },
					Body: {
						Text: { Data: input.text },
						Html: { Data: input.html ?? input.text },
					},
				},
			},
		}),
	);
}
