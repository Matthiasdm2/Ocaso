/**
 * Uniform price formatting utility
 * Formats prices consistently across the entire website
 * 
 * Usage:
 *   formatPrice(1234.56) => "€ 1.234,56"
 *   formatPrice(1234.56, { decimals: 0 }) => "€ 1.235"
 */

export interface FormatPriceOptions {
  /** Number of decimal places (default: 0 for whole euros) */
  decimals?: number;
  /** Show currency symbol (default: true) */
  showCurrency?: boolean;
  /** Locale to use (default: "nl-BE") */
  locale?: string;
  /** Currency code (default: "EUR") */
  currency?: string;
}

/**
 * Formats a price value consistently across the website
 * @param value - The price value (number or string)
 * @param options - Formatting options
 * @returns Formatted price string
 */
export function formatPrice(
  value: number | string | null | undefined,
  options: FormatPriceOptions = {}
): string {
  // Handle null/undefined
  if (value == null) {
    return options.showCurrency !== false ? "€ —" : "—";
  }

  const {
    decimals = 0,
    showCurrency = true,
    locale = "nl-BE",
    currency = "EUR",
  } = options;

  // Convert to number
  const numValue = typeof value === "string" ? Number(value) : value;

  // Handle invalid numbers
  if (Number.isNaN(numValue)) {
    return options.showCurrency !== false ? "€ —" : "—";
  }

  // Format with Intl.NumberFormat for consistent formatting
  const formatter = new Intl.NumberFormat(locale, {
    style: showCurrency ? "currency" : "decimal",
    currency: showCurrency ? currency : undefined,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(numValue);
}

/**
 * Formats a price without currency symbol (for cases where € is added separately)
 * @param value - The price value
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatPriceNumber(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  if (value == null) return "—";
  
  const numValue = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numValue)) return "—";

  return new Intl.NumberFormat("nl-BE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
}

