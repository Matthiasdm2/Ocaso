// lib/profileTypes.ts

export type BusinessPlan = "basic" | "pro" | "premium";
export type BillingCycle = "monthly" | "yearly";

/** Backward compatibility helper: map 'free' -> 'basic' */
export function normalizeBusinessPlan(plan?: string | null): BusinessPlan {
  if (plan === "free") return "basic";
  return (
    ["basic", "pro", "premium"].includes(String(plan)) ? plan : "basic"
  ) as BusinessPlan;
}

export type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
  bio?: string | null;
  address: { street: string; city: string; zip: string; country: string };
  // Bankgegevens voor particuliere verkopers (voor QR-betalingen)
  bank?: { iban: string; bic: string };
  preferences: {
    language: string;
    newsletter: boolean;
    cookieConsent?: {
      functional: boolean;
      analytics: boolean;
      marketing: boolean;
      updatedAt?: string;
    };
  };
  notifications: {
    newMessages: boolean;
    bids: boolean;
    priceDrops: boolean;
    tips: boolean;
  };
  business: {
    isBusiness: boolean;

    // Kerngegevens
    companyName: string;
    vatNumber: string;
    registrationNr: string;
    website: string;
    invoiceEmail: string;
    bank: { iban: string; bic: string };
    invoiceAddress: {
      street: string;
      city: string;
      zip: string;
      country: string;
    };

    // Abonnement
    plan: BusinessPlan; // 'basic' | 'pro' | 'premium'
    billingCycle?: BillingCycle; // 'monthly' | 'yearly' (optioneel; sliderkeuze)
    subscriptionActive?: boolean;
    subscriptionUpdatedAt?: string;

    // Shop-profiel
    shopName: string;
    shopSlug: string;
    logoUrl?: string;
    bannerUrl?: string;
    description?: string;
    socials: { instagram?: string; facebook?: string; tiktok?: string };
    public: { showEmail: boolean; showPhone: boolean };
    // Verkoper verificatie status (true nadat Stripe onboarding succesvol afgerond)
    verified?: boolean;
    categories?: string[]; // max 8, optioneel
  };
};

export type MyListing = {
  id: string;
  title: string;
  price: number;
  thumb: string | null;
  created_at: string;

  // optionele/variabele bronvelden
  views?: number;
  view_count?: number;
  impressions?: number;
  favorites?: number;
  saves?: number;
  favorites_count?: number;
  likes?: number;
  bidsCount?: number;
  bids_count?: number;
  offers_count?: number;
  num_bids?: number;
  highestBid?: number;
  highest_bid?: number;
  max_bid?: number;
  top_offer?: number;
  offers?: Array<{
    id: string;
    amount: number;
    userId: string;
    created_at: string;
    // Add other relevant fields as needed
  }>;
  bids?: Array<{
    id: string;
    amount: number;
    userId: string;
    created_at: string;
    // Add other relevant fields as needed
  }>;
  sold?: boolean;
  is_sold?: boolean;
  status?: string;
  soldPrice?: number;
  sold_price?: number;
  sale_price?: number;

  // kanaal
  soldViaOcaso?: boolean;
  sold_via_ocaso?: boolean;
  sale_channel?: string;
  channel?: string;
  platform?: string;
};
