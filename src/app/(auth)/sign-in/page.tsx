import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
	if (await getSession()) redirect("/dashboard");
	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
			<Suspense>
				<AuthForm mode="sign-in" />
			</Suspense>
		</div>
	);
}
