#!/usr/bin/env node
// -*- coding: utf-8 -*-
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
// ADD THESE LINES:
// Emoji constants to prevent encoding issues
const E = {
  CHECK: '✅', CROSS: '❌', WARN: '⚠️', CHART: '📊', LOCK: '🔒',
  INBOX: '📥', SIREN: '🚨', REFRESH: '🔄', UP: '📈', LINK: '🔗',
  CARD: '💳', STOP: '🛑', EMAIL: '📧', INFO: 'ℹ️', BLUE: '🔵'
};
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
      logger.log(`${E.CHART} Analytics logged for user ${userId}`);
      return true;
    } catch (error) {
      logger.log(`Analytics attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt === retries) {
        logger.error(`${E.CROSS} CRITICAL: Analytics logging completely failed`, {
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
    logger.log(`${E.LOCK} Security event logged: ${event_type} for user ${user_id}`);
  } catch (error) {
    // Don't fail the request if logging fails
    logger.error(`${E.WARN} Failed to log security event:`, error);
  }
}
// ============================================
// INITIALIZATION & CONFIGURATION
// ============================================
// Validate API keys on startup
const apiKey = process.env.CLAUDE_API_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  logger.error(`${E.CROSS} ERROR: CLAUDE_API_KEY is not set in environment variables!`);
  process.exit(1);
}
// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  logger.error(`${E.CROSS} ERROR: Supabase URL or Service Role Key not configured!`);
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);
logger.log(`${E.CHECK} Supabase client initialized (backend service role)`);
// Initialize Stripe
let stripe = null;
if (stripeKey) {
  stripe = new Stripe(stripeKey);
  logger.log(`${E.CHECK} Stripe initialized`);
} else {
  logger.warn(`${E.WARN} STRIPE_SECRET_KEY not configured - payment features disabled`);
}
// ✅ FIX: Validate all Stripe price IDs are configured at startup
if (stripe) {
  const requiredPriceIds = [
    { name: 'STRIPE_BASIC_PRICE_ID', value: process.env.STRIPE_BASIC_PRICE_ID },
    { name: 'STRIPE_PRO_PRICE_ID', value: process.env.STRIPE_PRO_PRICE_ID }
  ];
  const missingPriceIds = requiredPriceIds.filter(p => !p.value);
  if (missingPriceIds.length > 0) {
    logger.error(`${E.CROSS} CRITICAL: Missing required Stripe price IDs:`,
      missingPriceIds.map(p => p.name).join(', ')
    );
    logger.error(`${E.WARN} Payments will fail! Please configure these in Render.com environment variables.`);
  } else {
    logger.log(`${E.CHECK} All required Stripe price IDs configured`);
  }
  // Optional: warn about missing yearly price IDs
  if (!process.env.STRIPE_BASIC_YEARLY_PRICE_ID) {
    logger.warn(`${E.WARN} STRIPE_BASIC_YEARLY_PRICE_ID not set - yearly Basic plan disabled`);
  }
  if (!process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
    logger.warn(`${E.WARN} STRIPE_PRO_YEARLY_PRICE_ID not set - yearly Pro plan disabled`);
  }
}
// ✅ FIX #20: Comprehensive environment variable validation
const requiredEnvVars = [
  { name: 'CLAUDE_API_KEY', critical: true },
  { name: 'VITE_SUPABASE_URL', critical: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', critical: true },
  { name: 'STRIPE_SECRET_KEY', critical: false },
  { name: 'STRIPE_WEBHOOK_SECRET', critical: false },
  { name: 'STRIPE_BASIC_PRICE_ID', critical: false },
  { name: 'STRIPE_PRO_PRICE_ID', critical: false },
  { name: 'FRONTEND_URL', critical: false }
];
const missingCritical = [];
const missingOptional = [];
for (const { name, critical } of requiredEnvVars) {
  if (!process.env[name]) {
    if (critical) {
      missingCritical.push(name);
    } else {
      missingOptional.push(name);
    }
  }
}
if (missingCritical.length > 0) {
  logger.error(`${E.CROSS} CRITICAL: Missing required environment variables:`);
  missingCritical.forEach(name => logger.error(` - ${name}`));
  logger.error('Server cannot start without these variables!');
  process.exit(1);
}
if (missingOptional.length > 0) {
  logger.warn(`${E.WARN} WARNING: Missing optional environment variables:`);
  missingOptional.forEach(name => logger.warn(` - ${name}`));
  logger.warn('Some features may not work correctly.');
}
logger.log(`${E.CHECK} All critical environment variables validated`);
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
// ✅ ADD: Download rate limiter (FIX #21)
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 downloads per minute
  message: {
    error: 'Too many download requests',
    message: 'Please wait before downloading again'
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
// ✅ FIX #26: REQUEST ID MIDDLEWARE
app.use((req, res, next) => {
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  logger.log(`${E.INBOX} [${req.id}] ${req.method} ${req.path}`);
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
      logger.warn(`${E.SIREN} Non-admin user attempted admin access: ${data.user.email}`);
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
    logger.error(`${E.CROSS} Admin auth error:`, err);
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
    logger.error(`${E.CROSS} Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  logger.log(`${E.CHECK} Verified webhook event:`, event.type);
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
          logger.error(`${E.CROSS} No customer ID in session`, {
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
          logger.error(`${E.CROSS} No price ID found in session`);
          return res.status(400).json({ error: 'No price ID in session' });
        }
        if (!userId) {
          logger.error(`${E.CROSS} No userId in session metadata`);
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
          logger.error(`${E.CROSS} CRITICAL: Unknown price ID received in webhook`, {
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
            logger.error(`${E.CROSS} Profile update failed:`, profileError);
            throw new Error(`Profile update failed: ${profileError.message}`);
          }
          profileUpdated = true;
          logger.log(`${E.CHECK} Profile updated successfully`);
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
            logger.error(`${E.CROSS} Subscription upsert failed:`, subError);
            throw new Error(`Subscription upsert failed: ${subError.message}`);
          }
          subscriptionUpdated = true;
          logger.log(`${E.CHECK} Subscription created/updated successfully`);
        } catch (error) {
          logger.error(`${E.CROSS} CRITICAL: Database operation failed in webhook`, {
            error: error.message,
            profileUpdated,
            subscriptionUpdated,
            userId,
            tier,
            sessionId: session.id
          });
          // If profile updated but subscription failed, try to rollback
          if (profileUpdated && !subscriptionUpdated) {
            logger.log(`${E.WARN} Attempting rollback of profile tier...`);
            await supabase
              .from('profiles')
              .update({ user_tier: 'free' })
              .eq('id', userId)
              .then(() => logger.log(`${E.CHECK} Rollback successful`))
              .catch(err => logger.error(`${E.CROSS} Rollback failed:`, err));
          }
          return res.status(500).json({
            error: 'Database operation failed',
            message: error.message
          });
        }
        logger.log(`${E.CHECK} Payment successful - User ${userId} upgraded to ${tier}`);
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
          logger.error(`${E.WARN} Failed to track webhook idempotency:`, trackError);
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
                .then(() => logger.log(`${E.EMAIL} Welcome email sent successfully`))
                .catch(err => logger.error(`${E.WARN} Email sending failed (non-critical):`, err));
            }
          })
          .catch(err => logger.error(`${E.WARN} Failed to fetch user profile for email:`, err));
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
          logger.error(`${E.CROSS} Could not find user for canceled subscription`, {
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
          logger.error(`${E.CROSS} Failed to downgrade user after subscription cancellation`, {
            userId: profile.id,
            error: updateError.message
          });
          break;
        }
        logger.log(`${E.CHECK} User ${profile.id} downgraded to free after subscription cancellation`);
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
          logger.log(`${E.CHECK} Subscription ${subscription.id} updated to status: ${subscription.status}`);
        }
        break;
      }
      default:
        logger.log(`${E.INFO} Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
  } catch (error) {
    logger.error(`${E.CROSS} Webhook handler error:`, error);
    res.status(500).send('Internal server error');
  }
});
// ============================================
// HEALTH CHECK ENDPOINT (FIX #27)
// ============================================
app.get('/api/health', async (req, res) => {
  const checks = {
    server: 'healthy',
    database: 'unknown',
    claude_api: 'unknown',
    stripe: stripe ? 'configured' : 'disabled'
  };
  // Check database connection
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    checks.database = error ? 'unhealthy' : 'healthy';
  } catch (err) {
    checks.database = 'unhealthy';
  }
  // Check Claude API (optional - can be slow)
  if (process.env.ENABLE_API_HEALTH_CHECK === 'true') {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      checks.claude_api = response.ok ? 'healthy' : 'unhealthy';
    } catch {
      checks.claude_api = 'unhealthy';
    }
  }
  const isHealthy = checks.server === 'healthy' && checks.database === 'healthy';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'sento-ai-api',
    version: '1.0.0',
    checks
  });
});
// ============================================
// EMERGENCY FAST /api/generate ENDPOINT
// Replace the entire old endpoint with this
// ============================================
app.post('/api/generate', generateLimiter, async (req, res) => {
  const startTime = Date.now();
  let userId = null;
  try {
    const { prompt } = req.body;
    const authHeader = req.headers.authorization;
    // Quick validation
    if (!prompt || prompt.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Prompt must be at least 50 characters'
      });
    }
    // Sanitize prompt quickly
    const sanitizedPrompt = prompt
      .replace(/IGNORE\s+.*/gi, '')
      .replace(/SYSTEM\s*:/gi, '')
      .trim()
      .slice(0, 5000); // Hard limit
    let userTier = 'free';
    let generationsThisMonth = 0;
    // Quick auth check
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
     
        if (!error && user) {
          userId = user.id;
       
          // Get profile with timeout
          const profilePromise = supabase
            .from('profiles')
            .select('user_tier, generations_this_month, last_generation_reset')
            .eq('id', userId)
            .maybeSingle();
          const { data: profile } = await Promise.race([
            profilePromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Profile timeout')), 3000)
            )
          ]).catch(() => ({ data: null }));
          if (profile) {
            userTier = profile.user_tier || 'free';
            const currentMonth = new Date().toISOString().slice(0, 7);
         
            if (profile.last_generation_reset === currentMonth) {
              generationsThisMonth = profile.generations_this_month || 0;
            }
           // ✅ TEMPORARY: Admin bypass for testing (REMOVE AFTER TESTING)
const TESTING_MODE = true; // ⚠️ SET TO FALSE AFTER TESTING
const ADMIN_EMAILS = ['abirmaji108@gmail.com']; // Your admin email
// Check if user is admin
const { data: { user: authUser } } = await supabase.auth.getUser(token);
const isAdmin = authUser && ADMIN_EMAILS.includes(authUser.email);
// Check limits (skip for admins in testing mode)
const tierLimits = {
  free: 2,
  basic: 10,
  pro: 50,
  business: 200
};
const limit = tierLimits[userTier] || 2;
if (!TESTING_MODE || !isAdmin) {
  // Normal limit enforcement for non-admins
  if (generationsThisMonth >= limit) {
    return res.status(429).json({
      success: false,
      error: 'Monthly limit reached',
      limit_reached: true,
      used: generationsThisMonth,
      limit
    });
  }
} else {
  // Admin bypass - log for audit
  console.log(`🔓 TESTING MODE: Admin ${authUser?.email} bypassed limit (${generationsThisMonth}/${limit})`);
}
          }
        }
      } catch (authError) {
        console.error('Auth error:', authError);
        // Continue as free user
      }
    }
    // FAST CLAUDE API CALL with aggressive timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90 seconds max
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    system: `You are an elite web designer creating production-ready websites. Generate ONLY complete HTML with embedded CSS and JavaScript.

🎯 CRITICAL SUCCESS CRITERIA:
1. EVERY image MUST use working Unsplash URLs with SPECIFIC search terms
2. EVERY section must have proper spacing and visual hierarchy
3. Modern, professional design with depth and polish
4. Mobile-responsive by default

📐 MANDATORY STRUCTURE:

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            line-height: 1.6;
            overflow-x: hidden;
        }
        
        /* HERO GRADIENTS - Use these for hero sections */
        .hero-gradient-blue {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
        }
        
        .hero-gradient-purple {
            background: linear-gradient(135deg, #581c87 0%, #a855f7 50%, #c084fc 100%);
        }
        
        .hero-gradient-sunset {
            background: linear-gradient(135deg, #ea580c 0%, #f59e0b 50%, #fbbf24 100%);
        }
        
        .hero-gradient-ocean {
            background: linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%);
        }
        
        /* GLASSMORPHISM EFFECTS */
        .glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
        }
        
        .glass-dark {
            background: rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
        }
        
        /* SMOOTH ANIMATIONS */
        .fade-in {
            animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .hover-lift {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .hover-lift:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }
        
        /* IMAGE OPTIMIZATION */
img {
    max-width: 100%;
    height: auto;
    display: block;
    border-radius: 12px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

img[src] {
    background: none;
}
        
        /* RESPONSIVE GRID */
        .grid-auto {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        
        /* BUTTONS */
        .btn {
            display: inline-block;
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(245, 158, 11, 0.4);
        }
        
        .btn-secondary {
            background: white;
            color: #1e40af;
            border: 2px solid #1e40af;
        }
        
        .btn-secondary:hover {
            background: #1e40af;
            color: white;
        }
    </style>
</head>
<body>
    <!-- CONTENT GOES HERE -->
</body>
</html>

🖼️ CRITICAL IMAGE SYSTEM - MANDATORY KEYWORD EXTRACTION:

⚠️ ABSOLUTE REQUIREMENT: You MUST read the user's prompt, identify the website topic, and extract specific keywords BEFORE writing any HTML code.

**STEP-BY-STEP MANDATORY PROCESS:**

STEP 1: READ the user's exact prompt word-by-word
STEP 2: IDENTIFY the main topic (wedding/restaurant/gym/fastfood/etc)
STEP 3: WRITE DOWN 3-5 specific keywords related to that topic
STEP 4: USE those exact keywords in EVERY image URL
STEP 5: NEVER use placeholder text like [KEYWORD] or [EXTRACT_KEYWORDS]

**CRITICAL RULE: THE KEYWORDS MUST BE ACTUAL WORDS, NOT PLACEHOLDERS!**

❌ WRONG (PLACEHOLDER - DO NOT DO THIS):
<img src="https://source.unsplash.com/1920x1080/?[EXTRACT_KEYWORDS_FROM_PROMPT]">

✅ CORRECT (ACTUAL KEYWORDS):
<img src="https://source.unsplash.com/1920x1080/?fastfood,burger,fries">

**MANDATORY EXAMPLES - STUDY THESE CAREFULLY:**

═══════════════════════════════════════════════════════════════

EXAMPLE 1 - WEDDING WEBSITE:
═══════════════════════════════════════════════════════════════
User prompt: "Create a wedding website for Emma and James"

STEP 1: Topic identified = WEDDING
STEP 2: Keywords extracted = wedding, couple, love, ceremony, bride, groom
STEP 3: Build URLs with THESE EXACT WORDS:

Hero section:
<img src="https://source.unsplash.com/1920x1080/?wedding,couple,love"
     onerror="this.onerror=null; this.src='https://picsum.photos/1920/1080?random=1';"
     alt="Wedding celebration"
     class="w-full h-full object-cover">

Gallery images:
<img src="https://source.unsplash.com/800x600/?wedding,ceremony"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=2';">
<img src="https://source.unsplash.com/800x600/?bride,groom"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=3';">
<img src="https://source.unsplash.com/800x600/?wedding,reception"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=4';">

═══════════════════════════════════════════════════════════════

EXAMPLE 2 - FAST FOOD RESTAURANT:
═══════════════════════════════════════════════════════════════
User prompt: "Create a fast food restaurant website selling burgers and fries"

STEP 1: Topic identified = FAST FOOD RESTAURANT
STEP 2: Keywords extracted = fastfood, burger, fries, restaurant, food
STEP 3: Build URLs with THESE EXACT WORDS:

Hero section:
<img src="https://source.unsplash.com/1920x1080/?fastfood,burger,fries"
     onerror="this.onerror=null; this.src='https://picsum.photos/1920/1080?random=1';"
     alt="Delicious fast food"
     class="w-full h-full object-cover">

Menu item cards:
<img src="https://source.unsplash.com/800x600/?burger,cheese"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=2';"
     alt="Cheeseburger"
     class="w-full h-64 object-cover">
<img src="https://source.unsplash.com/800x600/?fries,food"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=3';"
     alt="French fries"
     class="w-full h-64 object-cover">
<img src="https://source.unsplash.com/800x600/?pizza,fastfood"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=4';"
     alt="Pizza"
     class="w-full h-64 object-cover">

═══════════════════════════════════════════════════════════════

EXAMPLE 3 - GYM/FITNESS WEBSITE:
═══════════════════════════════════════════════════════════════
User prompt: "Modern gym website with workout classes"

STEP 1: Topic identified = GYM/FITNESS
STEP 2: Keywords extracted = gym, fitness, workout, exercise, training
STEP 3: Build URLs with THESE EXACT WORDS:

Hero section:
<img src="https://source.unsplash.com/1920x1080/?gym,fitness,workout"
     onerror="this.onerror=null; this.src='https://picsum.photos/1920/1080?random=1';"
     alt="Modern gym facility"
     class="w-full h-full object-cover">

Feature cards:
<img src="https://source.unsplash.com/800x600/?gym,equipment"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=2';">
<img src="https://source.unsplash.com/800x600/?fitness,training"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=3';">
<img src="https://source.unsplash.com/800x600/?workout,exercise"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=4';">

═══════════════════════════════════════════════════════════════

EXAMPLE 4 - ITALIAN RESTAURANT:
═══════════════════════════════════════════════════════════════
User prompt: "Italian restaurant website"

STEP 1: Topic identified = ITALIAN RESTAURANT
STEP 2: Keywords extracted = italian, restaurant, pasta, pizza, food
STEP 3: Build URLs with THESE EXACT WORDS:

Hero section:
<img src="https://source.unsplash.com/1920x1080/?italian,restaurant,food"
     onerror="this.onerror=null; this.src='https://picsum.photos/1920/1080?random=1';">

Menu items:
<img src="https://source.unsplash.com/800x600/?pasta,italian"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=2';">
<img src="https://source.unsplash.com/800x600/?pizza,italian"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=3';">
<img src="https://source.unsplash.com/800x600/?lasagna,food"
     onerror="this.onerror=null; this.src='https://picsum.photos/800/600?random=4';">

═══════════════════════════════════════════════════════════════

**KEYWORD REFERENCE TABLE - USE THESE FOR COMMON TOPICS:**

Fast Food:
- Primary: fastfood, burger, fries, food
- Menu items: burger, fries, pizza, sandwich, hotdog, chicken

Wedding/Event:
- Primary: wedding, couple, love, ceremony
- Variations: bride, groom, reception, celebration, romantic

Restaurant (General):
- Primary: restaurant, food, dining, cuisine
- Variations: chef, meal, dish, cooking, interior

Gym/Fitness:
- Primary: gym, fitness, workout, exercise
- Variations: training, equipment, athlete, health, sports

Portfolio/Creative:
- Primary: design, portfolio, creative, workspace
- Variations: art, professional, studio, project, work

E-commerce/Shop:
- Primary: ecommerce, shopping, products, store
- Variations: retail, fashion, online, shop, purchase

Technology/Startup:
- Primary: technology, software, innovation
- Variations: coding, digital, tech, computer, startup, development

Real Estate:
- Primary: realestate, property, house, home
- Variations: architecture, interior, modern, luxury

**IMAGE SIZE GUIDE:**
- Hero sections: 1920x1080
- Feature/Menu cards: 800x600
- Team photos: 400x400
- Product images: 600x600
- Gallery thumbs: 600x400
- Banners: 1600x400

**CRITICAL RULES - MEMORIZE THESE:**
1. ✅ USE REAL WORDS: fastfood, burger, pizza (CORRECT)
2. ❌ NEVER USE PLACEHOLDERS: [KEYWORD], [EXTRACT_KEYWORDS] (WRONG)
3. ✅ KEYWORDS MUST MATCH TOPIC: Fast food website → fastfood, burger, fries
4. ❌ DON'T USE GENERIC WORDS: nature, landscape, building (TOO VAGUE)
5. ✅ ALWAYS ADD FALLBACK: onerror="this.onerror=null; this.src='https://picsum.photos/...'"
6. ✅ USE DIFFERENT RANDOM NUMBERS: random=1, random=2, random=3, etc.

**FINAL CHECK BEFORE GENERATING HTML:**
□ Did I read the user's prompt?
□ Did I identify the website topic?
□ Did I extract 3-5 specific keywords?
□ Did I write those keywords down?
□ Am I using THOSE EXACT KEYWORDS in image URLs?
□ Are there ANY placeholders like [KEYWORD] in my HTML?

If you answered NO to any of these, STOP and fix it before generating HTML.
1. HERO SECTION (FIRST SECTION - ALWAYS):
<section class="hero-gradient-[color] min-h-screen flex items-center justify-center text-white">
    <div class="container mx-auto px-6 text-center fade-in">
        <h1 class="text-6xl font-bold mb-6">[Compelling Headline]</h1>
        <p class="text-2xl mb-8">[Engaging subheadline]</p>
        <div class="flex gap-4 justify-center">
            <a href="#" class="btn btn-primary">Primary CTA</a>
            <a href="#" class="btn btn-secondary">Secondary CTA</a>
        </div>
    </div>
</section>

2. CONTENT SECTIONS (ALTERNATE BACKGROUNDS):
<section class="py-24 bg-white">
    <div class="container mx-auto px-6">
        <h2 class="text-5xl font-bold text-center mb-16 text-gray-900">[Section Title]</h2>
        <div class="grid-auto">
            <!-- Cards with images -->
        </div>
    </div>
</section>

<section class="py-24 bg-gray-50">
    <!-- Next section -->
</section>

3. CARDS (WITH IMAGES):
<div class="bg-white rounded-2xl overflow-hidden shadow-xl hover-lift">
    <img src="https://picsum.photos/800/600?random=1" alt="Description" class="w-full h-64 object-cover">
    <div class="p-6">
        <h3 class="text-2xl font-bold mb-3">[Card Title]</h3>
        <p class="text-gray-600 mb-4">[Card description]</p>
        <a href="#" class="btn btn-primary">Learn More</a>
    </div>
</div>

🎯 QUALITY CHECKLIST:
✅ Hero section with gradient background
✅ Navigation bar (if multi-page feel needed)
✅ At least 4-6 content sections
✅ Every section has proper spacing (py-24)
✅ Images load from Picsum Photos - reliable and always works
✅ Hover effects on cards
✅ Mobile responsive (Tailwind handles this)
✅ Proper color contrast (dark text on light bg, light text on dark bg)
✅ Call-to-action buttons in hero
✅ Footer with contact info

Return ONLY the HTML code. No explanations. No markdown. Just <!DOCTYPE html>...
    messages: [{
      role: 'user',
      content: sanitizedPrompt
    }]
  }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      let generatedCode = data.content[0].text.trim()
        .replace(/```html\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      // ✅ CRITICAL: Force synchronous usage tracking with proper month reset
      if (userId) {
        try {
          const currentMonth = new Date().toISOString().slice(0, 7);
          
          // Check if we need to reset for new month
          const shouldReset = profile?.last_generation_reset !== currentMonth;
          const newCount = shouldReset ? 1 : (generationsThisMonth + 1);
          
          console.log(`📊 TRACKING: User ${userId} - Current: ${generationsThisMonth} → New: ${newCount} (Month: ${currentMonth}, Reset: ${shouldReset})`);
          
          // Use await to ensure update completes
          const { data: updateResult, error: updateError } = await supabase
            .from('profiles')
            .update({
              generations_this_month: newCount,
              last_generation_reset: currentMonth,
              last_generation_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select();
          
          if (updateError) {
            console.error('❌ CRITICAL: Usage update FAILED:', updateError);
          } else {
            console.log(`✅ Usage updated successfully: ${newCount}/${limit}`);
            console.log(`📈 Update confirmed:`, updateResult);
          }
        } catch (error) {
          console.error('❌ Exception during usage tracking:', error);
        }
      }
      const tierLimits = {
        free: 2,
        basic: 10,
        pro: 50,
        business: 200
      };
      const limit = tierLimits[userTier] || 2;
      console.log(`✅ Generated in ${Date.now() - startTime}ms for ${userId || 'anon'}`);
      return res.json({
        success: true,
        htmlCode: generatedCode,
        usage: {
          used: generationsThisMonth + 1,
          limit,
          remaining: limit - (generationsThisMonth + 1)
        },
        tier: userTier,
        generationTime: `${Date.now() - startTime}ms`
      });
    } catch (apiError) {
      clearTimeout(timeout);
      console.error('Claude API error:', apiError);
   
      return res.status(502).json({
        success: false,
        error: 'AI service temporarily unavailable',
        message: apiError.message.includes('aborted')
          ? 'Request took too long - try a shorter prompt'
          : 'Please try again in a moment'
      });
    }
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});
// ============================================
// USER PROFILE ENDPOINT - FIXED WITH PROPER ERROR HANDLING
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
      logger.error(`[${req.id}] Auth error in profile endpoint:`, authError);
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication'
      });
    }
    // Fetch profile with minimal fields first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_tier, generations_this_month, last_generation_reset, downloads_this_month, last_download_reset, stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      logger.error(`[${req.id}] Profile query error:`, profileError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: profileError.message
      });
    }
    // ✅ FIX: Handle case when profile doesn't exist
    if (!profile) {
      logger.warn(`[${req.id}] No profile found for user ${user.id}, creating default`);
      const currentMonth = new Date().toISOString().slice(0, 7);
      // Create default profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          user_tier: 'free',
          generations_this_month: 0,
          downloads_this_month: 0,
          last_generation_reset: currentMonth,
          last_download_reset: currentMonth
        })
        .select()
        .single();
      if (createError) {
        logger.error(`[${req.id}] Failed to create profile:`, createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create profile'
        });
      }
      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          },
          profile: {
            ...newProfile,
            generations_this_month: 0,
            remaining_generations: 2,
            monthly_limit: 2,
            downloads_this_month: 0,
            remaining_downloads: 0,
            download_limit: 0,
            current_month: currentMonth
          }
        }
      });
    }
    // Calculate remaining generations
    const currentMonth = new Date().toISOString().slice(0, 7);
    const tierLimits = {
      'free': 2,
      'basic': 10,
      'pro': 50,
      'business': 200
    };
    const downloadLimits = {
      'free': 0,
      'basic': 10,
      'pro': 50,
      'business': 200
    };
    const limit = tierLimits[profile.user_tier] || 2;
    const downloadLimit = downloadLimits[profile.user_tier] || 0;
    const generationsThisMonth = profile.last_generation_reset === currentMonth
      ? (profile.generations_this_month || 0)
      : 0;
    const downloadsThisMonth = profile.last_download_reset === currentMonth
      ? (profile.downloads_this_month || 0)
      : 0;
    logger.log(`${E.CHECK} [${req.id}] Profile fetched successfully for ${user.id}`);
    return res.json({
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
          remaining_generations: Math.max(0, limit - generationsThisMonth),
          monthly_limit: limit,
          downloads_this_month: downloadsThisMonth,
          remaining_downloads: Math.max(0, downloadLimit - downloadsThisMonth),
          download_limit: downloadLimit,
          current_month: currentMonth
        }
      }
    });
  } catch (error) {
    logger.error(`${E.CROSS} [${req.id}] Profile endpoint error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});
// ============================================
// ✅ FIX #16: DOWNLOAD TRACKING ENDPOINT
// ============================================
app.post('/api/track-download', downloadLimiter, async (req, res) => {
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
    // Get user's current tier and download count
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_tier, downloads_this_month, last_download_reset')
      .eq('id', user.id)
      .single();
    if (profileError) {
      logger.error(`[${req.id}] Profile fetch error:`, profileError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch profile'
      });
    }
    const userTier = profile.user_tier || 'free';
    const currentMonth = new Date().toISOString().slice(0, 7);
    // Reset download count if new month
    let downloadsThisMonth = 0;
    if (profile.last_download_reset === currentMonth) {
      downloadsThisMonth = profile.downloads_this_month || 0;
    } else {
      // Reset for new month
      await supabase
        .from('profiles')
        .update({
          downloads_this_month: 0,
          last_download_reset: currentMonth
        })
        .eq('id', user.id);
    }
    // Check download limits
    const downloadLimits = {
      'free': 0, // Free users cannot download
      'basic': 10,
      'pro': 50,
      'business': 200
    };
    const limit = downloadLimits[userTier] || 0;
    if (userTier === 'free') {
      await logSecurityEvent({
        user_id: user.id,
        event_type: 'download_denied_free',
        actual_tier: userTier,
        endpoint: '/api/track-download',
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      return res.status(403).json({
        success: false,
        error: 'Download feature requires upgrade',
        upgrade_required: true,
        message: 'Upgrade to Basic, Pro, or Business to download websites'
      });
    }
    if (downloadsThisMonth >= limit) {
      await logSecurityEvent({
        user_id: user.id,
        event_type: 'download_limit_reached',
        actual_tier: userTier,
        endpoint: '/api/track-download',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_details: {
          downloads_used: downloadsThisMonth,
          downloads_limit: limit
        }
      });
      return res.status(429).json({
        success: false,
        error: 'Monthly download limit reached',
        limit_reached: true,
        message: `You've used ${downloadsThisMonth} of ${limit} downloads this month`,
        upgradeUrl: '/pricing'
      });
    }
    // Increment download count
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        downloads_this_month: downloadsThisMonth + 1,
        last_download_reset: currentMonth
      })
      .eq('id', user.id);
    if (updateError) {
      logger.error(`[${req.id}] Failed to update download count:`, updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to track download'
      });
    }
    // Track download in separate table
    await supabase
      .from('download_tracking')
      .insert({
        user_id: user.id,
        downloaded_at: new Date().toISOString(),
        user_tier: userTier
      });
    logger.log(`${E.CHECK} [${req.id}] Download tracked for user ${user.id} (${downloadsThisMonth + 1}/${limit})`);
    // ✅ FIX #22: Log security event
    await logSecurityEvent({
      user_id: user.id,
      event_type: 'website_downloaded',
      actual_tier: userTier,
      endpoint: '/api/track-download',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_details: {
        downloads_used: downloadsThisMonth + 1,
        downloads_limit: limit
      }
    });
    // ✅ FIX #23: Send warning email when approaching limit
    const remainingDownloads = limit - (downloadsThisMonth + 1);
    if (remainingDownloads === 2 || remainingDownloads === 5) {
      // Send warning email asynchronously
      supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single()
        .then(({ data: userProfile }) => {
          if (userProfile?.email && isValidEmail(userProfile.email)) {
            sendLimitWarningEmail(
              userProfile.email,
              userProfile.full_name || 'there',
              userTier,
              downloadsThisMonth + 1,
              limit,
              'downloads' // Specify this is for downloads
            )
              .then(() => logger.log(`${E.EMAIL} [${req.id}] Download limit warning email sent`))
              .catch(err => logger.error(`${E.WARN} Failed to send warning email:`, err));
          }
        })
        .catch(err => logger.error(`${E.WARN} Failed to fetch user for email:`, err));
    }
    res.json({
      success: true,
      message: 'Download tracked successfully',
      remaining: remainingDownloads,
      limit,
      used: downloadsThisMonth + 1
    });
  } catch (error) {
    logger.error(`${E.CROSS} [${req.id}] Download tracking error:`, error);
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
      logger.error(`${E.CROSS} [${req.id}] Missing price ID for ${tier} (${interval})`);
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
    logger.error(`${E.CROSS} [${req.id}] Checkout session error:`, error);
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
    logger.error(`${E.CROSS} [${req.id}] Cancel subscription error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});
// ============================================
// ✅ FIX #24: API KEY RELOAD ENDPOINT (ADMIN ONLY)
// ============================================
app.post('/api/admin/reload-keys', requireAdmin, async (req, res) => {
  try {
    const { key_type } = req.body;
    if (!['groq', 'stripe', 'all'].includes(key_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid key type',
        message: 'Valid types: groq, stripe, all'
      });
    }
    logger.log(`${E.REFRESH} [${req.id}] Reloading ${key_type} API keys by admin: ${req.adminUser.email}`);
    // This is a placeholder - in production, implement proper key rotation
    // For now, just log the attempt
    await logSecurityEvent({
      user_id: req.adminUser.id,
      event_type: 'api_key_reload_requested',
      endpoint: '/api/admin/reload-keys',
      request_details: { key_type }
    });
    res.json({
      success: true,
      message: `API key reload initiated for: ${key_type}`,
      note: 'Restart server to apply new keys from environment variables'
    });
  } catch (error) {
    logger.error(`${E.CROSS} [${req.id}] Key reload error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload keys'
    });
  }
});
// ============================================
// ADMIN DASHBOARD STATS (FIX #25)
// ============================================
app.get('/api/admin/stats', adminLimiter, requireAdmin, async (req, res) => {
  try {
    logger.log(`${E.CHART} [${req.id}] Admin stats requested by ${req.adminUser.email}`);
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, user_tier, created_at, stripe_customer_id');
    if (profilesError) throw profilesError;
    // ✅ FIX #25: Fetch download statistics
    const { data: downloadData, error: downloadError } = await supabase
      .from('download_tracking')
      .select('user_id, downloaded_at, user_tier');
    const today = new Date().toISOString().split('T')[0];
    // Calculate user stats
    const stats = {
      total: profiles.length,
      free: profiles.filter(p => p.user_tier === 'free').length,
      basic: profiles.filter(p => p.user_tier === 'basic').length,
      pro: profiles.filter(p => p.user_tier === 'pro').length,
      business: profiles.filter(p => p.user_tier === 'business').length
    };
    // ✅ ADD: Download statistics
    if (!downloadError && downloadData) {
      const totalDownloads = downloadData.length;
      const todayDownloads = downloadData.filter(d =>
        d.downloaded_at && d.downloaded_at.startsWith(today)
      ).length;
      const downloadsByTier = {
        basic: downloadData.filter(d => d.user_tier === 'basic').length,
        pro: downloadData.filter(d => d.user_tier === 'pro').length,
        business: downloadData.filter(d => d.user_tier === 'business').length
      };
      // Add to response stats object:
      stats.downloads = {
        total: totalDownloads,
        today: todayDownloads,
        by_tier: downloadsByTier
      };
    } else {
      stats.downloads = {
        total: 0,
        today: 0,
        by_tier: { basic: 0, pro: 0, business: 0 }
      };
    }
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
          logger.warn(`${E.WARN} [${req.id}] Failed to fetch subscriptions:`, subError);
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
              logger.warn(`${E.WARN} [${req.id}] Failed to fetch Stripe subscription ${sub.stripe_subscription_id}:`, stripeErr.message);
            }
          }
        }
      } catch (err) {
        logger.error(`${E.CROSS} [${req.id}] Error fetching Stripe subscriptions:`, err);
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
    logger.error(`${E.CROSS} [${req.id}] Admin stats error:`, error);
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
    logger.log(`${E.UP} [${req.id}] Admin analytics requested by ${req.adminUser.email}`);
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
    // ✅ ADD: Fetch download analytics
    const { data: downloadData, error: downloadError } = await supabase
      .from('download_tracking')
      .select('*')
      .order('downloaded_at', { ascending: false });
    let todayDownloads = 0;
    let weekDownloads = 0;
    let monthDownloads = 0;
    if (!downloadError && downloadData) {
      todayDownloads = downloadData.filter(d =>
        d.downloaded_at && d.downloaded_at.startsWith(today)
      ).length;
      weekDownloads = downloadData.filter(d =>
        d.downloaded_at && new Date(d.downloaded_at) >= weekAgo
      ).length;
      monthDownloads = downloadData.length;
    }
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
      const dayDownloads = downloadData ? downloadData.filter(d =>
        d.downloaded_at && d.downloaded_at.startsWith(dateStr)
      ).length : 0;
      history.push({
        date: dateStr,
        generations: dayTotal,
        downloads: dayDownloads
      });
    }
    // Calculate top users by generations
    const userGenerations = new Map();
    usageData.forEach(d => {
      if (d.user_id) {
        const current = userGenerations.get(d.user_id) || 0;
        userGenerations.set(d.user_id, current + (d.generations_used || 0));
      }
    });
    // Calculate top users by downloads
    const userDownloads = new Map();
    if (downloadData) {
      downloadData.forEach(d => {
        if (d.user_id) {
          const current = userDownloads.get(d.user_id) || 0;
          userDownloads.set(d.user_id, current + 1);
        }
      });
    }
    // Fetch profiles for top users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, user_tier');
    const topUsers = Array.from(userGenerations.entries())
      .map(([userId, gens]) => {
        const profile = profiles?.find(p => p.id === userId);
        const downloads = userDownloads.get(userId) || 0;
        return {
          email: profile?.email || 'Unknown',
          user_tier: profile?.user_tier || 'free',
          total_generations: gens,
          total_downloads: downloads
        };
      })
      .sort((a, b) => b.total_generations - a.total_generations)
      .slice(0, 5);
    // Top downloaders
    const topDownloaders = Array.from(userDownloads.entries())
      .map(([userId, downloads]) => {
        const profile = profiles?.find(p => p.id === userId);
        const generations = userGenerations.get(userId) || 0;
        return {
          email: profile?.email || 'Unknown',
          user_tier: profile?.user_tier || 'free',
          total_downloads: downloads,
          total_generations: generations
        };
      })
      .sort((a, b) => b.total_downloads - a.total_downloads)
      .slice(0, 5);
    return res.json({
      success: true,
      analytics: {
        generations: {
          today: todayGenerations,
          week: weekGenerations,
          month: monthGenerations
        },
        downloads: {
          today: todayDownloads,
          week: weekDownloads,
          month: monthDownloads
        },
        history,
        topUsers,
        topDownloaders
      }
    });
  } catch (error) {
    logger.error(`${E.CROSS} [${req.id}] Admin analytics error:`, error);
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
// CATCH-ALL: 404 FOR UNKNOWN ROUTES (ONLY NON-API)
// ============================================
app.get('*', (req, res) => {
  // Only catch non-API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.path,
      availableEndpoints: [
        '/api/health',
        '/api/generate',
        '/api/profile',
        '/api/create-checkout-session',
        '/api/cancel-subscription',
        '/api/track-download',
        '/api/stripe-webhook',
        '/api/admin/stats',
        '/api/admin/analytics'
      ]
    });
  }
  // For non-API routes, return 404
  res.status(404).send('Not Found');
});
// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  logger.log(`${E.CHECK} Server running on port ${PORT}`);
  logger.log(`${E.LINK} Health check: http://localhost:${PORT}/api/health`);
  logger.log(`${E.LOCK} Environment validation completed`);
  if (stripe) {
    logger.log(`${E.CARD} Stripe payments enabled`);
  } else {
    logger.log(`${E.WARN} Stripe payments disabled - missing API key`);
  }
});
// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.log(`${E.STOP} Received SIGTERM, shutting down gracefully...`);
  process.exit(0);
});
process.on('SIGINT', () => {
  logger.log(`${E.STOP} Received SIGINT, shutting down gracefully...`);
  process.exit(0);
});
export default app;
