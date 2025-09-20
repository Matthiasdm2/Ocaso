// Server redirect: legacy /auth/login route -> nieuwe /login
import { redirect } from "next/navigation";

export default function LegacyAuthLoginRedirect() {
  redirect("/login");
}

