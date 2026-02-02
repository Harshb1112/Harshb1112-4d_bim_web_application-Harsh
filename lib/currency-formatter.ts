/**
 * Currency Formatter Utility
 * Formats currency values based on project currency settings
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  decimals: number;
}

// Currency configurations for different regions
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
    decimals: 0
  },
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    decimals: 0
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    locale: 'de-DE',
    decimals: 0
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    locale: 'en-GB',
    decimals: 0
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    locale: 'en-AU',
    decimals: 0
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    locale: 'en-CA',
    decimals: 0
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    locale: 'ja-JP',
    decimals: 0
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    locale: 'zh-CN',
    decimals: 0
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    locale: 'ar-AE',
    decimals: 0
  },
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    locale: 'ar-SA',
    decimals: 0
  }
};

/**
 * Format a number as currency based on currency code
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    decimals?: number;
  }
): string {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.USD;
  const decimals = options?.decimals ?? config.decimals;
  const showSymbol = options?.showSymbol ?? true;
  const showCode = options?.showCode ?? false;

  try {
    // Format the number with locale-specific formatting
    const formatted = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);

    // Build the final string
    let result = '';
    
    if (showSymbol) {
      result = `${config.symbol}${formatted}`;
    } else {
      result = formatted;
    }

    if (showCode) {
      result = `${result} ${config.code}`;
    }

    return result;
  } catch (error) {
    // Fallback to simple formatting
    return `${config.symbol}${amount.toFixed(decimals)}`;
  }
}

/**
 * Format currency for compact display (K, M, B)
 */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: string = 'USD'
): string {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.USD;
  
  const absAmount = Math.abs(amount);
  let formatted: string;
  
  if (absAmount >= 1_000_000_000) {
    formatted = (amount / 1_000_000_000).toFixed(1) + 'B';
  } else if (absAmount >= 1_000_000) {
    formatted = (amount / 1_000_000).toFixed(1) + 'M';
  } else if (absAmount >= 1_000) {
    formatted = (amount / 1_000).toFixed(1) + 'K';
  } else {
    formatted = amount.toFixed(0);
  }
  
  return `${config.symbol}${formatted}`;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.USD;
  return config.symbol;
}

/**
 * Parse a currency string to a number
 */
export function parseCurrency(value: string): number {
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}
