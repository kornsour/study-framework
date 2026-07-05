import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// better-auth uses Node-only crypto (scrypt); pin this handler to the Node runtime.
export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
