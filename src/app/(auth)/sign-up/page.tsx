import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage() {
	if (await getSession()) redirect("/dashboard");
	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
			<Suspense>
				<AuthForm mode="sign-up" />
			</Suspense>
		</div>
	);
}
