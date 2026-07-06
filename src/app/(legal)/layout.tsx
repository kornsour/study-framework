import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
			<Link
				href="/"
				className="mb-8 text-sm text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
			>
				← Back home
			</Link>
			<article className="legal-prose">{children}</article>
		</div>
	);
}
