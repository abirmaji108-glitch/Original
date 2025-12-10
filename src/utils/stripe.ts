// utils/stripe.ts
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Simple test checkout
export async function testStripeCheckout() {
  try {
    const stripe = await stripePromise;
    
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    // Test with a hardcoded price ID (we'll create this in Stripe Dashboard)
    const { error } = await stripe.redirectToCheckout({
      lineItems: [{ price: 'price_test_123', quantity: 1 }],
      mode: 'payment',
      successUrl: `${window.location.origin}/success`,
      cancelUrl: `${window.location.origin}/pricing`,
    });

    if (error) {
      console.error('Stripe error:', error);
      alert('Stripe test failed: ' + error.message);
    }
  } catch (err) {
    console.error('Test checkout error:', err);
    alert('Connection error - check console');
  }
}

export default stripePromise;
