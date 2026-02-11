/**
 * Helper script to retrieve Stripe Price IDs for subscription plans
 *
 * This script lists all prices in your Stripe account and helps identify
 * which price IDs correspond to your subscription plans.
 *
 * Run with: npx tsx scripts/get-stripe-price-ids.ts
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

async function getPriceIds() {
  console.log('Fetching all prices from Stripe...\n');

  try {
    // List all prices
    const prices = await stripe.prices.list({
      limit: 100,
      active: true,
      expand: ['data.product'],
    });

    console.log(`Found ${prices.data.length} active prices:\n`);

    // Group by product
    const pricesByProduct: { [key: string]: any[] } = {};

    for (const price of prices.data) {
      const product = price.product as Stripe.Product;
      const productName = product.name;

      if (!pricesByProduct[productName]) {
        pricesByProduct[productName] = [];
      }

      pricesByProduct[productName].push(price);
    }

    // Display organized by product
    for (const [productName, productPrices] of Object.entries(pricesByProduct)) {
      console.log(`\n📦 ${productName}`);
      console.log('─'.repeat(60));

      for (const price of productPrices) {
        const interval = price.recurring?.interval || 'one-time';
        const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : '0.00';
        const currency = price.currency.toUpperCase();

        console.log(`  ${interval === 'month' ? '📅 Monthly' : '📆 Yearly'}:`);
        console.log(`     Price ID: ${price.id}`);
        console.log(`     Amount: $${amount} ${currency}`);
        console.log(`     Interval: ${interval}`);
        console.log('');
      }
    }

    console.log('\n\n');
    console.log('=' .repeat(60));
    console.log('COPY AND PASTE THE PRICE IDs BELOW:');
    console.log('=' .repeat(60));
    console.log('\nTo update your database, run this SQL:\n');

    // Generate SQL for common plan names
    const planMappings: { [key: string]: string } = {
      'Solo Agent Pro': 'solo-agent-pro',
      'Team Growth': 'team-growth',
      'Brokerage Growth': 'brokerage-growth',
      'Brokerage Scale': 'brokerage-scale',
    };

    for (const [productName, slug] of Object.entries(planMappings)) {
      const productPrices = pricesByProduct[productName];
      if (productPrices) {
        const monthlyPrice = productPrices.find(p => p.recurring?.interval === 'month');
        const yearlyPrice = productPrices.find(p => p.recurring?.interval === 'year');

        if (monthlyPrice || yearlyPrice) {
          console.log(`UPDATE subscription_plans SET`);
          if (monthlyPrice) {
            console.log(`  stripe_price_id = '${monthlyPrice.id}',`);
          }
          if (yearlyPrice) {
            console.log(`  stripe_yearly_price_id = '${yearlyPrice.id}'`);
          }
          console.log(`WHERE slug = '${slug}';\n`);
        }
      }
    }

  } catch (error: any) {
    console.error('Error fetching prices:', error.message);

    if (error.type === 'StripeAuthenticationError') {
      console.error('\n❌ Authentication failed. Please check your STRIPE_SECRET_KEY environment variable.');
      console.error('   Make sure it starts with "sk_" and is from your Stripe dashboard.\n');
    }
  }
}

getPriceIds();
