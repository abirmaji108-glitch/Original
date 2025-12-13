// server.js - Complete Express.js server with Smart Compression for Website Generation
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Validate API keys on startup
const apiKey = process.env.CLAUDE_API_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!apiKey) {
  console.error('❌ ERROR: CLAUDE_API_KEY is not set in environment variables!');
  process.exit(1);
}

// Initialize Supabase client (for backend operations)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Supabase URL or Service Role Key not configured!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('✅ Supabase client initialized (backend service role)');

// Initialize Stripe (optional, won't crash if not configured)
let stripe = null;
if (stripeKey) {
  stripe = new Stripe(stripeKey);
  console.log('✅ Stripe initialized');
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not configured - payment features disabled');
}

// ============================================
// CRITICAL: STRIPE WEBHOOK MUST COME BEFORE express.json()
// Because it needs the raw body for signature verification
// ============================================
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    if (!stripe || !webhookSecret) {
      console.error('Stripe or webhook secret not configured');
      return res.status(500).send('Server configuration error');
    }
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        // Get the actual price ID from the session
        const priceId = session.line_items?.data[0]?.price?.id;

        if (!priceId) {
          console.error('❌ No price ID found in session');
          return res.status(400).json({ error: 'No price ID in session' });
        }

        console.log(`💳 Processing payment - Price ID: ${priceId}`);

        // Determine the tier based on the price ID (supports both monthly and yearly)
        let tier = 'free';

        // Monthly plans
        if (priceId === process.env.STRIPE_BASIC_PRICE_ID) {
          tier = 'basic';
        } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
          tier = 'pro';
        } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
          tier = 'business';
        }
        // Yearly plans
        else if (priceId === process.env.STRIPE_BASIC_YEARLY_PRICE_ID) {
          tier = 'basic';
        } else if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
          tier = 'pro';
        } else if (priceId === process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID) {
          tier = 'business';
        }

        if (tier === 'free') {
          console.error(`⚠️ Unknown price ID: ${priceId} - defaulting to free tier`);
        }

        console.log(`✅ Determined tier: ${tier} for price ID: ${priceId}`);

        // Update user tier in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            user_tier: tier,
            stripe_customer_id: customerId,
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw profileError;
        }

        // Create or update subscription record
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: 'active',
            current_period_end: new Date(session.expires_at * 1000).toISOString(),
          });

        if (subError) {
          console.error('Error updating subscription:', subError);
          throw subError;
        }

        console.log(`✅ Payment successful for user ${userId} - upgraded to ${tier} tier`);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Downgrade user to free tier
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ user_tier: 'free' })
          .eq('stripe_customer_id', customerId);

        if (profileError) {
          console.error('Error downgrading user:', profileError);
          throw profileError;
        }

        // Update subscription status
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        if (subError) {
          console.error('Error updating subscription status:', subError);
        }

        console.log(`❌ Subscription canceled for customer ${customerId}`);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;

        // Update subscription record
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        }

        console.log(`🔄 Subscription updated: ${subscription.id}`);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Add CORS middleware - PUT THIS BEFORE ANY ROUTES
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware (AFTER webhook route!)
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Handle larger payloads for long prompts
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files if needed

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!apiKey,
    stripeConfigured: !!stripeKey,
    supabaseConfigured: !!supabaseUrl && !!supabaseServiceKey
  });
});

