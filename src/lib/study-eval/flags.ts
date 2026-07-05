import type { DimensionScore, Extraction, Flag } from "./types";

/**
 * Section-4 green/red flags, generated from the same extraction the scorecard
 * uses. Fast gut-check output alongside the numeric score.
 */
export function buildFlags(
	e: Extraction,
	dimensions: DimensionScore[],
	retracted: boolean,
): Flag[] {
	const flags: Flag[] = [];
	const green = (message: string) => flags.push({ kind: "green", message });
	const red = (message: string) => flags.push({ kind: "red", message });

	const design = e.design.design;
	const causalDesign =
		design === "rct" ||
		design === "natural-experiment" ||
		design === "meta-analysis" ||
		design === "systematic-review";

	if (retracted) red("This paper has been RETRACTED — disregard its findings.");

	// Design
	if (design === "rct") green("People were randomly assigned to groups — the gold standard.");
	if (design === "natural-experiment")
		green("A natural/quasi-experiment created near-random variation.");
	if (design === "meta-analysis" || design === "systematic-review")
		green("Pools multiple studies rather than resting on one result.");
	if (e.claim.makesCausalClaim && !causalDesign)
		red(
			`Causal language (${e.claim.causalPhrases
				.slice(0, 2)
				.map((p) => `"${p}"`)
				.join(", ")}) attached to a non-randomized design.`,
		);
	if (design === "case-report") red("No comparison/control group at all.");

	// Size
	const total = e.sampleSize.total;
	if (total !== null && total >= 1000) green(`Large sample (N≈${total.toLocaleString()}).`);
	if (total !== null && total < 100) red(`Small sample (N≈${total.toLocaleString()}).`);
	if (e.sampleSize.smallestGroup !== null && e.sampleSize.smallestGroup < 30)
		red(
			`A key comparison group has only ${e.sampleSize.smallestGroup} people — the finding may rest on a tiny subgroup.`,
		);

	// Measurement
	if (
		e.measurement.blinding === "double" ||
		(e.measurement.blinding === "assessor" && e.measurement.objectiveSignals.length > 0)
	)
		green("Outcomes assessed blind — expectations couldn't color the results.");
	if (e.measurement.objectiveSignals.length > 0 && e.measurement.selfReportSignals.length === 0)
		green("Outcomes measured objectively (records, labs, tests).");
	if (e.measurement.selfReportSignals.length > 0)
		red(
			`Key measures appear self-reported (${e.measurement.selfReportSignals.slice(0, 2).join(", ")}).`,
		);

	// Statistics
	if (e.statistics.hasConfidenceIntervals && e.statistics.hasAbsoluteMeasures)
		green("Reports absolute effects and confidence intervals, not just p-values.");
	if (e.statistics.hasRelativeMeasures && !e.statistics.hasAbsoluteMeasures)
		red('Only relative risk reported ("doubles your risk") with no absolute numbers.');
	if (e.statistics.multipleComparisonSignals.length > 0 && !e.registration.registered)
		red(
			`Unplanned analyses without pre-registration (${e.statistics.multipleComparisonSignals.slice(0, 2).join(", ")}) — fertile ground for cherry-picking.`,
		);

	// Transparency & robustness
	if (e.registration.registered)
		green(`Pre-registered (${e.registration.identifiers.slice(0, 2).join(", ")}).`);
	if (e.registration.dataSharingSignals.length > 0) green("Data/code shared openly.");
	const robustness = dimensions.find((d) => d.key === "robustness");
	if (robustness?.score === 2 && !retracted)
		green("Finding is consistent with a broader body of evidence.");
	if (robustness?.score === 0 && !retracted)
		red("A single new study positioned against the existing literature — wait for replication.");

	// Applicability
	if (e.population.isAnimalOrInVitro) red("Animal or petri-dish results — not findings in humans.");

	// Hedged conclusion under a confident claim
	if (e.claim.makesCausalClaim && e.claim.hedges)
		red("The fine print hedges (“may not be causal”) while the headline claim does not.");

	return flags;
}
