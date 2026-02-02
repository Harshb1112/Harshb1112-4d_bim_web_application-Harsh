// Test currency conversion
const EXCHANGE_RATES = {
  USD: 1,
  INR: 83.12,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  SAR: 'ر.س',
};

function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;

  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;

  return convertedAmount;
}

function formatCurrency(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${Math.abs(amount).toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;
}

console.log('\n💱 Currency Conversion Test\n');
console.log('='.repeat(60));

// Test with Arrow project data (stored in USD)
const bacUSD = 242500;

console.log('\n📊 Original Amount (stored in database):');
console.log(`  BAC: $${bacUSD.toLocaleString()}`);

console.log('\n🔄 Converted to Different Currencies:\n');

const currencies = ['INR', 'EUR', 'GBP', 'AED', 'SAR'];

currencies.forEach(currency => {
  const converted = convertCurrency(bacUSD, 'USD', currency);
  const formatted = formatCurrency(converted, currency);
  const rate = EXCHANGE_RATES[currency];
  
  console.log(`  ${currency}:`);
  console.log(`    Exchange Rate: 1 USD = ${rate} ${currency}`);
  console.log(`    Converted Amount: ${formatted}`);
  console.log(`    Raw Value: ${converted.toFixed(2)}`);
  console.log('');
});

console.log('='.repeat(60));

// Example: If project is in India (INR) and user switches to USA (USD)
console.log('\n📝 Example Scenario:');
console.log('  Project Budget: ₹20,15,800 (stored as $242,500 USD)');
console.log('  User switches currency to INR:');
console.log(`  Display: ${formatCurrency(convertCurrency(242500, 'USD', 'INR'), 'INR')}`);
console.log('\n  User switches currency to EUR:');
console.log(`  Display: ${formatCurrency(convertCurrency(242500, 'USD', 'EUR'), 'EUR')}`);

console.log('\n✅ Test complete!\n');
