import { z } from "zod/v4";
import type { AiAssist } from "@/lib/study-eval/ai";
import { buildReportDocx, reportFilename } from "@/lib/study-eval/docx";
import type { Evaluation } from "@/lib/study-eval/types";

// docx generation uses Node Buffer APIs.
export const runtime = "nodejs";

/**
 * POST an evaluation result and get back a .docx download. The body is the same
 * shape the evaluator returns to the client; validated lightly (it's non-sensitive
 * report data being formatted, not a trust boundary) so a malformed body 400s
 * instead of 500-ing.
 */
const bodySchema = z.object({
	title: z.string().nullable().optional(),
	evaluation: z.looseObject({
		verdict: z.enum(["strong", "mixed", "weak"]),
		total: z.number(),
		dimensions: z.array(
			z.looseObject({ label: z.string(), score: z.number(), rationale: z.string() }),
		),
		flags: z.array(z.looseObject({ kind: z.enum(["green", "red"]), message: z.string() })),
	}),
	ai: z.looseObject({}).nullable().optional(),
});

export async function POST(req: Request): Promise<Response> {
	let json: unknown;
	try {
		json = await req.json();
	} catch {
		return new Response("Invalid JSON.", { status: 400 });
	}

	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return new Response("Malformed report payload.", { status: 400 });
	}

	const { title = null, evaluation, ai } = parsed.data;
	const buffer = await buildReportDocx(
		evaluation as unknown as Evaluation,
		(ai ?? null) as AiAssist | null,
		title ?? null,
	);

	return new Response(new Uint8Array(buffer), {
		status: 200,
		headers: {
			"Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"Content-Disposition": `attachment; filename="${reportFilename(title ?? null)}"`,
			"Cache-Control": "no-store",
		},
	});
}
