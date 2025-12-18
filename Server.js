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
// RATE LIMITING HELPER
// ============================================
// FIX #6: In-memory rate limiting (upgrade to Redis for production)
const rateLimitStore = new Map();
async function checkRateLimit(key, maxRequests, windowSeconds) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
 
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }
 
  const timestamps = rateLimitStore.get(key);
 
  // Remove expired timestamps
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
 
  if (validTimestamps.length >= maxRequests) {
    const oldestTimestamp = validTimestamps[0];
    const resetIn = Math.ceil((windowMs - (now - oldestTimestamp)) / 1000);
   
    return {
      allowed: false,
      current: validTimestamps.length,
      resetIn
    };
  }
 
  // Add current timestamp
  validTimestamps.push(now);
  rateLimitStore.set(key, validTimestamps);
 
  return {
    allowed: true,
    current: validTimestamps.length,
    resetIn: windowSeconds
  };
}
// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(ts => now - ts < 3600000); // 1 hour
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validTimestamps);
    }
  }
}, 600000); // 10 minutes
// ============================================
// SECURITY AUDIT LOGGING
// ============================================
// FIX #14: Logs security events to tier_audit_log table
async function logSecurityEvent({
  user_id,
  event_type,
  attempted_tier = null,
  actual_tier = null,
  endpoint,
  ip_address = null,
  user_agent = null,
  request_details = {}
}) {
  try {
    await supabase
      .from('tier_audit_log')
      .insert({
        user_id,
        event_type,
        attempted_tier,
        actual_tier,
        endpoint,
        ip_address,
        user_agent,
        request_details,
        created_at: new Date().toISOString()
      });
   
    logger.log(`🔒 Security event logged: ${event_type} for user ${user_id}`);
  } catch (error) {
    // Don't fail the request if logging fails
    logger.error('⚠️ Failed to log security event:', error);
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
// ✅ FIX: Validate all Stripe price IDs are configured at startup
if (stripe) {
  const requiredPriceIds = [
    { name: 'STRIPE_BASIC_PRICE_ID', value: process.env.STRIPE_BASIC_PRICE_ID },
    { name: 'STRIPE_PRO_PRICE_ID', value: process.env.STRIPE_PRO_PRICE_ID }
  ];
  const missingPriceIds = requiredPriceIds.filter(p => !p.value);
  if (missingPriceIds.length > 0) {
    logger.error('❌ CRITICAL: Missing required Stripe price IDs:',
      missingPriceIds.map(p => p.name).join(', ')
    );
    logger.error('⚠️ Payments will fail! Please configure these in Render.com environment variables.');
  } else {
    logger.log('✅ All required Stripe price IDs configured');
  }
  // Optional: warn about missing yearly price IDs
  if (!process.env.STRIPE_BASIC_YEARLY_PRICE_ID) {
    logger.warn('⚠️ STRIPE_BASIC_YEARLY_PRICE_ID not set - yearly Basic plan disabled');
  }
  if (!process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
    logger.warn('⚠️ STRIPE_PRO_YEARLY_PRICE_ID not set - yearly Pro plan disabled');
  }
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
        const sessionId = session.id;
      
        // ✅ FIX: Idempotency - check if this session was already processed
        const { data: existingSession, error: checkError } = await supabase
          .from('processed_webhooks')
          .select('session_id')
          .eq('session_id', sessionId)
          .single();
      
        if (existingSession) {
          logger.log(`⚠️ Webhook already processed for session ${sessionId} - ignoring duplicate`);
          return res.json({ received: true, duplicate: true });
        }
      
        // Continue with existing code...
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const priceId = session.line_items?.data[0]?.price?.id;
      
        // ✅ FIX: Validate customer ID exists
        if (!customerId) {
          logger.error('❌ No customer ID in session', {
            sessionId: session.id,
            userId,
            timestamp: new Date().toISOString()
          });
        
          return res.status(400).json({
            error: 'No customer ID',
            message: 'Stripe customer ID missing from session'
          });
        }
    
        if (!priceId) {
          logger.error('❌ No price ID found in session');
          return res.status(400).json({ error: 'No price ID in session' });
        }
    
        if (!userId) {
          logger.error('❌ No userId in session metadata');
          return res.status(400).json({ error: 'No userId in session' });
        }
    
        // Determine tier from price ID with strict validation
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
        // ✅ FIX: Strict validation - reject if price ID doesn't match any tier
        let tier = null;
        if (basicPriceIds.includes(priceId)) {
          tier = 'basic';
        } else if (proPriceIds.includes(priceId)) {
          tier = 'pro';
        } else if (businessPriceIds.includes(priceId)) {
          tier = 'business';
        }
        // ✅ FIX: If no tier matched, this is an invalid/unknown price ID
        if (!tier) {
          logger.error('❌ CRITICAL: Unknown price ID received in webhook', {
            priceId,
            userId,
            sessionId: session.id,
            timestamp: new Date().toISOString()
          });
        
          return res.status(400).json({
            error: 'Invalid price ID',
            message: 'Price ID does not match any configured tier'
          });
        }
        logger.log(`✅ Price ID ${priceId} mapped to tier: ${tier}`);
    
        // ✅ FIX: Use transaction-like approach with rollback capability
        let profileUpdated = false;
        let subscriptionUpdated = false;
        try {
          // Step 1: Update profile
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              user_tier: tier,
              stripe_customer_id: customerId,
              warning_email_sent_at: null
            })
            .eq('id', userId);
          if (profileError) {
            logger.error('❌ Profile update failed:', profileError);
            throw new Error(`Profile update failed: ${profileError.message}`);
          }
        
          profileUpdated = true;
          logger.log('✅ Profile updated successfully');
          // Step 2: Upsert subscription
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
            logger.error('❌ Subscription upsert failed:', subError);
            throw new Error(`Subscription upsert failed: ${subError.message}`);
          }
        
          subscriptionUpdated = true;
          logger.log('✅ Subscription created/updated successfully');
        } catch (error) {
          logger.error('❌ CRITICAL: Database operation failed in webhook', {
            error: error.message,
            profileUpdated,
            subscriptionUpdated,
            userId,
            tier,
            sessionId: session.id
          });
        
          // If profile updated but subscription failed, try to rollback
          if (profileUpdated && !subscriptionUpdated) {
            logger.log('⚠️ Attempting rollback of profile tier...');
            await supabase
              .from('profiles')
              .update({ user_tier: 'free' })
              .eq('id', userId)
              .then(() => logger.log('✅ Rollback successful'))
              .catch(err => logger.error('❌ Rollback failed:', err));
          }
        
          return res.status(500).json({
            error: 'Database operation failed',
            message: error.message
          });
        }
    
        logger.log(`✅ Payment successful - User ${userId} upgraded to ${tier}`);
        // ✅ FIX #11 & #12: Log successful upgrade
        await logSecurityEvent({
          user_id: userId,
          event_type: 'tier_upgraded',
          attempted_tier: tier,
          actual_tier: tier,
          endpoint: '/api/stripe-webhook',
          request_details: {
            priceId,
            customerId: session.customer,
            subscriptionId: session.subscription
          }
        });
        // ✅ FIX: Mark webhook as processed (idempotency)
        const { error: trackError } = await supabase
          .from('processed_webhooks')
          .insert({
            session_id: sessionId,
            event_type: 'checkout.session.completed',
            user_id: userId,
            processed_at: new Date().toISOString()
          });
        if (trackError) {
          logger.error('⚠️ Failed to track webhook idempotency:', trackError);
          // Don't fail the request - tier already updated successfully
        }
    
        // ✅ FIX: Send welcome email asynchronously (non-blocking)
        supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single()
          .then(({ data: userProfile }) => {
            if (userProfile?.email && isValidEmail(userProfile.email)) {
              sendWelcomeEmail(
                userProfile.email,
                userProfile.full_name || 'there',
                tier
              )
                .then(() => logger.log('📧 Welcome email sent successfully'))
                .catch(err => logger.error('⚠️ Email sending failed (non-critical):', err));
            }
          })
          .catch(err => logger.error('⚠️ Failed to fetch user profile for email:', err));
        break;
      }
  
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
    
        // Find user by stripe_customer_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_tier')
          .eq('stripe_customer_id', customerId)
          .single();
    
        if (profileError || !profile) {
          logger.error('❌ Failed to find user for cancelled subscription:', profileError);
          // ✅ FIX #12: Still update subscriptions even if no profile
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id);
          return res.status(200).json({ received: true });
        }
    
        const previousTier = profile.user_tier;
    
        await supabase
          .from('profiles')
          .update({
            user_tier: 'free',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);
    
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
    
        logger.log(`❌ Subscription canceled for customer ${customerId}`);
        logger.log(`✅ User ${profile.id} downgraded to free tier`);
    
        // ✅ FIX #12 & #14: Log downgrade
        await logSecurityEvent({
          user_id: profile.id,
          event_type: 'tier_downgraded',
          attempted_tier: 'free',
          actual_tier: previousTier,
          endpoint: '/api/stripe-webhook',
          request_details: {
            customerId,
            previousTier
          }
        });
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
  try {
    const {
      prompt,
      templateId,
      style
    } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a string'
      });
    }
    // ============================================
    // FIX #1: AUTHENTICATION CHECK
    // ============================================
    // 🔒 STEP 1: Authentication with JWT expiry check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
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
            success: false,
            error: 'Session expired',
            code: 'TOKEN_EXPIRED',
            message: 'Please log in again'
          });
        }
  
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token',
          message: 'Please log in again'
        });
      }
      if (!data.user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          message: 'Please log in again'
        });
      }
      user = data.user;
    } catch (err) {
      logger.error('Unexpected auth error:', err);
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable',
        message: 'Please try again later'
      });
    }
    // ============================================
    // FIX #1: FETCH ACTUAL TIER FROM DATABASE
    // ============================================
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
        // ✅ FIX #14: Log security event
        await logSecurityEvent({
          user_id: user.id,
          event_type: 'profile_fetch_failed',
          endpoint: '/api/generate',
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          request_details: { error: profileError?.message }
        });
        return res.status(404).json({
          success: false,
          error: 'User profile not found',
          message: 'Please contact support'
        });
      }
      profile = profileData;
    } catch (error) {
      logger.error('❌ Database operation failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Please try again in a moment'
      });
    }
    const userTier = profile.user_tier || 'free';
    logger.log(`✅ User tier verified: ${userTier}`);
    // ============================================
    // FIX #3: VALIDATE PROMPT LENGTH BY TIER
    // ============================================
    const TIER_LIMITS = {
      free: { 
        generations: 2,
        maxPromptLength: 500,  // ✅ FIX: Match tiers.ts
        premiumTemplates: false,
        maxWebsites: 1,
        rateLimitPerMinute: 2
      },
      basic: { 
        generations: 10,  // ✅ Changed from 5 to match tiers.ts
        maxPromptLength: 1000,  // ✅ Match tiers.ts
        premiumTemplates: false,
        maxWebsites: 3,
        rateLimitPerMinute: 5
      },
      pro: { 
        generations: 50,  // ✅ Match tiers.ts
        maxPromptLength: 2000,
        premiumTemplates: true,
        maxWebsites: 10,
        rateLimitPerMinute: 15
      },
      business: {
        generations: 40,
        maxPromptLength: 10000,
        premiumTemplates: true,
        maxWebsites: 20,
        rateLimitPerMinute: 30
      }
    };
    const tierLimit = TIER_LIMITS[userTier] || TIER_LIMITS.free;
    // Validate prompt length
    if (prompt.length > tierLimit.maxPromptLength) {
      logger.warn(`⚠️ User ${user.id} exceeded prompt limit: ${prompt.length}/${tierLimit.maxPromptLength}`);
     
      // ✅ FIX #14: Log attempt
      await logSecurityEvent({
        user_id: user.id,
        event_type: 'prompt_length_exceeded',
        attempted_tier: userTier,
        actual_tier: userTier,
        endpoint: '/api/generate',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_details: {
          promptLength: prompt.length,
          limit: tierLimit.maxPromptLength
        }
      });
     
      return res.status(400).json({
        success: false,
        error: 'Prompt exceeds tier limit',
        upgrade_required: true
      });
    }
    // ============================================
    // FIX #4: VALIDATE PREMIUM TEMPLATE ACCESS
    // ============================================
    // ✅ FIX: Use actual premium template IDs (must match templates.ts)
    const PREMIUM_TEMPLATES = [
      'luxury-hotel', 'tech-startup', 'crypto', 'ai-saas', 'fintech',
      'fashion-brand', 'architecture', 'gaming', 'podcast', 'space-tech',
      'wellness', 'vineyard', 'art-gallery', 'yacht', 'biotech',
      'film-production', 'eco-brand', 'metaverse', 'luxury-car', 'investment-fund',
      'space-tourism', 'quantum-computing', 'culinary-academy', 'smart-home', 'luxury-travel',
      'ai-avatar', 'mental-health', 'drone-services', 'vr-experience', 'robotics'
    ];
   
    if (templateId && PREMIUM_TEMPLATES.includes(templateId)) {
      if (!tierLimit.premiumTemplates) {
        logger.warn(`⚠️ User ${user.id} (${userTier}) attempted premium template: ${templateId}`);
       
        // ✅ FIX #14: Log bypass attempt
        await logSecurityEvent({
          user_id: user.id,
          event_type: 'premium_template_denied',
          attempted_tier: 'pro',
          actual_tier: userTier,
          endpoint: '/api/generate',
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          request_details: { templateId }
        });
       
        return res.status(403).json({
          success: false,
          error: 'Premium feature requires upgrade',
          upgrade_required: true
        });
      }
    }
    // ============================================
    // FIX #6: RATE LIMITING CHECK
    // ============================================
    const rateLimitKey = `generate_${user.id}`;
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      tierLimit.rateLimitPerMinute,
      60 // 1 minute window
    );
    if (!rateLimitResult.allowed) {
      logger.warn(`⚠️ Rate limit exceeded for user ${user.id}`);
     
      await logSecurityEvent({
        user_id: user.id,
        event_type: 'rate_limit_exceeded',
        actual_tier: userTier,
        endpoint: '/api/generate',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_details: {
          requests: rateLimitResult.current,
          limit: tierLimit.rateLimitPerMinute
        }
      });
     
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retry_after: rateLimitResult.resetIn
      });
    }
    // ============================================
    // FIX #2: ATOMIC GENERATION LIMIT CHECK
    // ============================================
    // 🔒 STEP 5: Atomic monthly reset check using RPC
    const currentMonth = new Date().toISOString().slice(0, 7);
    let generationsThisMonth;
    try {
      const { data: limitCheck, error: limitError } = await supabase
        .rpc('check_and_increment_generation', {
          p_user_id: user.id,
          p_month_year: currentMonth,
          p_user_tier: userTier
        });
      if (limitError) {
        logger.error('Reset RPC error:', limitError);
        return res.status(500).json({
          success: false,
          error: 'Failed to check generation limit'
        });
      }
      if (!limitCheck || limitCheck.length === 0) {
        throw new Error('No data returned from reset function');
      }
      const result = limitCheck[0];
      if (!result.allowed) {
        logger.warn(`⚠️ Generation limit reached for user ${user.id}: ${result.current_usage}/${result.tier_limit}`);
       
        // ✅ FIX #14: Log limit hit
        await logSecurityEvent({
          user_id: user.id,
          event_type: 'generation_limit_reached',
          actual_tier: userTier,
          endpoint: '/api/generate',
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          request_details: {
            current_usage: result.current_usage,
            tier_limit: result.tier_limit
          }
        });
       
        // ✅ FIX #13: Generic error message (don't leak exact limits)
        return res.status(429).json({
          success: false,
          error: 'Monthly generation limit reached',
          limit_reached: true,
          upgrade_required: userTier !== 'pro' && userTier !== 'business'
        });
      }
      logger.log(`✅ Generation allowed: ${result.current_usage}/${result.tier_limit}`);
      generationsThisMonth = result.current_usage - 1; // Previous for analytics if needed
    } catch (error) {
      logger.error('❌ Monthly reset failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Please try again'
      });
    }
    // 🔒 STEP 7: Sanitize prompt
    let optimizedPrompt;
    try {
      optimizedPrompt = sanitizePrompt(prompt);
      // Append template and style if provided
      if (templateId) {
        optimizedPrompt += `\n\nUse the ${templateId} template style.`;
      }
      if (style) {
        optimizedPrompt += `\n\nApply the following style: ${style}.`;
      }
    } catch (error) {
      if (error.message.includes('Content policy violation')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Your prompt violates our content policy. Please remove inappropriate keywords.'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Invalid prompt',
        message: error.message
      });
    }
    // ✅ STEP 8: Generate website with Claude API
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
    const newUsage = result.current_usage;
    // 📧 Send warning email if needed (only once per month)
    const usagePercent = (newUsage / tierLimit.generations) * 100;
    if (usagePercent >= 80 && newUsage < tierLimit.generations) {
      const shouldSendWarning = !profile.warning_email_sent_at ||
        new Date(profile.warning_email_sent_at).getMonth() !== new Date().getMonth();
    
      if (shouldSendWarning) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .single();
  
        if (userProfile?.email && isValidEmail(userProfile.email)) {
          await sendLimitWarningEmail(
            userProfile.email,
            userProfile.full_name || 'there',
            userTier,
            newUsage,
            tierLimit.generations
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
    return res.status(200).json({
      success: true,
      htmlCode,
      usage: {
        used: newUsage,
        limit: tierLimit.generations,
        remaining: result.remaining
      }
    });
  } catch (error) {
    logger.error('❌ Generation failed:', error);
    // ✅ FIX #14: Log error
    await logSecurityEvent({
      user_id: user?.id || req.body.user_id,
      event_type: 'generation_error',
      endpoint: '/api/generate',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_details: { error: error.message }
    });
    // ✅ Counter NOT incremented (no refund needed)
    return res.status(500).json({
      success: false,
      error: 'Generation failed',
      message: error.message || 'Unknown error during generation'
    });
  }
});
// ============================================
// FIX #5: SECURE /api/save-website ENDPOINT
// ============================================
app.post('/api/save-website', async (req, res) => {
  try {
    const { user_id: bodyUserId, website_data } = req.body;
    // Authentication check (similar to generate)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    const token = authHeader.replace('Bearer ', '');
    let user;
    try {
      const { data, error: authError } = await supabase.auth.getUser(token);
      if (authError || !data.user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication'
        });
      }
      user = data.user;
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable'
      });
    }
    // Validate body user_id matches authenticated
    if (bodyUserId && bodyUserId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    const userId = user.id;
    // ============================================
    // FIX #5: VALIDATE USER & CHECK WEBSITE LIMIT
    // ============================================
    logger.log(`🔍 Checking website save limit for user ${userId}`);
    // Call RPC function to check limit
    const { data: limitCheck, error: limitError } = await supabase
      .rpc('check_website_save_limit', {
        p_user_id: userId
      });
    if (limitError) {
      logger.error('❌ Failed to check website limit:', limitError);
      return res.status(500).json({
        success: false,
        error: 'Unable to verify website limit'
      });
    }
    if (!limitCheck || limitCheck.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Service temporarily unavailable'
      });
    }
    const result = limitCheck[0];
    if (!result.allowed) {
      logger.warn(`⚠️ Website limit reached for user ${userId}: ${result.current_count}/${result.tier_limit}`);
     
      // ✅ FIX #14: Log limit hit
      await logSecurityEvent({
        user_id: userId,
        event_type: 'website_limit_reached',
        actual_tier: result.user_tier,
        endpoint: '/api/save-website',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_details: {
          current_count: result.current_count,
          tier_limit: result.tier_limit
        }
      });
     
      return res.status(429).json({
        success: false,
        error: 'Website save limit reached',
        limit_reached: true,
        upgrade_required: result.user_tier !== 'pro' && result.user_tier !== 'business'
      });
    }
    logger.log(`✅ Website save allowed: ${result.current_count + 1}/${result.tier_limit}`);
    // Save website
    const { data, error } = await supabase
      .from('websites')
      .insert({
        user_id: userId,
        ...website_data,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) {
      logger.error('❌ Failed to save website:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save website'
      });
    }
    logger.log(`✅ Website saved successfully: ${data.id}`);
    return res.json({
      success: true,
      website: data
    });
  } catch (error) {
    logger.error('❌ Save website error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save website'
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
// ✅ NEW ENDPOINT: Verify Stripe checkout session
app.post('/api/verify-session', async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    // Validate inputs
    if (!sessionId || !userId) {
      return res.status(400).json({
        verified: false,
        message: 'Missing session ID or user ID'
      });
    }
    // Validate session ID format
    if (!sessionId.startsWith('cs_')) {
      return res.status(400).json({
        verified: false,
        message: 'Invalid session ID format'
      });
    }
    // Check if Stripe is initialized
    if (!stripe) {
      return res.status(500).json({
        verified: false,
        message: 'Payment system not configured'
      });
    }
    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // Verify session belongs to this user
    if (session.metadata?.userId !== userId) {
      logger.warn('⚠️ Session user mismatch', {
        sessionUserId: session.metadata?.userId,
        requestUserId: userId
      });
      return res.status(403).json({
        verified: false,
        message: 'Session does not belong to this user'
      });
    }
    // Verify payment status
    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        verified: false,
        message: 'Payment not completed',
        paymentStatus: session.payment_status
      });
    }
    // All checks passed
    logger.log('✅ Session verified successfully', {
      sessionId,
      userId,
      amount: session.amount_total,
      currency: session.currency
    });
    return res.json({
      verified: true,
      session: {
        id: session.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email
      }
    });
  } catch (error) {
    logger.error('❌ Session verification error:', error);
  
    if (error.code === 'resource_missing') {
      return res.status(404).json({
        verified: false,
        message: 'Session not found'
      });
    }
    return res.status(500).json({
      verified: false,
      message: 'Verification failed',
      error: error.message
    });
  }
});
// ============================================
// NEW ENDPOINT: SERVER-VERIFIED USAGE STATS
// ============================================
// FIX #9: Returns server-verified tier and usage data
// Prevents client-side tier manipulation
app.post('/api/usage-stats', async (req, res) => {
  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    const token = authHeader.replace('Bearer ', '');
    let user;
    try {
      const { data, error: authError } = await supabase.auth.getUser(token);
      if (authError || !data.user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication'
        });
      }
      user = data.user;
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable'
      });
    }
    const { user_id: bodyUserId } = req.body;
    if (bodyUserId && bodyUserId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    const userId = user.id;
    logger.log(`📊 Fetching usage stats for user ${userId}`);
    // Call RPC function for server-verified stats
    const { data: stats, error: statsError } = await supabase
      .rpc('get_user_usage_stats', {
        p_user_id: userId
      });
    if (statsError) {
      logger.error('❌ Failed to fetch usage stats:', statsError);
      return res.status(500).json({
        success: false,
        error: 'Unable to fetch usage statistics'
      });
    }
    if (!stats || stats.length === 0) {
      // Return default free tier stats if no data
      return res.json({
        success: true,
        tier: 'free',
        used: 0,
        limit: 2,
        remaining: 2,
        month: new Date().toISOString().slice(0, 7)
      });
    }
    const result = stats[0];
    logger.log(`✅ Usage stats: ${result.generations_used}/${result.tier_limit} (${result.user_tier})`);
    return res.json({
      success: true,
      tier: result.user_tier,
      used: result.generations_used,
      limit: result.tier_limit,
      remaining: result.remaining,
      month: result.month_year
    });
  } catch (error) {
    logger.error('❌ Usage stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics'
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