// Website generation endpoint with smart compression
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  // Validate API key
  if (!apiKey) {
    console.error('❌ API key not configured');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Claude API key is not configured'
    });
  }
  try {
    console.log(`📝 Received prompt (${prompt.length} chars)`);
    let optimizedPrompt = prompt;
    // SMART COMPRESSION: If prompt is long (>1000 chars), compress it first
    if (prompt.length > 1000) {
      console.log(`🔧 Compressing long prompt (${prompt.length} chars)...`);
      const compressionResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: 'You are a prompt optimization expert. Convert detailed website requests into concise, structured briefs while preserving ALL key requirements.',
          messages: [{
            role: 'user',
            content: `Convert this detailed website request into a concise structured brief (maximum 500 words). Keep ALL essential details but compress into efficient format:
${prompt}
Format your response as:
**Business Type:** [type]
**Style:** [design style/theme]
**Color Scheme:** [colors]
**Required Sections:** [list all sections]
**Key Features:** [interactive elements, special requests]
**Content Details:** [specific text, images, data to include]
**Target Audience:** [if mentioned]
Be comprehensive but concise. Don't lose any important details.`
          }]
        })
      });
      if (!compressionResponse.ok) {
        console.error('⚠️ Compression failed, using original prompt');
        optimizedPrompt = prompt; // Fallback to original
      } else {
        const compressionData = await compressionResponse.json();
        optimizedPrompt = compressionData.content[0].text;
        console.log(`✅ Compressed to ${optimizedPrompt.length} chars`);
      }
    }
    // MAIN GENERATION with optimized prompt
    console.log(`🚀 Generating website...`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: `You are an elite web developer who creates stunning, production-ready websites. You MUST return ONLY complete HTML code starting with <!DOCTYPE html>.
CRITICAL RULES:
- NEVER include markdown code blocks (\`\`\`html)
- NEVER add explanations or comments outside the HTML
- Return ONLY raw HTML that can be directly rendered
- Make every website visually stunning with modern design
- Use professional color schemes and typography
- Include smooth animations and hover effects
- Ensure full mobile responsiveness
- Use high-quality placeholder images from unsplash.com`,
        messages: [
          {
            role: 'user',
            content: `Create a complete, professional, fully-functional website based on this brief:
${optimizedPrompt}
REQUIREMENTS:
✅ Complete HTML with <!DOCTYPE html>
✅ All sections mentioned in the brief
✅ Modern CSS with gradients, animations, hover effects
✅ Fully responsive (mobile, tablet, desktop)
✅ Professional typography and spacing
✅ Placeholder images from unsplash.com where needed
✅ Smooth scrolling and micro-animations
✅ Production-ready quality
✅ NO markdown formatting - ONLY pure HTML
Return ONLY the HTML code, nothing else.`
          }
        ]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Claude API Error:', response.status, errorText);
      return res.status(response.status).json({
        error: `API Error: ${response.status}`,
        message: 'Failed to generate website',
        details: errorText
      });
    }
    const data = await response.json();
    let htmlCode = data.content[0].text;
    // Clean up any markdown artifacts
    htmlCode = htmlCode.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
    // Validate HTML
    if (!htmlCode.includes('<!DOCTYPE html>') && !htmlCode.includes('<!doctype html>')) {
      console.error('❌ Invalid HTML generated - missing DOCTYPE');
      return res.status(400).json({
        error: 'Invalid HTML generated',
        message: 'Generated content does not include proper HTML structure'
      });
    }
    console.log(`✅ Generated website successfully (${htmlCode.length} bytes)`);
    // Return response with htmlCode field (required by frontend)
    return res.status(200).json({ htmlCode });
  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// 💳 STRIPE CHECKOUT ENDPOINT
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId, email } = req.body;
    // Validate inputs
    if (!priceId || !userId || !email) {
      return res.status(400).json({
        error: 'Missing required fields: priceId, userId, email'
      });
    }
    // Check if Stripe is configured
    if (!stripe) {
      return res.status(500).json({
        error: 'Stripe is not configured on this server'
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
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/pricing`,
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
});

// Catch-all handler for frontend routes (if serving React app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔑 CLAUDE_API_KEY configured: ${apiKey ? '✅ Yes' : '❌ No'}`);
  console.log(`💳 STRIPE_SECRET_KEY configured: ${stripeKey ? '✅ Yes' : '❌ No'}`);
  console.log(`🗄️ Supabase (service role) configured: ✅ Yes`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Generate endpoint: http://localhost:${PORT}/api/generate`);
  console.log(`📍 Stripe checkout: http://localhost:${PORT}/api/create-checkout-session`);
  console.log(`📍 Stripe webhook: http://localhost:${PORT}/api/stripe-webhook`);
});

export default app;
