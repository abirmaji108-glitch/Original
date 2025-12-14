// server.js - Complete Express.js server with Smart Compression, Authentication & Tier-Based Generation Limits
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail, sendLimitWarningEmail } from './src/lib/email.js';
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
// Initialize Stripe (optional)
let stripe = null;
if (stripeKey) {
  stripe = new Stripe(stripeKey);
  console.log('✅ Stripe initialized');
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not configured - payment features disabled');
}
// ============================================
// STRIPE WEBHOOK (must come before express.json())
// ============================================
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    if (!stripe || !webhookSecret) {
      console.error('Stripe or webhook secret not configured');
      return res.status(500).send('Server configuration error');
    }
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const priceId = session.line_items?.data[0]?.price?.id;
        if (!priceId) {
          console.error('❌ No price ID found in session');
          return res.status(400).json({ error: 'No price ID in session' });
        }
        let tier = 'free';
        if ([
          process.env.STRIPE_BASIC_PRICE_ID,
          process.env.STRIPE_BASIC_YEARLY_PRICE_ID
        ].includes(priceId)) {
          tier = 'basic';
        } else if ([
          process.env.STRIPE_PRO_PRICE_ID,
          process.env.STRIPE_PRO_YEARLY_PRICE_ID
        ].includes(priceId)) {
          tier = 'pro';
        } else if ([
          process.env.STRIPE_BUSINESS_PRICE_ID,
          process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID
        ].includes(priceId)) {
          tier = 'business';
        }
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            user_tier: tier,
            stripe_customer_id: customerId,
          })
          .eq('id', userId);
        if (profileError) throw profileError;
        // Upsert subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: 'active',
            current_period_end: new Date(session.expires_at * 1000).toISOString(),
          });
        if (subError) throw subError;
        console.log(`✅ Payment successful - User ${userId} upgraded to ${tier}`);
        // Send welcome email
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();
        if (userProfile?.email) {
          await sendWelcomeEmail(
            userProfile.email,
            userProfile.full_name || 'there',
            tier
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        await supabase
          .from('profiles')
          .update({ user_tier: 'free' })
          .eq('stripe_customer_id', customerId);
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);
        console.log(`❌ Subscription canceled for customer ${customerId}`);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
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
// CORS headers (before routes)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!apiKey,
    stripeConfigured: !!stripeKey,
    supabaseConfigured: !!supabaseUrl && !!supabaseServiceKey
  });
});
// ============================================
// MAIN GENERATION ENDPOINT WITH TIER CHECKING & AUTH
// ============================================
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  // 🔒 STEP 0: Validate prompt length based on tier (BEFORE auth check)
  const PROMPT_LENGTH_LIMITS = {
    free: 1000,
    basic: 2000,
    pro: 5000,
    business: 10000
  };
  // 🔒 STEP 1: Authentication via Supabase JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
  // 🔒 STEP 2: Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_tier, generations_this_month, last_generation_reset')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
  // 🔒 STEP 3: Define tier limits
  const TIER_LIMITS = {
    free: 2,
    basic: 5,
    pro: 12,
    business: 40
  };
  const userTier = profile.user_tier || 'free';
  const limit = TIER_LIMITS[userTier];
  // 🔒 CHECK: Prompt length limit
  const promptLimit = PROMPT_LENGTH_LIMITS[userTier];
  if (prompt.length > promptLimit) {
    return res.status(400).json({
      error: 'Prompt too long',
      message: `${userTier} tier allows maximum ${promptLimit} characters. Your prompt is ${prompt.length} characters. ${userTier === 'free' ? 'Upgrade to Basic for 2000 characters!' : userTier === 'basic' ? 'Upgrade to Pro for 5000 characters!' : 'Upgrade to Business for 10000 characters!'}`,
      tier: userTier,
      limit: promptLimit,
      current: prompt.length
    });
  }
  // 🔒 STEP 4: Monthly reset logic
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  let generationsThisMonth = profile.generations_this_month || 0;
  if (profile.last_generation_reset !== currentMonth) {
    await supabase
      .from('profiles')
      .update({
        generations_this_month: 0,
        last_generation_reset: currentMonth
      })
      .eq('id', user.id);
    generationsThisMonth = 0;
  }
  // 🔒 STEP 5: Check limit
  if (generationsThisMonth >= limit) {
    return res.status(403).json({
      error: 'Generation limit reached',
      message: `You've used ${generationsThisMonth}/${limit} generations this month. Upgrade to generate more!`,
      tier: userTier,
      limit,
      used: generationsThisMonth
    });
  }
  // 🔒 STEP 6: Increment counter BEFORE generation
  const { error: incrementError } = await supabase
    .from('profiles')
    .update({
      generations_this_month: generationsThisMonth + 1
    })
    .eq('id', user.id);
  if (incrementError) {
    console.error('Failed to increment generation count:', incrementError);
    return res.status(500).json({ error: 'Failed to update usage count' });
  }
  // 📧 Send warning email at 80% usage
  const newUsage = generationsThisMonth + 1;
  const usagePercent = (newUsage / limit) * 100;
  if (usagePercent >= 80 && usagePercent < 100) {
    // Only send once when they first hit 80%
    const previousPercent = (generationsThisMonth / limit) * 100;
  
    if (previousPercent < 80) {
      const { data: userEmail } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();
      if (userEmail?.email) {
        await sendLimitWarningEmail(
          userEmail.email,
          userEmail.full_name || 'there',
          userTier,
          newUsage,
          limit
        );
        console.log('📧 Limit warning email sent to:', userEmail.email);
      }
    }
  }
  // 📊 STEP 7: Log analytics to usage_tracking table
  try {
    await supabase
      .from('usage_tracking')
      .upsert({
        id: user.id, // Using user ID as primary key
        generations_this_month: generationsThisMonth + 1,
        last_generation_reset: currentMonth,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    console.log('📊 Analytics logged for user', user.id);
  } catch (analyticsError) {
    // Don't fail the request if analytics logging fails
    console.error('Analytics logging failed:', analyticsError);
  }
  // ✅ NOW: Generate website with Claude (smart compression preserved)
  try {
    console.log(`📝 Generating for user ${user.id} (${userTier} tier) - Prompt: ${prompt.length} chars`);
    let optimizedPrompt = prompt;
    // Smart compression for long prompts
    if (prompt.length > 1000) {
      console.log(`🔧 Compressing long prompt...`);
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
      if (compressionResponse.ok) {
        const data = await compressionResponse.json();
        optimizedPrompt = data.content[0].text;
        console.log(`✅ Compressed to ${optimizedPrompt.length} chars`);
      } else {
        console.warn('⚠️ Compression failed, using original prompt');
      }
    }
    // Main generation
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
- NEVER include markdown code blocks
- NEVER add explanations
- Return ONLY raw HTML
- Use modern design, animations, responsiveness, Unsplash placeholders`,
        messages: [{
          role: 'user',
          content: `Create a complete, professional website based on this brief:
${optimizedPrompt}
REQUIREMENTS:
- Full HTML with <!DOCTYPE html>
- All required sections
- Modern CSS with animations and responsiveness
- Professional typography
- Placeholder images from unsplash.com
- Production-ready
Return ONLY the HTML code.`
        }]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API Error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }
    const data = await response.json();
    let htmlCode = data.content[0].text;
    // Clean markdown artifacts
    htmlCode = htmlCode.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
    // 🎨 ADD WATERMARK: Free tier only
    if (userTier === 'free') {
      // Inject watermark before closing </body> tag
      const watermark = `
        <div style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 8px 16px; border-radius: 8px; font-family: Arial, sans-serif; font-size: 12px; z-index: 9999; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          <span style="font-size: 16px;">⚡</span>
          <span>Made with <strong>Sento AI</strong></span>
        </div>
      `;
      htmlCode = htmlCode.replace('</body>', `${watermark}</body>`);
    }
    if (!htmlCode.includes('<!DOCTYPE html>') && !htmlCode.includes('<!doctype html>')) {
      throw new Error('Generated HTML missing DOCTYPE');
    }
    console.log(`✅ Website generated successfully for user ${user.id}`);
    return res.status(200).json({ htmlCode });
  } catch (error) {
    console.error('❌ Generation failed:', error);
    // Refund the generation count on failure
    await supabase
      .from('profiles')
      .update({
        generations_this_month: generationsThisMonth
      })
      .eq('id', user.id);
    return res.status(500).json({
      error: 'Generation failed',
      message: error.message || 'Unknown error during generation'
    });
  }
});
// Stripe Checkout Endpoint
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId, email } = req.body;
    if (!priceId || !userId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/pricing`,
      customer_email: email,
      client_reference_id: userId,
      metadata: { userId },
    });
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});
// SPA catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔑 Claude API: ${apiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`💳 Stripe: ${stripeKey ? '✅ Configured' : '⚠️ Disabled'}`);
  console.log(`🗄️ Supabase: ✅ Configured`);
});
