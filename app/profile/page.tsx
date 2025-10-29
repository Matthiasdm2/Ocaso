import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProfileIndexPage() {
  // Standaard doorsturen naar je eerste tab
  redirect("/profile/info");
}
