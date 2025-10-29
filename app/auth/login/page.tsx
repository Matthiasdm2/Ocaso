// Server redirect: legacy /auth/login route -> nieuwe /login
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

export default function LegacyAuthLoginRedirect() {
  redirect("/login");
}

