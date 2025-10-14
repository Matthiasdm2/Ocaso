"use client";

import { CreditCard, LogIn, LogOut, Menu, Plus, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";
import { useUnreadBids } from "@/lib/useUnreadBids";
import { useUnreadChats } from "@/lib/useUnreadChats";
import { useUnreadReviews } from "@/lib/useUnreadReviews";

import HeaderAdminLink from "./HeaderAdminLink";
import Logo from "./Logo";

export default function Header() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const { profile } = useProfile();
  const { total: unreadBidsTotal } = useUnreadBids();
  const { total: unreadChatsTotal } = useUnreadChats();
  const { total: unreadReviewsTotal } = useUnreadReviews();
  const notifTotal = (unreadBidsTotal || 0) + (unreadChatsTotal || 0) + (unreadReviewsTotal || 0);

  // Prevent background scroll when the credits modal is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!creditsModalOpen) {
      // restore if previously locked
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      return;
    }
    // lock scroll and compensate for scrollbar to avoid layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [creditsModalOpen]);

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

  async function buyCredits(amount: number) {
    // Redirect to embedded checkout for credits
    const url = `/checkout/embedded?mode=credits&credits=${amount}`;
    window.location.href = url;
  }

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
              // Ingelogd → toon Credits en Uitloggen
              <>
                <button
                  type="button"
                  onClick={() => setCreditsModalOpen(true)}
                  className="hidden sm:flex items-center gap-1 hover:text-gray-900"
                >
                  <CreditCard className="h-4 w-4" /> {profile?.ocasoCredits || 0} Credits
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" /> Uitloggen
                </button>
              </>
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
          <HeaderAdminLink />
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
              <div className="px-3 py-2">
                <HeaderAdminLink />
              </div>
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
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCreditsModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <CreditCard className="h-4 w-4" /> {profile?.ocasoCredits || 0} Credits
                  </button>
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
                </>
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
      
      {/* Credits Modal */}
      {creditsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16">
          <div className="bg-white rounded-xl shadow-2xl p-3 aspect-square w-[90vw] max-w-[600px] md:w-[600px] overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-900">Ocaso Credits</h3>
              <button
                onClick={() => setCreditsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-3">
              <div className="text-center">
                <div className="text-4xl font-extrabold text-primary mb-1">
                  {profile?.ocasoCredits || 0}
                </div>
                <div className="text-gray-600 text-base font-medium">beschikbare credits</div>
              </div>
            </div>

            <div className="space-y-3 mb-3">
              <div className="text-center">
                <div className="text-gray-600 mb-6">
                  <div className="font-medium mb-2">Waarom credits kopen?</div>
                  <div className="text-sm">Genereer QR-codes voor betalingen zonder betaalterminal</div>
                </div>
              </div>
              
              {/* Savings Banner */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-2 text-green-700 font-semibold text-sm">
                  <span className="text-base">💰</span>
                  <span>Bespaar 20% met het grote pakket!</span>
                </div>
              </div>
              
              <div className="grid gap-4">
                {/* Small Package */}
                <div className="border-2 border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-2xl">4</div>
                        <div className="text-gray-600">Credits</div>
                      </div>
                      <div className="text-3xl font-bold text-primary">€1,00</div>
                      <div className="text-sm text-gray-500">€0,25 per credit</div>
                    </div>
                    <button 
                      onClick={() => buyCredits(4)}
                      className="bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-gray-300"
                    >
                      koop nu
                    </button>
                  </div>
                </div>

                {/* Large Package - Featured */}
                <div className="relative border-2 border-primary rounded-xl p-3 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-black px-4 py-1 rounded-full text-sm font-bold shadow-md">
                      🔥 MEEST GEKOZEN
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-2xl">25</div>
                        <div className="text-gray-600">Credits</div>
                        <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                          20% korting
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-primary">€5,00</div>
                      <div className="text-sm text-gray-500">€0,20 per credit</div>
                    </div>
                    <button 
                      onClick={() => buyCredits(25)}
                      className="bg-primary text-black px-8 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      koop nu
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 mt-0.5 text-base">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <div className="font-semibold mb-0.5">Hoe werken credits?</div>
                  <div>1 credit = 1 QR-code voor betalingen. Verkrijgbaar bij Ocaso Shops.</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCreditsModalOpen(false)}
              className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
