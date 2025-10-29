"use client";
export const dynamic = "force-dynamic";
export default function LegacyChatRedirect({ params }: { params: { id: string } }) {
  if (typeof window !== 'undefined') window.location.replace(`/profile?id=${params.id}`);
  return null;
}

