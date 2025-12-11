import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export const config = {
  maxDuration: 30,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, userId, email } = req.body;

    // Validate inputs
    if (!priceId || !userId || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: priceId, userId, email' 
      });
    }

    // Validate Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ 
        error: 'Stripe configuration error' 
      });
    }

    console.log('🔄 Creating Stripe checkout session for:', email);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'https://sento.ai'}/#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://sento.ai'}/#/pricing`,
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    });

    console.log('✅ Checkout session created:', session.id);

    return res.status(200).json({ 
      sessionId: session.id 
    });

  } catch (error) {
    console.error('❌ Stripe checkout error:', error);
    
    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
