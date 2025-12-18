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
// ADMIN RATE LIMITER
// ============================================
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute (generous for admin dashboard)
  message: {
    error: 'Too many admin requests',
    message: 'Please wait a moment'
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
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================
const adminEmails = (process.env.ADMIN_EMAILS || 'abirmaji108@gmail.com').split(',');

async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication'
      });
    }

    // Check if user email is in admin list
    if (!adminEmails.includes(data.user.email)) {
      logger.warn(`🚨 Non-admin user attempted admin access: ${data.user.email}`);

      await logSecurityEvent({
        user_id: data.user.id,
        event_type: 'admin_access_denied',
        endpoint: req.path,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied - Admin only'
      });
    }

    req.adminUser = data.user;
    next();
  } catch (err) {
    logger.error('❌ Admin auth error:', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
}

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
          logger.error('❌ Could not find user for canceled subscription', {
            customerId,
            error: profileError?.message
          });
          break;
        }

        // Downgrade user to free tier
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            user_tier: 'free',
            stripe_customer_id: null
          })
          .eq('id', profile.id);

        if (updateError) {
          logger.error('❌ Failed to downgrade user after subscription cancellation', {
            userId: profile.id,
            error: updateError.message
          });
          break;
        }

        logger.log(`✅ User ${profile.id} downgraded to free after subscription cancellation`);

        // Update subscription status
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);

        // Log security event
        await logSecurityEvent({
          user_id: profile.id,
          event_type: 'tier_downgraded',
          attempted_tier: 'free',
          actual_tier: 'free',
          endpoint: '/api/stripe-webhook',
          request_details: {
            subscriptionId: subscription.id,
            customerId
          }
        });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id);

          logger.log(`✅ Subscription ${subscription.id} updated to status: ${subscription.status}`);
        }
        break;
      }

      default:
        logger.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('❌ Webhook handler error:', error);
    res.status(500).send('Internal server error');
  }
});

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'image-generation-api',
    version: '1.0.0'
  });
});

// ============================================
// GENERATE ENDPOINT
// ============================================

