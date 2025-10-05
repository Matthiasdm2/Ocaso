"use client";
import { LogIn, LogOut, Menu, Plus, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";
import { useUnreadBids } from "@/lib/useUnreadBids";
import { useUnreadChats } from "@/lib/useUnreadChats";
import { useUnreadReviews } from "@/lib/useUnreadReviews";

import Logo from "./Logo";

export default function Header() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const { total: unreadBidsTotal } = useUnreadBids();
  const { total: unreadChatsTotal } = useUnreadChats();
  const { total: unreadReviewsTotal } = useUnreadReviews();
  const notifTotal = (unreadBidsTotal || 0) + (unreadChatsTotal || 0) + (unreadReviewsTotal || 0);

  // Auth status ophalen + luisteren naar wijzigingen
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setLoggedIn(!!user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  // Chats badge/polling is verwijderd op vraag: chats staat onder Mijn profiel

  async function handleLogout() {
    // 1) Direct UI terug naar uitgelogd
    setLoggedIn(false);

    // 2) Client-sessie wissen (triggert onAuthStateChange)
    try {
      await supabase.auth.signOut();
    } catch {
      // intentionally ignored
    }

    // 3) Server-cookie wissen via route
    try {
      await fetch("/logout", { method: "POST" });
    } catch {
      // Error intentionally ignored
    }

    // 4) Navigeren naar login + refresh
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
      {/* Topbar */}
      <div className="border-b border-gray-100">
        <div className="container h-10 flex items-center justify-between text-sm">
          <div className="hidden sm:flex items-center gap-4 text-gray-600">
            <Link href="/about" className="hover:text-gray-900">
              Over OCASO
            </Link>
            <Link href="/help" className="hover:text-gray-900">
              Help & FAQ
            </Link>
            <Link href="/safety" className="hover:text-gray-900">
              Veilig handelen
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {loggedIn ? (
              // Ingelogd → toon Uitloggen met dezelfde opmaak als "Inloggen"
              <button
                type="button"
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-1 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" /> Uitloggen
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:flex items-center gap-1 hover:text-gray-900"
                >
                  <LogIn className="h-4 w-4" /> Inloggen
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-primary/90 text-black px-3 py-1.5 shadow-smooth hover:bg-primary"
                >
                  <UserPlus className="h-4 w-4" /> Registreren
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main row */}
      <div className="container h-20 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <Logo className="text-xl" />
        </div>
        
        {/* Mobile CTA Button - Centered */}
        <Link
          href="/sell"
          className="md:hidden absolute left-1/2 transform -translate-x-1/2 inline-flex items-center justify-center rounded-lg bg-primary p-2 text-black shadow-smooth hover:opacity-90"
          title="Plaats zoekertje"
          aria-label="Plaats zoekertje"
        >
          <Plus className="h-5 w-5" />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/explore" className="hover:text-gray-900">Ontdekken</Link>
          <Link href="/marketplace" className="hover:text-gray-900">Marktplaats</Link>
          <Link href="/business" className="hover:text-gray-900">Ocaso Shops</Link>
          <Link href="/profile" className="hover:text-gray-900 flex items-center gap-1">
            <span>Mijn profiel</span>
            {notifTotal > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 text-white text-[10px] font-semibold h-4 min-w-[16px] px-1 leading-none shadow-sm">
                {notifTotal > 99 ? '99+' : notifTotal}
              </span>
            )}
          </Link>
          {/* Chats en Mijn zoekertjes verwijderd uit header; beschikbaar onder Mijn profiel */}
        </nav>
        
        {/* Desktop CTA */}
        <Link
          href="/sell"
          className="hidden md:inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-black shadow-smooth hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Plaats zoekertje
        </Link>
        
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          aria-label="Menu openen"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="container py-4 space-y-4">
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/explore" 
                className="px-3 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ontdekken
              </Link>
              <Link 
                href="/marketplace" 
                className="px-3 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Marktplaats
              </Link>
              <Link 
                href="/business" 
                className="px-3 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ocaso Shops
              </Link>
              <Link 
                href="/profile" 
                className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Mijn profiel</span>
                {notifTotal > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 text-white text-[10px] font-semibold h-4 min-w-[16px] px-1 leading-none shadow-sm">
                    {notifTotal > 99 ? '99+' : notifTotal}
                  </span>
                )}
              </Link>
            </nav>
            
            <div className="border-t border-gray-100 pt-4">
              <Link
                href="/sell"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-black shadow-smooth hover:opacity-90"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus className="h-4 w-4" /> Plaats zoekertje
              </Link>
            </div>
            
            {/* Auth buttons for mobile */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              {loggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" /> Uitloggen
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LogIn className="h-4 w-4" /> Inloggen
                  </Link>
                  <Link
                    href="/register"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 font-medium text-black shadow-smooth hover:bg-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserPlus className="h-4 w-4" /> Registreren
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
