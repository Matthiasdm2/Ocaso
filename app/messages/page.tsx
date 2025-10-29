import { redirect } from 'next/navigation';

export const dynamic = "force-dynamic";

export default function LegacyMessagesRedirect() {
  redirect('/profile');
  return null;
}
