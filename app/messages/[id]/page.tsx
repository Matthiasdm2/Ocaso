"use client";
export default function LegacyChatRedirect({ params }: { params: { id: string } }) {
  if (typeof window !== 'undefined') window.location.replace(`/profile?id=${params.id}`);
  return null;
}

