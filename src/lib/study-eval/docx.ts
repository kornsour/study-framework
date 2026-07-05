import {
	AlignmentType,
	BorderStyle,
	Document,
	HeadingLevel,
	LevelFormat,
	Packer,
	Paragraph,
	ShadingType,
	Table,
	TableCell,
	TableRow,
	TextRun,
	WidthType,
} from "docx";
import type { AiAssist } from "./ai";
import type { Evaluation } from "./types";

/**
 * Render a completed evaluation as a Word (.docx) document. Pure formatting of
 * the same data the UI shows — the deterministic scorecard, flags, and (when
 * present) the AI bottom line. Returns the file bytes for a download response.
 */

const CONTENT_WIDTH = 9360; // US Letter, 1" margins (12240 - 2×1440)
const COL = { dim: 2000, score: 900, rationale: 6460 }; // sums to CONTENT_WIDTH

const VERDICT_LABEL: Record<Evaluation["verdict"], string> = {
	strong: "STRONG",
	mixed: "MIXED",
	weak: "WEAK",
};
const VERDICT_ADVICE: Record<Evaluation["verdict"], string> = {
	strong: "Trustworthy. Reasonable to act on, especially alongside similar findings.",
	mixed: "Suggestive, not settled. Useful signal; look for corroboration before acting.",
	weak: "Treat as a hypothesis at best. Do not change behavior on this alone.",
};

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function headingRow(): TableRow {
	const cell = (text: string, width: number) =>
		new TableCell({
			borders: cellBorders,
			width: { size: width, type: WidthType.DXA },
			shading: { fill: "E7ECF2", type: ShadingType.CLEAR, color: "auto" },
			margins: cellMargins,
			children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
		});
	return new TableRow({
		tableHeader: true,
		children: [cell("Dimension", COL.dim), cell("Score", COL.score), cell("Why", COL.rationale)],
	});
}

function dimensionRow(label: string, score: number, rationale: string): TableRow {
	const cell = (children: Paragraph[], width: number) =>
		new TableCell({
			borders: cellBorders,
			width: { size: width, type: WidthType.DXA },
			margins: cellMargins,
			children,
		});
	return new TableRow({
		children: [
			cell([new Paragraph({ children: [new TextRun({ text: label, bold: true })] })], COL.dim),
			cell(
				[
					new Paragraph({
						alignment: AlignmentType.CENTER,
						children: [new TextRun(`${score}/2`)],
					}),
				],
				COL.score,
			),
			cell([new Paragraph({ children: [new TextRun(rationale)] })], COL.rationale),
		],
	});
}

function heading(text: string): Paragraph {
	return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}

function bullet(text: string): Paragraph {
	return new Paragraph({
		numbering: { reference: "bullets", level: 0 },
		children: [new TextRun(text)],
	});
}

function labeledPara(label: string, value: string): Paragraph {
	return new Paragraph({
		spacing: { after: 80 },
		children: [new TextRun({ text: `${label} `, bold: true }), new TextRun(value)],
	});
}

export async function buildReportDocx(
	evaluation: Evaluation,
	ai: AiAssist | null,
	title: string | null,
): Promise<Buffer> {
	const children: (Paragraph | Table)[] = [];

	// Title + verdict
	children.push(
		new Paragraph({
			heading: HeadingLevel.HEADING_1,
			children: [new TextRun(title?.trim() || "Study evaluation")],
		}),
	);
	children.push(
		new Paragraph({
			spacing: { after: 60 },
			children: [
				new TextRun({ text: `Verdict: ${VERDICT_LABEL[evaluation.verdict]}`, bold: true }),
				new TextRun({ text: `  ·  ${evaluation.total}/14`, bold: true }),
			],
		}),
	);
	children.push(new Paragraph({ children: [new TextRun(VERDICT_ADVICE[evaluation.verdict])] }));

	if (evaluation.retracted) {
		children.push(
			new Paragraph({
				spacing: { before: 80 },
				children: [
					new TextRun({
						text: "This paper has been RETRACTED. Disregard its findings.",
						bold: true,
					}),
				],
			}),
		);
	}
	if (evaluation.overrideApplied) {
		children.push(
			new Paragraph({
				spacing: { before: 80 },
				children: [
					new TextRun({
						text: "Override applied: a causal claim built on a correlation caps the verdict at Weak regardless of the other scores.",
						italics: true,
					}),
				],
			}),
		);
	}

	// AI bottom line
	if (ai) {
		children.push(heading("Bottom line"));
		children.push(new Paragraph({ children: [new TextRun(ai.bottomLine)] }));
		children.push(labeledPara("Biggest strength:", ai.biggestStrength));
		children.push(labeledPara("Biggest weakness:", ai.biggestWeakness));
		children.push(labeledPara("Should it change anyone's behavior?", ai.behaviorAnswer));
		if (ai.likelyConfounders.length > 0) {
			children.push(labeledPara("Plausible confounders:", ""));
			for (const c of ai.likelyConfounders) children.push(bullet(c));
		}
	}

	// Scorecard table
	children.push(heading("Scorecard"));
	children.push(
		new Table({
			width: { size: CONTENT_WIDTH, type: WidthType.DXA },
			columnWidths: [COL.dim, COL.score, COL.rationale],
			rows: [
				headingRow(),
				...evaluation.dimensions.map((d) => dimensionRow(d.label, d.score, d.rationale)),
			],
		}),
	);

	// Flags
	const green = evaluation.flags.filter((f) => f.kind === "green");
	const red = evaluation.flags.filter((f) => f.kind === "red");
	if (green.length > 0) {
		children.push(heading("Green flags"));
		for (const f of green) children.push(bullet(f.message));
	}
	if (red.length > 0) {
		children.push(heading("Red flags"));
		for (const f of red) children.push(bullet(f.message));
	}

	// Provenance footer
	children.push(
		new Paragraph({
			spacing: { before: 200 },
			border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 8 } },
			children: [
				new TextRun({
					text: `Scored on the Good Study Framework${ai ? " with AI assist (Claude)" : ""}. Deterministic checks run on the study text and registry metadata; a score is a structured read, not a peer review.`,
					italics: true,
					size: 18,
				}),
			],
		}),
	);

	const doc = new Document({
		styles: {
			default: { document: { run: { font: "Arial", size: 22 } } },
			paragraphStyles: [
				{
					id: "Heading1",
					name: "Heading 1",
					basedOn: "Normal",
					next: "Normal",
					quickFormat: true,
					run: { size: 32, bold: true, font: "Arial" },
					paragraph: { spacing: { after: 160 } },
				},
				{
					id: "Heading2",
					name: "Heading 2",
					basedOn: "Normal",
					next: "Normal",
					quickFormat: true,
					run: { size: 26, bold: true, font: "Arial" },
					paragraph: { spacing: { before: 220, after: 100 } },
				},
			],
		},
		numbering: {
			config: [
				{
					reference: "bullets",
					levels: [
						{
							level: 0,
							format: LevelFormat.BULLET,
							text: "•",
							alignment: AlignmentType.LEFT,
							style: { paragraph: { indent: { left: 480, hanging: 240 } } },
						},
					],
				},
			],
		},
		sections: [
			{
				properties: {
					page: {
						size: { width: 12240, height: 15840 },
						margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
					},
				},
				children,
			},
		],
	});

	return Packer.toBuffer(doc);
}

/** Filename-safe slug from the study title (or a default). */
export function reportFilename(title: string | null): string {
	const base = (title?.trim() || "study-evaluation")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return `${base || "study-evaluation"}.docx`;
}
