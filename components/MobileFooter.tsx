"use client";

import { Home, Store, User } from "lucide-react";
import Link from "next/link";

export default function MobileFooter() {
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