app.post('/api/generate', generateLimiter, async (req, res) => {
  const startTime = Date.now();
  let userId = null;
  
  try {
    const { prompt, negativePrompt, aspectRatio = '1:1', model = 'flux', style = null } = req.body;
    const authHeader = req.headers.authorization;

    // ✅ FIX #3: Validate required fields
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt'
      });
    }

    // ✅ FIX #4: Validate aspect ratio
    const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2'];
    if (!validAspectRatios.includes(aspectRatio)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid aspect ratio',
        message: `Valid ratios: ${validAspectRatios.join(', ')}`
      });
    }

    // ✅ FIX #5: Validate model
    const validModels = ['flux', 'dall-e-3', 'stable-diffusion-3', 'midjourney'];
    if (!validModels.includes(model)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model',
        message: `Valid models: ${validModels.join(', ')}`
      });
    }

    // Sanitize prompt
    let sanitizedPrompt;
    try {
      sanitizedPrompt = sanitizePrompt(prompt);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid prompt content',
        message: error.message
      });
    }

    // ✅ FIX #7: Check for abusive content
    const abusiveKeywords = ['fuck', 'shit', 'asshole', 'bitch', 'cunt', 'nigger', 'nigga'];
    const lowerPrompt = sanitizedPrompt.toLowerCase();
    for (const keyword of abusiveKeywords) {
      if (lowerPrompt.includes(keyword)) {
        await logSecurityEvent({
          user_id: userId || 'anonymous',
          event_type: 'abusive_content_blocked',
          endpoint: '/api/generate',
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          request_details: { prompt: sanitizedPrompt.substring(0, 100) }
        });

        return res.status(400).json({
          success: false,
          error: 'Content policy violation',
          message: 'Prompt contains inappropriate language'
        });
      }
    }

    // Authentication and tier check
    let userTier = 'free';
    let generationsThisMonth = 0;
    let currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          userId = user.id;
          
          // Fetch user profile with tier and usage
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_tier, generations_this_month, last_generation_reset')
            .eq('id', userId)
            .single();

          if (!profileError && profile) {
            userTier = profile.user_tier || 'free';
            
            // Check if we need to reset monthly generations
            if (profile.last_generation_reset !== currentMonth) {
              // Reset generations for new month
              await supabase
                .from('profiles')
                .update({
                  generations_this_month: 0,
                  last_generation_reset: currentMonth
                })
                .eq('id', userId);
              
              generationsThisMonth = 0;
            } else {
              generationsThisMonth = profile.generations_this_month || 0;
            }

            // Check tier limits
            const tierLimits = {
              'free': 5,
              'basic': 100,
              'pro': 500,
              'business': 2000
            };

            const limit = tierLimits[userTier] || 5;
            
            if (generationsThisMonth >= limit) {
              // Check if warning email was already sent
              const { data: warningData } = await supabase
                .from('profiles')
                .select('warning_email_sent_at')
                .eq('id', userId)
                .single();

              const warningSent = warningData?.warning_email_sent_at;
              const warningSentDate = warningSent ? new Date(warningSent) : null;
              const now = new Date();
              
              // Send warning email only once per month
              if (!warningSent || (now - warningSentDate) > 30 * 24 * 60 * 60 * 1000) {
                const { data: userData } = await supabase
                  .from('profiles')
                  .select('email, full_name')
                  .eq('id', userId)
                  .single();

                if (userData?.email) {
                  sendLimitWarningEmail(
                    userData.email,
                    userData.full_name || 'there',
                    userTier,
                    generationsThisMonth,
                    limit
                  ).catch(err => logger.error('⚠️ Failed to send warning email:', err));

                  // Update warning email timestamp
                  await supabase
                    .from('profiles')
                    .update({ warning_email_sent_at: now.toISOString() })
                    .eq('id', userId);
                }
              }

              return res.status(429).json({
                success: false,
                error: 'Monthly limit exceeded',
                message: `You've used ${generationsThisMonth} of ${limit} generations this month`,
                upgradeUrl: '/pricing'
              });
            }
          }
        }
      } catch (authError) {
        logger.warn('Authentication error (non-critical):', authError.message);
        // Continue as free user if auth fails
      }
    }

    // ✅ FIX #8: Additional rate limiting per IP
    const ipLimitKey = `ip:${req.ip}`;
    const ipLimitResult = await checkRateLimit(ipLimitKey, 15, 60); // 15 requests per minute per IP

    if (!ipLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests from your IP. Try again in ${ipLimitResult.resetIn} seconds`
      });
    }

    // Map aspect ratio to dimensions
    const dimensionsMap = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '4:3': { width: 1600, height: 1200 },
      '3:4': { width: 1200, height: 1600 },
      '2:3': { width: 1200, height: 1800 },
      '3:2': { width: 1800, height: 1200 }
    };

    const dimensions = dimensionsMap[aspectRatio];

    // Prepare API request
    const apiUrl = 'https://api.anthropic.com/v1/messages';
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };

    const body = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Generate a detailed image description for: "${sanitizedPrompt}"${negativePrompt ? `, avoiding: ${negativePrompt}` : ''}. Aspect ratio: ${aspectRatio}. Style: ${style || 'photorealistic'}. Return ONLY the description, no explanations.`
      }]
    };

    // Call Claude API with retry
    let description;
    try {
      const response = await retryOperation(async () => {
        return await fetchWithTimeout(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        }, 30000);
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      description = data.content[0].text.trim();
    } catch (error) {
      logger.error('❌ Claude API error:', error);
      return res.status(502).json({
        success: false,
        error: 'Image description service unavailable',
        message: error.message
      });
    }

    // Generate image using Flux API
    const fluxApiUrl = 'https://api.flux.ai/v1/generate';
    const fluxHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FLUX_API_KEY}`
    };

    const fluxBody = {
      prompt: description,
      width: dimensions.width,
      height: dimensions.height,
      steps: 20,
      guidance_scale: 7.5
    };

    let imageUrl;
    try {
      const fluxResponse = await retryOperation(async () => {
        return await fetchWithTimeout(fluxApiUrl, {
          method: 'POST',
          headers: fluxHeaders,
          body: JSON.stringify(fluxBody)
        }, 60000);
      });

      if (!fluxResponse.ok) {
        throw new Error(`Flux API error: ${fluxResponse.status} ${fluxResponse.statusText}`);
      }

      const fluxData = await fluxResponse.json();
      imageUrl = fluxData.output[0];
    } catch (error) {
      logger.error('❌ Flux API error:', error);
      return res.status(502).json({
        success: false,
        error: 'Image generation service unavailable',
        message: error.message
      });
    }

    // Update user's generation count if authenticated
    if (userId) {
      try {
        await supabase
          .from('profiles')
          .update({
            generations_this_month: generationsThisMonth + 1,
            last_generation_reset: currentMonth
          })
          .eq('id', userId);

        // Log analytics
        await logAnalytics(userId, generationsThisMonth, currentMonth);
      } catch (dbError) {
        logger.error('⚠️ Failed to update user generation count:', dbError);
        // Don't fail the request - image was generated successfully
      }
    }

    const generationTime = Date.now() - startTime;
    logger.log(`✅ Image generated in ${generationTime}ms for user ${userId || 'anonymous'}`);

    // Return success response
    res.json({
      success: true,
      data: {
        imageUrl,
        description,
        prompt: sanitizedPrompt,
        aspectRatio,
        model,
        dimensions,
        generationTime: `${generationTime}ms`,
        remainingGenerations: userId ? (tierLimits[userTier] - (generationsThisMonth + 1)) : null,
        tier: userTier
      }
    });

  } catch (error) {
    logger.error('❌ Generation endpoint error:', error);
    
    // ✅ FIX #9: Don't expose internal errors
    const errorMessage = error.message || 'Internal server error';
    const isInternalError = errorMessage.includes('internal') || errorMessage.includes('database');
    
    res.status(500).json({
      success: false,
      error: isInternalError ? 'Internal server error' : errorMessage,
      message: 'Please try again later'
    });
  }
});

// ============================================
// USER PROFILE ENDPOINT
// ============================================

app.get('/api/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication'
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        subscription:subscriptions(*)
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('Profile fetch error:', profileError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch profile'
      });
    }

    // Calculate remaining generations
    const currentMonth = new Date().toISOString().slice(0, 7);
    const tierLimits = {
      'free': 5,
      'basic': 100,
      'pro': 500,
      'business': 2000
    };

    let generationsThisMonth = 0;
    if (profile.last_generation_reset === currentMonth) {
      generationsThisMonth = profile.generations_this_month || 0;
    }

    const limit = tierLimits[profile.user_tier] || 5;
    const remaining = Math.max(0, limit - generationsThisMonth);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        profile: {
          ...profile,
          generations_this_month: generationsThisMonth,
          remaining_generations: remaining,
          monthly_limit: limit,
          current_month: currentMonth
        }
      }
    });

  } catch (error) {
    logger.error('❌ Profile endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// CREATE CHECKOUT SESSION
// ============================================

app.post('/api/create-checkout-session', checkoutLimiter, async (req, res) => {
  try {
    const { tier, interval = 'monthly' } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!stripe) {
      return res.status(500).json({
        success: false,
        error: 'Payment system not configured'
      });
    }

    // Validate tier
    const validTiers = ['basic', 'pro', 'business'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier',
        message: `Valid tiers: ${validTiers.join(', ')}`
      });
    }

    // Validate interval
    if (!['monthly', 'yearly'].includes(interval)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid interval',
        message: 'Valid intervals: monthly, yearly'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication'
      });
    }

    // ✅ FIX #10: Get user's current tier
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('user_tier')
      .eq('id', user.id)
      .single();

    // ✅ FIX #11: Log upgrade attempt
    await logSecurityEvent({
      user_id: user.id,
      event_type: 'checkout_initiated',
      attempted_tier: tier,
      actual_tier: currentProfile?.user_tier || 'free',
      endpoint: '/api/create-checkout-session',
      request_details: { interval }
    });

    // Get price ID based on tier and interval
    let priceId;
    if (tier === 'basic') {
      priceId = interval === 'yearly' 
        ? process.env.STRIPE_BASIC_YEARLY_PRICE_ID 
        : process.env.STRIPE_BASIC_PRICE_ID;
    } else if (tier === 'pro') {
      priceId = interval === 'yearly' 
        ? process.env.STRIPE_PRO_YEARLY_PRICE_ID 
        : process.env.STRIPE_PRO_PRICE_ID;
    } else if (tier === 'business') {
      priceId = interval === 'yearly'
        ? process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID
        : process.env.STRIPE_BUSINESS_PRICE_ID;
    }

    if (!priceId) {
      logger.error(`❌ Missing price ID for ${tier} (${interval})`);
      return res.status(500).json({
        success: false,
        error: 'Payment configuration error'
      });
    }

    // Create or get Stripe customer
    let customerId;
    
    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
      
      // Verify customer still exists in Stripe
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        // Customer doesn't exist in Stripe, create new one
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id }
        });
        customerId = customer.id;
        
        // Update profile with new customer ID
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      }
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });
      customerId = customer.id;
      
      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
      metadata: {
        userId: user.id,
        tier,
        interval
      },
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
          interval
        }
      }
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    logger.error('❌ Checkout session error:', error);
    
    // ✅ FIX #13: Don't expose Stripe errors to client
    const errorMessage = error.type === 'StripeError' 
      ? 'Payment processing error'
      : 'Internal server error';
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Please try again'
    });
  }
});

// ============================================
// CANCEL SUBSCRIPTION
// ============================================

app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!stripe) {
      return res.status(500).json({
        success: false,
        error: 'Payment system not configured'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication'
      });
    }

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Cancel subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    // Log security event
    await logSecurityEvent({
      user_id: user.id,
      event_type: 'subscription_canceled',
      endpoint: '/api/cancel-subscription',
      request_details: {
        subscriptionId: subscription.stripe_subscription_id,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end
      }
    });

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      cancelAt: canceledSubscription.current_period_end
    });

  } catch (error) {
    logger.error('❌ Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// ============================================
// ADMIN DASHBOARD STATS
// ============================================

app.get('/api/admin/stats', adminLimiter, requireAdmin, async (req, res) => {
  try {
    logger.log(`📊 Admin stats requested by ${req.adminUser.email}`);

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, user_tier, created_at, stripe_customer_id');

    if (profilesError) throw profilesError;

    // Calculate user stats
    const stats = {
      total: profiles.length,
      free: profiles.filter(p => p.user_tier === 'free').length,
      basic: profiles.filter(p => p.user_tier === 'basic').length,
      pro: profiles.filter(p => p.user_tier === 'pro').length,
      business: profiles.filter(p => p.user_tier === 'business').length
    };

    // Calculate conversion rate
    const paidUsers = stats.basic + stats.pro + stats.business;
    const conversionRate = stats.total > 0 ? (paidUsers / stats.total) * 100 : 0;

    // Fetch active subscriptions from Stripe for accurate revenue
    let actualRevenue = 0;
    let subscriptionDetails = {
      basic_monthly: 0,
      basic_yearly: 0,
      pro_monthly: 0,
      pro_yearly: 0,
      business_monthly: 0,
      business_yearly: 0
    };

    if (stripe) {
      try {
        const { data: subscriptions, error: subError } = await supabase
          .from('subscriptions')
          .select('stripe_subscription_id, status')
          .eq('status', 'active');

        if (subError) {
          logger.warn('⚠️ Failed to fetch subscriptions:', subError);
        } else {
          for (const sub of subscriptions || []) {
            try {
              const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

              if (stripeSub.status === 'active' && stripeSub.items.data.length > 0) {
                const priceId = stripeSub.items.data[0].price.id;
                const amount = stripeSub.items.data[0].price.unit_amount / 100; // Convert cents to dollars

                // Map price ID to plan
                if (priceId === process.env.STRIPE_BASIC_PRICE_ID) {
                  subscriptionDetails.basic_monthly++;
                  actualRevenue += amount;
                } else if (priceId === process.env.STRIPE_BASIC_YEARLY_PRICE_ID) {
                  subscriptionDetails.basic_yearly++;
                  actualRevenue += amount / 12; // Convert to MRR
                } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
                  subscriptionDetails.pro_monthly++;
                  actualRevenue += amount;
                } else if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
                  subscriptionDetails.pro_yearly++;
                  actualRevenue += amount / 12; // Convert to MRR
                } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
                  subscriptionDetails.business_monthly++;
                  actualRevenue += amount;
                } else if (priceId === process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID) {
                  subscriptionDetails.business_yearly++;
                  actualRevenue += amount / 12; // Convert to MRR
                }
              }
            } catch (stripeErr) {
              logger.warn(`⚠️ Failed to fetch Stripe subscription ${sub.stripe_subscription_id}:`, stripeErr.message);
            }
          }
        }
      } catch (err) {
        logger.error('❌ Error fetching Stripe subscriptions:', err);
        // Fall back to estimated revenue if Stripe fails
        actualRevenue = (stats.basic * 9) + (stats.pro * 22) + (stats.business * 49);
      }
    } else {
      // Stripe not configured - use estimated revenue
      actualRevenue = (stats.basic * 9) + (stats.pro * 22) + (stats.business * 49);
    }

    // Get recent signups (last 10)
    const recentUsers = profiles
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(p => ({
        email: p.email,
        user_tier: p.user_tier,
        created_at: p.created_at
      }));

    return res.json({
      success: true,
      stats: {
        users: stats,
        conversionRate: Number(conversionRate.toFixed(1)),
        revenue: {
          mrr: Math.round(actualRevenue),
          arr: Math.round(actualRevenue * 12),
          breakdown: subscriptionDetails
        },
        recentUsers
      }
    });

  } catch (error) {
    logger.error('❌ Admin stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch admin stats'
    });
  }
});

// ============================================
// ADMIN USAGE ANALYTICS
// ============================================

app.get('/api/admin/analytics', adminLimiter, requireAdmin, async (req, res) => {
  try {
    logger.log(`📈 Admin analytics requested by ${req.adminUser.email}`);

    // Fetch usage tracking data
    const { data: usageData, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .order('created_at', { ascending: false });

    if (usageError) throw usageError;

    // Calculate today's generations
    const today = new Date().toISOString().split('T')[0];
    const todayData = usageData.filter(d =>
      d.created_at && d.created_at.startsWith(today)
    );
    const todayGenerations = todayData.reduce((sum, d) => sum + (d.generations_used || 0), 0);

    // Calculate this week's generations
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekData = usageData.filter(d =>
      d.created_at && new Date(d.created_at) >= weekAgo
    );
    const weekGenerations = weekData.reduce((sum, d) => sum + (d.generations_used || 0), 0);

    // Calculate this month's generations
    const monthGenerations = usageData.reduce((sum, d) => sum + (d.generations_used || 0), 0);

    // Generate 7-day history
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = usageData.filter(d =>
        d.created_at && d.created_at.startsWith(dateStr)
      );
      const dayTotal = dayData.reduce((sum, d) => sum + (d.generations_used || 0), 0);

      history.push({
        date: dateStr,
        generations: dayTotal
      });
    }

    // Calculate top users
    const userGenerations = new Map();
    usageData.forEach(d => {
      if (d.user_id) {
        const current = userGenerations.get(d.user_id) || 0;
        userGenerations.set(d.user_id, current + (d.generations_used || 0));
      }
    });

    // Fetch profiles for top users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, user_tier');

    const topUsers = Array.from(userGenerations.entries())
      .map(([userId, gens]) => {
        const profile = profiles?.find(p => p.id === userId);
        return {
          email: profile?.email || 'Unknown',
          user_tier: profile?.user_tier || 'free',
          total_generations: gens
        };
      })
      .sort((a, b) => b.total_generations - a.total_generations)
      .slice(0, 5);

    return res.json({
      success: true,
      analytics: {
        today: todayGenerations,
        week: weekGenerations,
        month: monthGenerations,
        history,
        topUsers
      }
    });

  } catch (error) {
    logger.error('❌ Admin analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

// ============================================
// SERVE STATIC FILES (React build)
// ============================================

app.use(express.static(path.join(__dirname, 'dist')));

// ============================================
// CATCH-ALL: SERVE REACT APP FOR ANY OTHER ROUTE
// ============================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  logger.log(`✅ Server running on port ${PORT}`);
  logger.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  if (stripe) {
    logger.log(`💳 Stripe payments enabled`);
  } else {
    logger.log('⚠️ Stripe payments disabled - missing API key');
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

export default app;
