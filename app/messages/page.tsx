import { redirect } from 'next/navigation';

export default function LegacyMessagesRedirect() {
  redirect('/profile');
  return null;
}
