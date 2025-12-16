// server.js - Complete Express.js server with all bug fixes and logger integration
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import { sendWelcomeEmail, sendLimitWarningEmail } from './src/lib/email.js';
// ✅ FIXED: Import default export from logger
import logger from './utils/logger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(url, options, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
 
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - API took too long to respond');
    }
    throw error;
  }
}
/**
 * Retry helper with exponential backoff
 */
async function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      logger.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
     
      if (attempt === maxRetries) {
        throw error;
      }
     
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
/**
 * Sanitize prompt to prevent injection attacks
 */
function sanitizePrompt(prompt) {
  if (typeof prompt !== 'string') {
    throw new Error('Prompt must be a string');
  }
 
  let sanitized = prompt
    .replace(/IGNORE\s+(ALL\s+)?PREVIOUS\s+INSTRUCTIONS?/gi, '')
    .replace(/SYSTEM\s*:/gi, '')
    .replace(/ASSISTANT\s*:/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/```/g, '')
    .replace(/javascript:/gi, '')
    .replace(/<script>/gi, '')
    .replace(/<\/script>/gi, '')
    .trim();
 
  const blockedKeywords = [
    'phishing', 'malware', 'hack', 'exploit', 'illegal',
    'darknet', 'weapon', 'bomb', 'drug', 'gambling',
    'porn', 'adult', 'hate speech', 'racist', 'violence',
    // ✅ OPTIONAL ADDITIONS:
    'scam', 'fraud', 'ransomware', 'trojan', 'virus'
  ];
 
  const lowerPrompt = sanitized.toLowerCase();
  for (const keyword of blockedKeywords) {
    if (lowerPrompt.includes(keyword)) {
      throw new Error(`Content policy violation: "${keyword}" not allowed`);
    }
  }
 
  return sanitized;
}
/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
/**
 * Log analytics with retry logic
 */
async function logAnalytics(userId, generationsThisMonth, currentMonth, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase
        .from('usage_tracking')
        .upsert({
          id: userId,
          generations_this_month: generationsThisMonth + 1,
          last_generation_reset: currentMonth,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
     
      if (error) throw error;
     
      logger.log(`📊 Analytics logged for user ${userId}`);
      return true;
     
    } catch (error) {
      logger.log(`Analytics attempt ${attempt}/${retries} failed:`, error.message);
     
      if (attempt === retries) {
        logger.error('❌ CRITICAL: Analytics logging completely failed', {
          userId,
          generationsThisMonth,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return false;
      }
     
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
// ============================================
// INITIALIZATION & CONFIGURATION
// ============================================
// Validate API keys on startup
const apiKey = process.env.CLAUDE_API_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  logger.error('❌ ERROR: CLAUDE_API_KEY is not set in environment variables!');
  process.exit(1);
}
// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('❌ ERROR: Supabase URL or Service Role Key not configured!');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);
logger.log('✅ Supabase client initialized (backend service role)');
// Initialize Stripe
let stripe = null;
if (stripeKey) {
  stripe = new Stripe(stripeKey);
  logger.log('✅ Stripe initialized');
} else {
  logger.warn('⚠️ STRIPE_SECRET_KEY not configured - payment features disabled');
}
// ============================================
// RATE LIMITING
// ============================================
const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: {
    error: 'Too many generation requests',
    message: 'Please wait a moment before generating again'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req) => {
    // Skip rate limiting for authenticated Pro/Business users
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
      }
     
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
     
      if (!user) return false;
     
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_tier')
        .eq('id', user.id)
        .single();
     
      return ['pro', 'business'].includes(profile?.user_tier);
    } catch {
      return false;
    }
  }
});

// ✅ ADD RATE LIMITER FOR CHECKOUT
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 checkout attempts per 15 minutes
  message: {
    error: 'Too many checkout attempts',
    message: 'Please wait before trying again'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
// ============================================
// MIDDLEWARE
// ============================================
// CORS headers
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
// ============================================
// STRIPE WEBHOOK (must come before other middleware)
// ============================================
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
 
  let event;
 
  try {
    if (!stripe || !webhookSecret) {
      logger.error('Stripe or webhook secret not configured');
      return res.status(500).send('Server configuration error');
    }
   
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
 
  logger.log('✅ Verified webhook event:', event.type);
 
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const priceId = session.line_items?.data[0]?.price?.id;
       
        if (!priceId) {
          logger.error('❌ No price ID found in session');
          return res.status(400).json({ error: 'No price ID in session' });
        }
       
        if (!userId) {
          logger.error('❌ No userId in session metadata');
          return res.status(400).json({ error: 'No userId in session' });
        }
       
        // Determine tier from price ID
        let tier = 'free';
        const basicPriceIds = [
          process.env.STRIPE_BASIC_PRICE_ID,
          process.env.STRIPE_BASIC_YEARLY_PRICE_ID
        ].filter(Boolean);
       
        const proPriceIds = [
          process.env.STRIPE_PRO_PRICE_ID,
          process.env.STRIPE_PRO_YEARLY_PRICE_ID
        ].filter(Boolean);
       
        const businessPriceIds = [
          process.env.STRIPE_BUSINESS_PRICE_ID,
          process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID
        ].filter(Boolean);
       
        if (basicPriceIds.includes(priceId)) {
          tier = 'basic';
        } else if (proPriceIds.includes(priceId)) {
          tier = 'pro';
        } else if (businessPriceIds.includes(priceId)) {
          tier = 'business';
        }
       
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            user_tier: tier,
            stripe_customer_id: customerId,
            warning_email_sent_at: null // Reset warning flag
          })
          .eq('id', userId);
       
        if (profileError) {
          logger.error('Profile update error:', profileError);
          throw profileError;
        }
       
        // Upsert subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: 'active',
            current_period_end: new Date(session.expires_at * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'stripe_subscription_id'
          });
       
        if (subError) {
          logger.error('Subscription upsert error:', subError);
          throw subError;
        }
       
        logger.log(`✅ Payment successful - User ${userId} upgraded to ${tier}`);
       
        // Send welcome email
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();
       
        if (userProfile?.email && isValidEmail(userProfile.email)) {
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
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
       
        logger.log(`❌ Subscription canceled for customer ${customerId}`);
        break;
      }
     
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
       
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
       
        break;
      }
     
      default:
        logger.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
   
    res.json({ received: true });
   
  } catch (error) {
    logger.error('❌ Error processing webhook:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});
// ============================================
// HEALTH CHECK
// ============================================
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
// MAIN GENERATION ENDPOINT
// ============================================
app.post('/api/generate', generateLimiter, async (req, res) => {
  const { prompt } = req.body;
 
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      error: 'Prompt is required and must be a string'
    });
  }
 
  // 🔒 STEP 1: Authentication with JWT expiry check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'Authorization header required'
    });
  }
 
  const token = authHeader.replace('Bearer ', '');
  let user;
 
  try {
    const { data, error: authError } = await supabase.auth.getUser(token);
   
    if (authError) {
      logger.error('Auth error:', authError.message);
     
      if (authError.message.includes('expired') || authError.message.includes('invalid')) {
        return res.status(401).json({
          error: 'Session expired',
          code: 'TOKEN_EXPIRED',
          message: 'Please log in again'
        });
      }
     
      return res.status(401).json({
        error: 'Invalid authentication token',
        message: 'Please log in again'
      });
    }
   
    if (!data.user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Please log in again'
      });
    }
   
    user = data.user;
   
  } catch (err) {
    logger.error('Unexpected auth error:', err);
    return res.status(500).json({
      error: 'Authentication service unavailable',
      message: 'Please try again later'
    });
  }
 
  // 🔒 STEP 2: Fetch user profile with retry logic
  let profile;
  try {
    const { data: profileData, error: profileError } = await retryOperation(async () => {
      const result = await supabase
        .from('profiles')
        .select('user_tier, generations_this_month, last_generation_reset, warning_email_sent_at')
        .eq('id', user.id)
        .single();
     
      if (result.error) throw result.error;
      if (!result.data) throw new Error('Profile not found');
      return result;
    });
   
    if (profileError || !profileData) {
      logger.error('Profile fetch error:', profileError);
      return res.status(404).json({
        error: 'User profile not found',
        message: 'Please contact support'
      });
    }
   
    profile = profileData;
   
  } catch (error) {
    logger.error('❌ Database operation failed:', error);
    return res.status(500).json({
      error: 'Service temporarily unavailable',
      message: 'Please try again in a moment'
    });
  }
 
  // 🔒 STEP 3: Define tier limits
  const TIER_LIMITS = {
    free: 2,
    basic: 5,
    pro: 12,
    business: 40
  };
 
  const PROMPT_LENGTH_LIMITS = {
    free: 1000,
    basic: 2000,
    pro: 5000,
    business: 10000
  };
 
  const userTier = profile.user_tier || 'free';
  const limit = TIER_LIMITS[userTier];
  const promptLimit = PROMPT_LENGTH_LIMITS[userTier];
 
  // 🔒 STEP 4: Validate prompt length
  if (prompt.length > promptLimit) {
    return res.status(400).json({
      error: 'Prompt too long',
      message: `${userTier} tier allows maximum ${promptLimit} characters. Your prompt is ${prompt.length} characters.`,
      tier: userTier,
      limit: promptLimit,
      current: prompt.length
    });
  }
 
  // 🔒 STEP 5: Atomic monthly reset check using RPC
  const currentMonth = new Date().toISOString().slice(0, 7);
  let generationsThisMonth;
 
  try {
    const { data: resetResult, error: resetError } = await supabase
      .rpc('reset_monthly_generations_if_needed', {
        user_id: user.id,
        current_month: currentMonth
      });
   
    if (resetError) {
      logger.error('Reset RPC error:', resetError);
      return res.status(500).json({
        error: 'Failed to check generation limit'
      });
    }
   
    if (!resetResult || resetResult.length === 0) {
      throw new Error('No data returned from reset function');
    }
   
    generationsThisMonth = resetResult[0].generations_this_month;
   
  } catch (error) {
    logger.error('❌ Monthly reset failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Please try again'
    });
  }
 
  // 🔒 STEP 6: Check generation limit
  if (generationsThisMonth >= limit) {
    return res.status(403).json({
      error: 'Generation limit reached',
      message: `You've used ${generationsThisMonth}/${limit} generations this month. Upgrade to generate more!`,
      tier: userTier,
      limit,
      used: generationsThisMonth
    });
  }
 
  // 🔒 STEP 7: Sanitize prompt
  let optimizedPrompt;
  try {
    optimizedPrompt = sanitizePrompt(prompt);
  } catch (error) {
    if (error.message.includes('Content policy violation')) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Your prompt violates our content policy. Please remove inappropriate keywords.'
      });
    }
    return res.status(400).json({
      error: 'Invalid prompt',
      message: error.message
    });
  }
 
  // ✅ STEP 8: Generate website with Claude API
  try {
    logger.log(`📝 Generating for user ${user.id} (${userTier} tier) - Prompt: ${optimizedPrompt.length} chars`);
   
    // Smart compression for long prompts
    if (optimizedPrompt.length > 1000) {
      logger.log(`🔧 Compressing long prompt...`);
     
      const compressionResponse = await fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 600,
            system: 'You are a prompt optimization expert. Convert detailed website requests into concise, structured briefs while preserving ALL key requirements.',
            messages: [{
              role: 'user',
              content: `Convert this detailed website request into a concise structured brief (maximum 500 words). Keep ALL essential details but compress into efficient format:
${optimizedPrompt}
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
        },
        30000 // 30 second timeout
      );
     
      if (compressionResponse.ok) {
        const data = await compressionResponse.json();
        optimizedPrompt = data.content[0].text;
        logger.log(`✅ Compressed to ${optimizedPrompt.length} chars`);
      } else {
        logger.warn('⚠️ Compression failed, using original prompt');
      }
    }
   
    // Main generation with timeout
    const response = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4096,
          system: `You are an elite web developer who creates stunning, production-ready websites. You MUST return ONLY complete HTML code starting with <!DOCTYPE html>.
CRITICAL RULES:
- NEVER include markdown code blocks
- NEVER add explanations
- Return ONLY raw HTML
- Use modern design, animations, responsiveness, Unsplash placeholders
- Ensure all code is valid and follows web standards`,
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
      },
      90000 // 90 second timeout
    );
   
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Claude API Error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }
   
    const data = await response.json();
    let htmlCode = data.content[0].text;
   
    // Clean markdown artifacts
    htmlCode = htmlCode.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
   
    // Validate HTML
    if (!htmlCode.includes('<!DOCTYPE html>') && !htmlCode.includes('<!doctype html>')) {
      throw new Error('Generated HTML missing DOCTYPE');
    }
   
    // 🎨 ADD WATERMARK: Free tier only (with protection)
    if (userTier === 'free') {
      const watermark = `
        <div id="sento-watermark" style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 8px 16px; border-radius: 8px; font-family: Arial, sans-serif; font-size: 12px; z-index: 999999; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none; user-select: none;">
          <span style="font-size: 16px;">⚡</span>
          <span>Made with <strong>Sento AI</strong></span>
        </div>
        <style>
          #sento-watermark {
            animation: sento-pulse 2s infinite !important;
          }
          @keyframes sento-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          #sento-watermark[style*="display: none"],
          #sento-watermark[style*="display:none"],
          #sento-watermark[hidden] {
            display: flex !important;
            opacity: 1 !important;
          }
        </style>
        <script>
          (function() {
            const checkWatermark = () => {
              const wm = document.getElementById('sento-watermark');
              if (!wm || wm.style.display === 'none' || !document.body.contains(wm)) {
                const div = document.createElement('div');
                div.id = 'sento-watermark';
                div.innerHTML = '<span style="font-size:16px;">⚡</span><span>Made with <strong>Sento AI</strong></span>';
                div.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.8);color:white;padding:8px 16px;border-radius:8px;font-family:Arial,sans-serif;font-size:12px;z-index:999999;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:none;user-select:none;';
                document.body.appendChild(div);
              }
            };
            setInterval(checkWatermark, 2000);
            document.addEventListener('DOMContentLoaded', checkWatermark);
          })();
        </script>
      `;
      htmlCode = htmlCode.replace('</body>', `${watermark}</body>`);
    }
   
    // ✅ STEP 9: SUCCESS - Now increment counter
    const newUsage = generationsThisMonth + 1;
   
    const { error: incrementError } = await supabase
      .from('profiles')
      .update({
        generations_this_month: newUsage
      })
      .eq('id', user.id);
   
    if (incrementError) {
      logger.error('⚠️ Failed to increment counter (but generation succeeded):', incrementError);
      // Don't fail the request - user got their website
    }
   
    // 📧 Send warning email if needed (only once per month)
    const usagePercent = (newUsage / limit) * 100;
   
    if (usagePercent >= 80 && newUsage < limit) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name, warning_email_sent_at, last_generation_reset')
        .eq('id', user.id)
        .single();
     
      if (userProfile?.email && isValidEmail(userProfile.email)) {
        const shouldSendWarning = !userProfile.warning_email_sent_at ||
          new Date(userProfile.warning_email_sent_at).getMonth() !== new Date().getMonth();
       
        if (shouldSendWarning) {
          await sendLimitWarningEmail(
            userProfile.email,
            userProfile.full_name || 'there',
            userTier,
            newUsage,
            limit
          );
         
          // Mark warning as sent
          await supabase
            .from('profiles')
            .update({
              warning_email_sent_at: new Date().toISOString()
            })
            .eq('id', user.id);
           
          logger.log('📧 Limit warning email sent to:', userProfile.email);
        }
      }
    }
   
    // 📊 Log analytics (non-blocking)
    logAnalytics(user.id, generationsThisMonth, currentMonth)
      .catch(err => logger.error('Analytics logging error:', err));
   
    logger.log(`✅ Website generated successfully for user ${user.id}`);
    return res.status(200).json({ htmlCode });
   
  } catch (error) {
    logger.error('❌ Generation failed:', error);
   
    // ✅ Counter NOT incremented (no refund needed)
    return res.status(500).json({
      error: 'Generation failed',
      message: error.message || 'Unknown error during generation'
    });
  }
});
// ============================================
// STRIPE CHECKOUT ENDPOINT
// ============================================
app.post('/api/create-checkout-session', checkoutLimiter, async (req, res) => {
  try {
    const { priceId, userId, email } = req.body;
   
    if (!priceId || !userId || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Price ID, user ID, and email are required'
      });
    }
   
    if (!stripe) {
      return res.status(500).json({
        error: 'Stripe not configured',
        message: 'Payment system is currently unavailable'
      });
    }
   
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
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
      allow_promotion_codes: true,
    });
   
    res.json({
      sessionId: session.id,
      url: session.url
    });
   
  } catch (error) {
    logger.error('❌ Stripe checkout error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message
    });
  }
});
// ============================================
// SPA CATCH-ALL
// ============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  logger.log(`🚀 Server running on port ${PORT}`);
  logger.log(`🔑 Claude API: ${apiKey ? '✅ Configured' : '❌ Missing'}`);
  logger.log(`💳 Stripe: ${stripeKey ? '✅ Configured' : '⚠️ Disabled'}`);
  logger.log(`🗄️ Supabase: ✅ Configured`);
  logger.log(`⏱️ Rate limiting: ✅ Enabled`);
});
