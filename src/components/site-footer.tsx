import Link from "next/link";
import { legalConfig } from "@/content/legal/config";

const linkClass = "hover:text-zinc-900 hover:underline dark:hover:text-zinc-100";

export function SiteFooter() {
	return (
		<footer className="border-t border-zinc-200 px-6 py-6 pb-20 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
			<div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
				<span>
					© {new Date().getFullYear()} {legalConfig.companyName}
				</span>
				<Link href="/terms" className={linkClass}>
					Terms
				</Link>
				<Link href="/privacy" className={linkClass}>
					Privacy
				</Link>
				<Link href="/acceptable-use" className={linkClass}>
					Acceptable Use
				</Link>
				<Link href="/cookies" className={linkClass}>
					Cookies
				</Link>
				{/* Always shown (not env-gated): the study evaluator's AI assist is a
				    core, always-present feature of this app, not an optional add-on. */}
				<Link href="/ai-disclosure" className={linkClass}>
					AI Disclosure
				</Link>
			</div>
		</footer>
	);
}
