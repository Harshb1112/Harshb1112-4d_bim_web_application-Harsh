/**
 * Currency Converter with Real Exchange Rates
 * Converts amounts between different currencies using live or fixed exchange rates
 */

// Exchange rates relative to USD (1 USD = X currency)
// These are approximate rates - in production, fetch from API
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,        // Base currency
  INR: 83.12,    // 1 USD = 83.12 INR
  EUR: 0.92,     // 1 USD = 0.92 EUR
  GBP: 0.79,     // 1 USD = 0.79 GBP
  AUD: 1.52,     // 1 USD = 1.52 AUD
  CAD: 1.36,     // 1 USD = 1.36 CAD
  JPY: 149.50,   // 1 USD = 149.50 JPY
  CNY: 7.24,     // 1 USD = 7.24 CNY
  AED: 3.67,     // 1 USD = 3.67 AED
  SAR: 3.75,     // 1 USD = 3.75 SAR
  CHF: 0.88,     // 1 USD = 0.88 CHF
  SGD: 1.34,     // 1 USD = 1.34 SGD
  MXN: 17.08,    // 1 USD = 17.08 MXN
  BRL: 4.97,     // 1 USD = 4.97 BRL
  ZAR: 18.25,    // 1 USD = 18.25 ZAR
};

// Currency symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  CNY: '¥',
  AED: 'د.إ',
  SAR: 'ر.س',
  CHF: 'CHF',
  SGD: 'S$',
  MXN: 'MX$',
  BRL: 'R$',
  ZAR: 'R',
};

/**
 * Convert amount from one currency to another
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code (e.g., 'USD')
 * @param toCurrency - Target currency code (e.g., 'INR')
 * @returns Converted amount in target currency
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;

  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;

  return convertedAmount;
}

/**
 * Format amount with currency conversion and symbol
 * @param amount - Amount in source currency
 * @param sourceCurrency - Currency the amount is stored in
 * @param displayCurrency - Currency to display
 * @param options - Formatting options
 */
export function formatWithConversion(
  amount: number,
  sourceCurrency: string,
  displayCurrency: string,
  options?: {
    decimals?: number;
    showCode?: boolean;
  }
): string {
  // Convert amount
  const convertedAmount = convertCurrency(amount, sourceCurrency, displayCurrency);
  
  // Get symbol
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
  
  // Format number
  const decimals = options?.decimals ?? 0;
  const formatted = convertedAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  // Build result
  let result = `${symbol}${formatted}`;
  
  if (options?.showCode) {
    result += ` ${displayCurrency}`;
  }

  return result;
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;

  return toRate / fromRate;
}

/**
 * Format exchange rate for display
 */
export function formatExchangeRate(fromCurrency: string, toCurrency: string): string {
  const rate = getExchangeRate(fromCurrency, toCurrency);
  const fromSymbol = CURRENCY_SYMBOLS[fromCurrency] || fromCurrency;
  const toSymbol = CURRENCY_SYMBOLS[toCurrency] || toCurrency;
  
  return `1 ${fromSymbol} = ${rate.toFixed(2)} ${toSymbol}`;
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): Array<{ code: string; symbol: string; rate: number }> {
  return Object.keys(EXCHANGE_RATES).map(code => ({
    code,
    symbol: CURRENCY_SYMBOLS[code] || code,
    rate: EXCHANGE_RATES[code]
  }));
}
