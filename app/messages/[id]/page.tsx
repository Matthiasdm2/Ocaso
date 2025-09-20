"use client";
export default function LegacyChatRedirect({ params }: { params: { id: string } }) {
  if (typeof window !== 'undefined') window.location.replace(`/profile/chats/${params.id}`);
  return null;
}

