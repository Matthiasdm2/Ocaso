"use client";

import { Home, MessageCircle, Store, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MobileFooter() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages/unread');
        const data = await res.json();
        setUnreadCount(data.unread || 0);
      } catch (e) {
        console.error('Failed to fetch unread count', e);
      }
    };

    fetchUnread();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 block md:hidden">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Marktplaats */}
        <Link
          href="/marketplace"
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors min-w-0 flex-1"
        >
          <Home className="w-5 h-5 text-gray-600" />
          <span className="text-xs text-gray-600 font-medium">Marktplaats</span>
        </Link>

        {/* Ocaso Shops */}
        <Link
          href="/business"
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors min-w-0 flex-1"
        >
          <Store className="w-5 h-5 text-gray-600" />
          <span className="text-xs text-gray-600 font-medium">Shops</span>
        </Link>

        {/* Chats */}
        <Link
          href="/profile/chats"
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors min-w-0 flex-1 relative"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-600 font-medium">Chats</span>
        </Link>

        {/* Profiel */}
        <Link
          href="/profile"
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors min-w-0 flex-1"
        >
          <User className="w-5 h-5 text-gray-600" />
          <span className="text-xs text-gray-600 font-medium">Profiel</span>
        </Link>
      </div>
    </div>
  );
}
