import Link from "next/link";
import { getSession } from "@/lib/auth/session";

export default async function Home() {
	const session = await getSession();

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
			<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">TypeScript Template</h1>
			<p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
				Next.js, Tailwind, Drizzle, better-auth (Google · Apple · email/password), and Stripe —
				ready to build on.
			</p>
			<div className="flex gap-3">
				{session ? (
					<Link
						href="/dashboard"
						className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
					>
						Go to dashboard
					</Link>
				) : (
					<>
						<Link
							href="/sign-up"
							className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
						>
							Get started
						</Link>
						<Link
							href="/sign-in"
							className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
						>
							Sign in
						</Link>
					</>
				)}
			</div>
		</div>
	);
}
