/**
 * Helper functies voor subscription format conversie
 * 
 * Formaten:
 * - business_plan: "basis_maandelijks", "pro_jaarlijks", etc.
 * - plan: "basic" | "pro"
 * - billing: "monthly" | "yearly"
 */

export type PlanType = "basic" | "pro";
export type BillingCycle = "monthly" | "yearly";

/**
 * Converteer business_plan string naar plan en billing cycle
 * 
 * @param businessPlan - Format: "basis_maandelijks", "pro_jaarlijks", etc.
 * @returns Object met plan en billing, of null als format ongeldig is
 */
export function parseBusinessPlan(businessPlan: string | null | undefined): {
  plan: PlanType;
  billing: BillingCycle;
} | null {
  if (!businessPlan || typeof businessPlan !== "string") {
    return null;
  }

  const normalized = businessPlan.toLowerCase().trim();
  
  // Bepaal plan type
  const isPro = normalized.includes("pro");
  const plan: PlanType = isPro ? "pro" : "basic";
  
  // Bepaal billing cycle
  const isYearly = normalized.includes("jaarlijks") || normalized.includes("yearly");
  const billing: BillingCycle = isYearly ? "yearly" : "monthly";
  
  return { plan, billing };
}

/**
 * Converteer plan en billing naar business_plan format
 * 
 * @param plan - "basic" | "pro"
 * @param billing - "monthly" | "yearly"
 * @returns Format: "basis_maandelijks", "pro_jaarlijks", etc.
 */
export function formatBusinessPlan(plan: PlanType, billing: BillingCycle): string {
  const planName = plan === "pro" ? "pro" : "basis";
  const billingName = billing === "yearly" ? "jaarlijks" : "maandelijks";
  return `${planName}_${billingName}`;
}

/**
 * Check of een business_plan string een actief abonnement representeert
 * 
 * @param businessPlan - Format: "basis_maandelijks", "pro_jaarlijks", etc.
 * @returns true als business_plan niet leeg is
 */
export function isSubscriptionActive(businessPlan: string | null | undefined): boolean {
  return !!(businessPlan && businessPlan.trim() !== "");
}

/**
 * Haal subscription data op uit business JSONB kolom (fallback naar business_plan)
 * 
 * @param business - Business JSONB object
 * @param businessPlan - business_plan string
 * @returns Subscription data of null
 */
export function getSubscriptionData(
  business: Record<string, unknown> | null | undefined,
  businessPlan: string | null | undefined
): {
  plan: PlanType;
  billing: BillingCycle;
  subscriptionActive: boolean;
  subscriptionUpdatedAt?: string;
} | null {
  // Probeer eerst business JSONB
  if (business?.plan && business?.billing_cycle) {
    // Als subscription_active expliciet is gezet, gebruik die waarde
    // Anders, als plan en billing_cycle bestaan, beschouw als actief
    const subscriptionActive = business.subscription_active !== undefined 
      ? !!business.subscription_active 
      : true; // Als plan en billing_cycle bestaan maar subscription_active niet, beschouw als actief
    
    return {
      plan: String(business.plan).toLowerCase() as PlanType,
      billing: String(business.billing_cycle).toLowerCase() as BillingCycle,
      subscriptionActive,
      subscriptionUpdatedAt: business.subscription_updated_at ? String(business.subscription_updated_at) : undefined,
    };
  }
  
  // Fallback naar business_plan parsing
  const parsed = parseBusinessPlan(businessPlan);
  if (parsed) {
    return {
      ...parsed,
      subscriptionActive: isSubscriptionActive(businessPlan),
    };
  }
  
  return null;
}

