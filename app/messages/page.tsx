import { redirect } from 'next/navigation';

export default function LegacyMessagesRedirect() {
  redirect('/profile/chats');
  return null;
}
