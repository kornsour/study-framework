#!/usr/bin/env node
/* -------------------------------------------------------------------------- */
/*  install-hooks — point core.hooksPath at scripts/hooks, RELATIVELY.        */
/*                                                                            */
/*  `core.hooksPath` lives in .git/config, which every worktree SHARES. So    */
/*  the one thing that matters here is that the stored value stays RELATIVE:  */
/*  git resolves a relative hooksPath against the top level of whichever      */
/*  working tree the hook is running for, so one shared `scripts/hooks` gives */
/*  every worktree its OWN hooks — and an absolute path gives all of them the */
/*  main checkout's copy instead.                                             */
/*                                                                            */
/*  That is not a theoretical difference. An absolute value was found stored  */
/*  here, and it meant a worktree editing scripts/hooks/pre-push and then     */
/*  running a real `git push` to test it silently executed the MAIN           */
/*  CHECKOUT's stale copy — the push looked gated, and the change under test  */
/*  never ran. Verified on git 2.50.1: relative resolves per worktree (from   */
/*  nested subdirectories too), absolute leaks across all of them.            */
/*                                                                            */
/*  THE SECOND LAYER. With extensions.worktreeConfig on, a worktree may also  */
/*  carry its own core.hooksPath in .git/worktrees/<name>/config.worktree,    */
/*  which outranks the shared value. Repo tooling does not write those — the  */
/*  Claude Code worktree harness does, with an absolute path — so they cannot */
/*  be prevented from here, only repaired. We unset only an override pointing */
/*  OUTSIDE its own worktree: that one is always cross-worktree leakage,      */
/*  while a self-referential override is merely a verbose way of agreeing.    */
/*                                                                            */
/*  Run from anywhere in the repo:  pnpm hooks:install                        */
/*  It is idempotent, and `pnpm agent:new` runs it for each new worktree.     */
/* -------------------------------------------------------------------------- */

import { execFileSync } from "node:child_process";
import path from "node:path";

const RELATIVE_HOOKS_PATH = "scripts/hooks";

const c = {
	green: (s) => `\x1b[32m${s}\x1b[0m`,
	yellow: (s) => `\x1b[33m${s}\x1b[0m`,
	dim: (s) => `\x1b[2m${s}\x1b[0m`,
	bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/** Run git, returning trimmed stdout — or null for any non-zero exit. */
function git(args, cwd) {
	try {
		return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
	} catch {
		return null;
	}
}

const root = git(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
if (!root) {
	console.error("install-hooks: not inside a git repository.");
	process.exit(1);
}
/** The main checkout is the parent of the common .git directory. */
const mainCheckout = path.dirname(root);

/* -- 1. The shared value ---------------------------------------------------- */

const before = git(["config", "--local", "--get", "core.hooksPath"], mainCheckout);
git(["config", "--local", "core.hooksPath", RELATIVE_HOOKS_PATH], mainCheckout);

if (before === RELATIVE_HOOKS_PATH) {
	console.log(`  ${c.green("✓")} core.hooksPath ${c.dim(`= ${RELATIVE_HOOKS_PATH} (already correct)`)}`);
} else if (before && path.isAbsolute(before)) {
	console.log(`  ${c.green("✓")} core.hooksPath ${c.dim(`= ${RELATIVE_HOOKS_PATH}`)}`);
	console.log(
		`    ${c.yellow("repaired")} ${c.dim(`— was absolute (${before}), which made every worktree run the main checkout's hooks.`)}`,
	);
} else {
	console.log(`  ${c.green("✓")} core.hooksPath ${c.dim(`= ${RELATIVE_HOOKS_PATH}`)}`);
}

/* -- 2. Per-worktree overrides ---------------------------------------------- */

const worktreeConfigEnabled = git(["config", "--get", "extensions.worktreeConfig"], mainCheckout) === "true";

if (worktreeConfigEnabled) {
	const dirs = (git(["worktree", "list", "--porcelain"], mainCheckout) ?? "")
		.split("\n")
		.filter((line) => line.startsWith("worktree "))
		.map((line) => line.slice("worktree ".length));

	for (const dir of dirs) {
		const override = git(["config", "--worktree", "--get", "core.hooksPath"], dir);
		if (!override) continue;
		// Resolve as git would: relative to the top level of THIS working tree.
		const resolved = path.resolve(dir, override);
		if (resolved === path.join(dir, RELATIVE_HOOKS_PATH)) continue;
		git(["config", "--worktree", "--unset-all", "core.hooksPath"], dir);
		console.log(
			`    ${c.yellow("repaired")} ${c.dim(`— ${path.basename(dir)} pinned its own core.hooksPath to ${override}`)}`,
		);
	}
}

console.log(
	`\n  ${c.dim("git hooks active. pre-push runs a main-only branch guard, then pnpm verify")}`,
);
console.log(`  ${c.dim("(Biome, tsc, Vitest, build, DB migration check, lockfile, Semgrep).")}`);
console.log(`  ${c.dim("Disable:")} git config --unset core.hooksPath\n`);
