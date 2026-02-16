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
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIXED: Import default export from logger
import logger from './utils/logger.js';
import vercelDeploy from './services/vercelDeploy.js'
import emailService from './services/emailService.js';
import formHandler from './services/formHandler.js';
import analyticsService from './services/analyticsService.js';
import iterativeEditor from './services/iterativeEditor.js';
import htmlParser from './services/htmlParser.js';
// ADD THESE LINES:
// Emoji constants to prevent encoding issues
const E = {
  CHECK: 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦', CROSS: 'ÃƒÂ¢Ã‚ÂÃ…â€™', WARN: 'ÃƒÂ¢Ã…Â¡ ÃƒÂ¯Ã‚Â¸Ã‚Â', CHART: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã… ', LOCK: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€™',
  INBOX: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¥', SIREN: 'ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨', REFRESH: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾', UP: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‹â€ ', LINK: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€',
  CARD: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â€™Ã‚Â³', STOP: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ¢â‚¬Ëœ', EMAIL: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â§', INFO: 'ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¹ÃƒÂ¯Ã‚Â¸Ã‚Â', BLUE: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Âµ'
};
// TIER LIMITS - Single source of truth
const TIER_LIMITS = {
  free: 2,
  basic: 10,
  pro: 25,
  business: 100
};
import { IMAGE_LIBRARY, detectTopic, getUnsplashUrl, getImages, getContextAwareImages, getRateLimitStatus } from './imageLibrary.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);
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
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ OPTIONAL ADDITIONS:
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
 * Generate a short, meaningful website name from the prompt
 */
function generateWebsiteName(prompt) {
  // Remove common instruction phrases
  let name = prompt
    .toLowerCase()
    .replace(/generate a complete.*?html website (based on this description:?)?/gi, '')
    .replace(/create a.*?(website|page|site|landing page)/gi, '')
    .replace(/build a.*?(website|page|site)/gi, '')
    .replace(/make a.*?(website|page|site)/gi, '')
    .replace(/design a.*?(website|page|site)/gi, '')
    .trim();
  
  // Take first sentence or clause
  name = name.split(/[.,;!\n]/)[0].trim();
  
  // Capitalize first letter of each word
  name = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Limit to 50 characters
  if (name.length > 50) {
    name = name.substring(0, 47) + '...';
  }
  
  // Fallback if empty
  if (!name || name.length < 3) {
    name = 'New Website';
  }
  
  return name;
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
// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'No authorization token provided' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token' 
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Authentication failed' 
    });
  }
};

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX: Validate all Stripe price IDs are configured at startup
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
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #20: Comprehensive environment variable validation
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
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ADD RATE LIMITER FOR CHECKOUT
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
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ADD: Download rate limiter (FIX #21)
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
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #26: REQUEST ID MIDDLEWARE
app.use((req, res, next) => {
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  logger.log(`${E.INBOX} [${req.id}] ${req.method} ${req.path}`);
  next();
});
app.use(cors());
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
// 🔒 Stripe webhook MUST be defined BEFORE any body parser
app.post(
  '/api/stripe-webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // 🆕 Enhanced logging before verification
    logger.log(`${E.INBOX} [WEBHOOK] Received Stripe webhook`);
    logger.log(`${E.INFO} [WEBHOOK] Signature present: ${!!sig}`);
    logger.log(`${E.INFO} [WEBHOOK] Secret configured: ${!!webhookSecret}`);
    logger.log(`${E.INFO} [WEBHOOK] Body type: ${typeof req.body}, Length: ${req.body?.length || 0}`);

    let event;
    try {
      // Use trimmed secret to avoid whitespace issues
      const cleanSecret = webhookSecret?.trim() || webhookSecret;
      event = stripe.webhooks.constructEvent(req.body, sig, cleanSecret);
      logger.log(`${E.CHECK} [WEBHOOK] ✅ Signature verified successfully!`);
    } catch (err) {
      logger.error(`${E.CROSS} [WEBHOOK] ❌ Signature verification FAILED`);
      logger.error(`${E.CROSS} [WEBHOOK] Error: ${err.message}`);
      logger.error(`${E.CROSS} [WEBHOOK] Error type: ${err.type || 'unknown'}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ KEEP YOUR EXISTING WEBHOOK LOGIC BELOW THIS LINE
    // (checkout.session.completed, Supabase update, etc.)
    logger.log(`${E.CHECK} Verified webhook event:`, event.type);
   // ============================================
    // BILLION DOLLAR SAAS: WEBHOOK HANDLER
    // This code syncs BOTH profiles and subscriptions tables
    // ============================================
    try {
      switch (event.type) {
        // ============================================
        // INVOICE PAYMENT SUCCEEDED
        // ============================================
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          const subscriptionId = invoice.subscription;
          
          if (!subscriptionId) {
            logger.error('No subscription ID in invoice');
            break;
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          const tier = subscription.metadata?.tier;

          if (!userId || !tier) {
            logger.error('Missing userId or tier in subscription metadata', {
              subscriptionId,
              metadata: subscription.metadata,
            });
            break;
          }

          // ✅ SYNC BOTH TABLES
          await Promise.all([
            // Update profiles
supabase
  .from('profiles')
  .update({
    user_tier: tier,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    warning_email_sent_at: null,
    updated_at: new Date().toISOString()
  })
  .eq('id', userId),
            
            // Update subscriptions
            supabase
              .from('subscriptions')
              .upsert({
                user_id: userId,
                tier: tier,
                websites_limit: TIER_LIMITS[tier] || 2,
                status: 'active',
                stripe_customer_id: subscription.customer,
                stripe_subscription_id: subscriptionId,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id'
              })
          ]);

          logger.log(`✅ User ${userId} upgraded to ${tier} via invoice.payment_succeeded`);
          break;
        }

        // ============================================
// CHECKOUT SESSION COMPLETED - FIXED VERSION
// Replace lines 509-644 in your Server.js
// ============================================
case 'checkout.session.completed': {
  const session = event.data.object;
  const sessionId = session.id;
  
  // Check if already processed (idempotency)
  const { data: existingSession } = await supabase
    .from('processed_webhooks')
    .select('session_id')
    .eq('session_id', sessionId)
    .single();

  if (existingSession) {
    logger.log(`⚠️ Webhook already processed for session ${sessionId} - ignoring duplicate`);
    return res.json({ received: true, duplicate: true });
  }

  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription;
  const customerId = session.customer;
  const tier = session.metadata?.tier;

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

  if (!userId || !tier) {
    logger.error(`${E.CROSS} Missing metadata in checkout session`, {
      userId,
      tier,
      sessionId: session.id
    });
    return res.status(400).json({ error: 'Invalid session metadata' });
  }

  // ✅ FIX: Get ACTUAL subscription period from Stripe
  let periodEnd;
  try {
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logger.log(`✅ Retrieved subscription period: ${periodEnd}`);
    } else {
      // Fallback for one-time payments
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      logger.warn(`⚠️ No subscription ID - using default 30-day period`);
    }
  } catch (stripeError) {
    logger.error(`${E.CROSS} Failed to retrieve subscription from Stripe:`, stripeError);
    periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

// ✅ SYNC BOTH TABLES WITH ERROR CHECKING
  try {
    const [profileResult, subscriptionResult] = await Promise.all([
      // Update profiles
supabase
  .from('profiles')
  .update({
    user_tier: tier,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    warning_email_sent_at: null,
    updated_at: new Date().toISOString()
  })
  .eq('id', userId),
      
      // Update subscriptions
      supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          tier: tier,
          websites_limit: TIER_LIMITS[tier] || 2,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          status: 'active',
          current_period_end: periodEnd,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
    ]);

    // ✅ CHECK FOR ERRORS EXPLICITLY
    if (profileResult.error) {
      logger.error(`${E.CROSS} PROFILE UPDATE FAILED:`, profileResult.error);
      throw new Error(`Profile update failed: ${profileResult.error.message}`);
    }

    if (subscriptionResult.error) {
      logger.error(`${E.CROSS} SUBSCRIPTION UPDATE FAILED:`, subscriptionResult.error);
      throw new Error(`Subscription update failed: ${subscriptionResult.error.message}`);
    }

    logger.log(`${E.CHECK} Payment successful - User ${userId} upgraded to ${tier}`);
    logger.log(`${E.CHECK} Profile update affected ${profileResult.data?.length || 0} rows`);
    logger.log(`${E.CHECK} Subscription update affected ${subscriptionResult.data?.length || 0} rows`);

  } catch (error) {
    logger.error(`${E.CROSS} CRITICAL: Database sync failed`, {
      error: error.message,
      userId,
      tier,
      sessionId: session.id,
      stack: error.stack
    });
    return res.status(500).json({
      error: 'Database operation failed',
      message: error.message
    });
  }

  // Log security event
  await logSecurityEvent({
    user_id: userId,
    event_type: 'tier_upgraded',
    attempted_tier: tier,
    actual_tier: tier,
    endpoint: '/api/stripe-webhook',
    request_details: {
      customerId: session.customer,
      subscriptionId: session.subscription
    }
  });

  // Mark webhook as processed
  await supabase
    .from('processed_webhooks')
    .insert({
      session_id: sessionId,
      event_type: 'checkout.session.completed',
      user_id: userId,
      processed_at: new Date().toISOString()
    });

  // Send welcome email asynchronously
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

        // ============================================
        // SUBSCRIPTION DELETED
        // ============================================
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

          // ✅ DOWNGRADE BOTH TABLES
          await Promise.all([
            // Downgrade profile
            supabase
              .from('profiles')
              .update({
                user_tier: 'free',
                websites_limit: 2,
                stripe_customer_id: null,
                stripe_subscription_id: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', profile.id),
            
            // Update subscription status
            supabase
              .from('subscriptions')
              .update({
                tier: 'free',
                websites_limit: 2,
                status: 'canceled',
                stripe_subscription_id: null,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', profile.id)
          ]);

          logger.log(`${E.CHECK} User ${profile.id} downgraded to free after subscription cancellation`);

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

        // ============================================
        // PAYMENT FAILED
        // ============================================
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer;
          
          console.log('❌ Payment failed for customer:', customerId);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, user_tier, email')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (profile) {
            // ✅ DOWNGRADE BOTH TABLES
            await Promise.all([
              // Downgrade profile
              supabase
                .from('profiles')
                .update({ 
                  user_tier: 'free',
                  websites_limit: 2,
                  stripe_customer_id: null,
                  stripe_subscription_id: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', profile.id),
              
              // Update subscription
              supabase
                .from('subscriptions')
                .update({ 
                  tier: 'free',
                  websites_limit: 2,
                  status: 'payment_failed',
                  updated_at: new Date().toISOString()
                })
                .eq('stripe_customer_id', customerId)
            ]);
            
            console.log(`⬇️ User ${profile.id} downgraded to free - payment failed`);
          }
          break;
        }

        // ============================================
// SUBSCRIPTION UPDATED - FIXED VERSION
// Replace lines 750-774 in your Server.js
// ============================================
case 'customer.subscription.updated': {
  const subscription = event.data.object;
  const customerId = subscription.customer;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (profile) {
    const periodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // ✅ FIXED: Added cancel_at_period_end + enhanced logging
    await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end, // 🔴 ADD THIS LINE!
        current_period_end: periodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    logger.log(`${E.CHECK} Subscription ${subscription.id} updated:`);
    logger.log(`  - Status: ${subscription.status}`);
    logger.log(`  - Cancel at period end: ${subscription.cancel_at_period_end}`);
    logger.log(`  - Period end: ${periodEnd}`);
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
  }
);

// ✅ JSON body parsing for ALL other routes
app.use(express.json({ limit: '10mb' }));
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
    
    // 🔒 STEP 1: CHECK AUTHENTICATION FIRST (BEFORE ANYTHING ELSE)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
    }
    
    // 🔒 STEP 2: VERIFY TOKEN VALIDITY
    let token;
    try {
      token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.error('Token verification failed:', error);
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token',
          message: 'Your session has expired or token is invalid'
        });
      }
      
      userId = user.id;
      console.log(`✅ Authenticated user: ${userId}`);
      
    } catch (authError) {
      console.error('Auth error:', authError);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Could not verify your identity'
      });
    }
    
    // ✅ STEP 3: NOW validate prompt (AFTER auth passes)
    if (!prompt || prompt.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Prompt must be at least 50 characters'
      });
    }
    
    // ✅ STEP 4: Sanitize prompt
    const sanitizedPrompt = prompt
      .replace(/IGNORE\s+.*/gi, '')
      .replace(/SYSTEM\s*:/gi, '')
      .trim()
      .slice(0, 5000); // Hard limit
    
    let userTier = 'free';
    let generationsThisMonth = 0;
    let generatedCode = null;
    let websiteId = null;  // 👈 ADD THIS LINE
    
    // 🔒 STEP 5: ATOMIC INCREMENT (your existing perfect code - UNCHANGED)
    const { data: result, error: txError } = await supabase.rpc(
      'safe_increment_generation',
      { p_user_id: userId }
    );
    
    if (txError) {
      console.error('Transaction error:', txError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Could not process your request'
      });
    }
    
    if (result && result.length > 0) {
      const txResult = result[0];
      userTier = txResult.tier;
      generationsThisMonth = txResult.new_count;
      const limit = txResult.tier_limit;
      
      // 🔒 CHECK IF LIMIT WAS REACHED (SQL function already checked this)
      if (txResult.limit_reached === true) {
        return res.status(429).json({
          success: false,
          error: 'Monthly limit reached',
          limit_reached: true,
          used: generationsThisMonth,
          limit
        });
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
    system: `You are an elite web designer. Generate ONLY complete HTML with embedded CSS and JavaScript.
🚨 MANDATORY IMAGE RULES - YOU MUST FOLLOW THESE EXACTLY:
1. EVERY SINGLE IMAGE must use this EXACT format (no exceptions):
   <img src="{{IMAGE_1:[detailed description]}}" alt="descriptive text">
  
2. Each description MUST be at least 15 words and include:
   - What the image shows (person/place/thing)
   - Who (if person: gender, age, role)
   - Where (setting/background)
   - Style (mood/lighting)
3. CORRECT FORMAT EXAMPLES:
WEDDING:
<img src="{{IMAGE_1:romantic couple silhouette against sunset sky, golden hour lighting, dreamy atmosphere, soft focus, wedding portrait style}}" alt="Couple at sunset">
CHARITY:
<img src="{{IMAGE_1:diverse group of volunteers helping children in African village, smiling faces, outdoor setting, warm natural lighting, community atmosphere}}" alt="Volunteers with children">
RESTAURANT:
<img src="{{IMAGE_1:elegant upscale restaurant interior with wooden tables, warm ambient lighting, cozy atmosphere, customers dining}}" alt="Restaurant interior">
HOTEL/RESORT:
<img src="{{IMAGE_1:luxury oceanfront resort hotel exterior with palm trees, golden hour lighting, azure blue ocean, infinity pool visible, elegant architecture}}" alt="Resort exterior">
CAR DEALERSHIP:
<img src="{{IMAGE_1:modern luxury car showroom interior, shiny sports cars on display, bright professional lighting, glass walls, premium atmosphere}}" alt="Car showroom">
4. CRITICAL RULES:
   - Generate AS MANY images as needed (typically 4-15 depending on site complexity)
   - Use sequential numbering: {{IMAGE_1:...}}, {{IMAGE_2:...}}, {{IMAGE_3:...}}, etc.
   - NEVER use picsum.photos or placeholder.com URLs
   - Each <img> tag MUST have proper src and alt attributes
   - Descriptions must match your HTML content
5. Your response MUST be valid HTML with ALL necessary image placeholders inside <img> tags.

📧 FORM RULES: If creating forms, use this format:
<form method="POST" data-sento-form="true" class="sento-contact-form">
  <input type="text" id="name" name="name" required placeholder="Your Name" />
  <input type="email" id="email" name="email" required placeholder="your@email.com" />
  <button type="submit">Send Message</button>
  <div id="form-message" class="hidden"></div>
</form>
Do NOT add JavaScript for form submission - the backend handles it automatically.

GENERATE HTML NOW:`,
    messages: [
      {
        role: 'user',
        content: sanitizedPrompt
      }
    ]
  }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      generatedCode = data.content[0].text.trim() // ✅ REMOVE 'let'
        .replace(/```html\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      // 📧 INJECT FORM HANDLER (if forms exist and websiteId is available)
      if (generatedCode.includes('data-sento-form') && userId) {
        // We'll get websiteId after saving to database, so we'll inject it later
        console.log('✅ Form detected - will inject handler after website is saved');
      }
     // 🎯 UNIVERSAL: Extract descriptions and get perfect images
try {
  console.log('🔍 [IMAGE] Processing images for:', sanitizedPrompt.substring(0, 50));
 
  const descriptions = [];
  const regex = /\{\{IMAGE_(\d+):([^}]+)\}\}/g;
  let match;
 
  // Extract all descriptions
  while ((match = regex.exec(generatedCode)) !== null) {
    descriptions.push({
      index: parseInt(match[1]),
      description: match[2].trim(),
      placeholder: match[0]
    });
  }
 
  console.log(`📋 [IMAGE] Found ${descriptions.length} image descriptions`);
 
  if (descriptions.length === 0) {
    console.log('⚠️ [IMAGE] No descriptions found - Claude may not have followed instructions');
    throw new Error('No image descriptions generated');
  }
 
  // Fetch perfect images from Unsplash for each description
  const images = [];
  const sources = [];
 
  for (const desc of descriptions.sort((a, b) => a.index - b.index)) {
    try {
      console.log(`🖼️ [IMAGE ${desc.index}] Searching: "${desc.description.substring(0, 60)}..."`);
     
      // Use Unsplash API directly with description
      const searchResponse = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(desc.description)}&per_page=1&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
          }
        }
      );
     
      if (!searchResponse.ok) {
        throw new Error(`Unsplash API error: ${searchResponse.status}`);
      }
     
      const searchData = await searchResponse.json();
     
      if (searchData.results && searchData.results.length > 0) {
        const imageUrl = searchData.results[0].urls.regular;
        images.push(imageUrl);
        sources.push('unsplash');
        console.log(`✅ [IMAGE ${desc.index}] Found perfect match`);
      } else {
        throw new Error('No results from Unsplash');
      }
     
    } catch (error) {
      console.error(`❌ [IMAGE ${desc.index}] Search failed:`, error.message);
     
      // Smart fallback based on description
      const topic = detectTopic(sanitizedPrompt);
      const topicData = IMAGE_LIBRARY[topic] || IMAGE_LIBRARY['business'];
      const fallbackId = topicData.images[Math.min(desc.index - 1, topicData.images.length - 1)];
      const fallbackUrl = getUnsplashUrl(fallbackId);
     
      images.push(fallbackUrl);
      sources.push('fallback');
      console.log(`🔄 [IMAGE ${desc.index}] Using fallback`);
    }
  }
 
  // Replace all placeholders with fetched images
  descriptions.forEach((desc, idx) => {
    if (images[idx]) {
      const escapedPlaceholder = desc.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      generatedCode = generatedCode.replace(new RegExp(escapedPlaceholder, 'g'), images[idx]);
      console.log(`🔄 [IMAGE ${desc.index}] Replaced with ${sources[idx]} image`);
    }
  });
 
  console.log(`✅ [IMAGE] Successfully placed ${images.length} images`);
  console.log(`📊 [IMAGE] Sources: ${sources.join(', ')}`);
 
} catch (imageError) {
  console.error('❌ [IMAGE] Processing failed:', imageError.message);
 
  // Emergency fallback - remove any remaining placeholders
  for (let i = 1; i <= 10; i++) {
    const pattern = new RegExp(`\\{\\{IMAGE_${i}[^}]*\\}\\}`, 'g');
    generatedCode = generatedCode.replace(pattern, '');
  }
  console.log('🚨 [IMAGE] Removed remaining placeholders');
}
/*
      // This line below is problematic - it's not inside any block!
     // âœ… BILLION-DOLLAR SAAS: Update subscriptions table, trigger syncs to profiles
if (userId) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Step 1: Get current subscription (subscriptions = source of truth)
    let { data: currentSubscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier, websites_used_this_month, last_reset_date, status')
      .eq('user_id', userId)
      .maybeSingle();

    // ðŸ†• FIX #1: Auto-create subscription if missing (safety net)
    if (!currentSubscription) {
      console.log(`âš ï¸ No subscription found for ${userId} - creating default subscription`);
      
      const { data: newSub, error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          tier: 'free',
          websites_used_this_month: 0,
          websites_limit: 2,
          last_reset_date: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        console.error('âŒ Failed to create subscription:', createError);
        throw new Error('Subscription creation failed');
      }

      currentSubscription = newSub;
      console.log('âœ… Default subscription created');
    }

    let userTier = currentSubscription.tier || 'free';
    const lastReset = currentSubscription.last_reset_date 
      ? new Date(currentSubscription.last_reset_date).toISOString().slice(0, 7)
      : null;
    const isNewMonth = lastReset !== currentMonth;

    console.log('ðŸ" TIER CHECK:', {
      userId,
      userTier,
      currentMonth,
      lastReset,
      isNewMonth,
      currentUsage: currentSubscription.websites_used_this_month
    });

    // ðŸ"¥ FIX #2: Verify active subscription for paid users
    if (userTier !== 'free' && currentSubscription.status !== 'active') {
      console.log(`â¬‡ï¸ DOWNGRADING user ${userId}: subscription status is ${currentSubscription.status}`);
      
      await supabase
        .from('subscriptions')
        .update({ 
          tier: 'free',
          websites_limit: 2,
          status: 'inactive'
        })
        .eq('user_id', userId);
      
      userTier = 'free';
      console.log('âœ… User downgraded to free tier');
    }

    // ðŸŽ¯ Calculate new usage count
    let newCount;
    let shouldUpdateResetDate = false;

    if (userTier === 'free') {
      // Free users: NEVER reset, just increment (lifetime limit)
      newCount = (currentSubscription.websites_used_this_month || 0) + 1;
      console.log(`ðŸ"Š FREE user - no reset, incrementing: ${newCount}`);
    } else {
      // Paid users: Reset on new month
      if (isNewMonth) {
        newCount = 1;
        shouldUpdateResetDate = true;
        console.log(`ðŸ"„ PAID user - new month, resetting to 1`);
      } else {
        newCount = (currentSubscription.websites_used_this_month || 0) + 1;
        console.log(`ðŸ"Š PAID user - same month, incrementing: ${newCount}`);
      }
    }

    // âœ… Build update data for SUBSCRIPTIONS table
    const updateData = {
      websites_used_this_month: newCount
    };

    // Only update reset date for paid users in new month
    if (shouldUpdateResetDate) {
      updateData.last_reset_date = new Date().toISOString();
    }

    console.log('ðŸ" Updating SUBSCRIPTIONS table:', updateData);

    // âœ… Execute update on SUBSCRIPTIONS table (trigger will sync to profiles)
    const { data: updateResult, error: updateError } = await supabase
      .from('subscriptions')  // ✅ UPDATE SUBSCRIPTIONS, NOT PROFILES
      .update(updateData)
      .eq('user_id', userId)
      .select('websites_used_this_month, last_reset_date, tier');
      
    if (updateError) {
      console.error('âŒ Database update FAILED:', updateError);
      throw new Error(`Update failed: ${updateError.message}`);
    }
    
    if (!updateResult || updateResult.length === 0) {
      console.error('âŒ Update returned empty result');
      throw new Error('Update returned no results');
    }

    console.log('âœ… SUBSCRIPTIONS TABLE UPDATED:', {
      tier: updateResult[0].tier,
      usage: updateResult[0].websites_used_this_month,
      reset: updateResult[0].last_reset_date
    });
    
    console.log('ðŸ"„ Trigger will auto-sync to profiles table');

  } catch (error) {
    console.error('âŒ TIER SYSTEM ERROR:', error.message);
    console.error('Stack:', error.stack);
    // Don't fail the request - just log the error
  }
}
 */     
// ✅ SAVE WEBSITE TO DATABASE
if (userId && generatedCode) {
  try {
    const { data: websiteData, error: insertError } = await supabase
      .from('websites')
      .insert({
        user_id: userId,
        name: generateWebsiteName(sanitizedPrompt),  // ✅ CORRECT - using 'name' column
        prompt: sanitizedPrompt,                   // ✅ ADDED - save full prompt
        html_code: generatedCode,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to save website:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));
      // Don't throw - let user still get their generated code
    } else {
      console.log(`✅ Website saved successfully`);
      console.log(`   - ID: ${websiteData.id}`);
      console.log(`   - User: ${userId}`);
      console.log(`   - Name: ${websiteData.name}`);
      console.log(`   ⏱️ Save took: ${Date.now() - startTime}ms`);
      websiteId = websiteData.id;  // 👈 NEW LINE
    }
  } catch (saveError) {
    console.error('❌ Website save exception:', saveError.message);
    console.error('Stack trace:', saveError.stack);
    // Don't throw - let user still get their generated code
  }
}
      const tierLimits = {
        free: 2,
        basic: 10,
        pro: 25,
        business: 100
      };
      const limit = tierLimits[userTier] || 2;
      console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Generated in ${Date.now() - startTime}ms for ${userId || 'anon'}`);
      // ✅ websiteId will be set when website is saved
      if (userId && websiteId && generatedCode) {
        try {
            // 📧 INJECT FORM HANDLER with websiteId
            if (generatedCode.includes('data-sento-form="true"')) {
              const formHandlerScript = `
<script>
(function() {
  const BACKEND_URL = '${process.env.API_URL || 'https://original-lbxv.onrender.com'}';
  const WEBSITE_ID = '${websiteId}';
  
  document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('[data-sento-form="true"]');
    
    forms.forEach(function(form) {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const messageDiv = form.querySelector('#form-message') || document.createElement('div');
        messageDiv.id = 'form-message';
        
        if (!form.querySelector('#form-message')) {
          form.appendChild(messageDiv);
        }
        
        // Get form data
        const formData = new FormData(form);
        const data = {
          website_id: WEBSITE_ID
        };
        
        formData.forEach((value, key) => {
          data[key] = value;
        });
        
        // Disable submit button
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending...';
        }
        
        try {
          const response = await fetch(BACKEND_URL + '/api/forms/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });
          
          const result = await response.json();
          
          if (result.success) {
            messageDiv.className = 'mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg';
            messageDiv.textContent = '✅ Thank you! Your message has been sent successfully.';
            form.reset();
          } else {
            throw new Error(result.error || 'Submission failed');
          }
        } catch (error) {
          messageDiv.className = 'mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg';
          messageDiv.textContent = '❌ Oops! Something went wrong. Please try again.';
          console.error('Form submission error:', error);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
          }
          messageDiv.classList.remove('hidden');
        }
      });
    });
  });
})();
</script>`;
              
              // Inject before closing </body> tag
              if (generatedCode.includes('</body>')) {
                generatedCode = generatedCode.replace('</body>', formHandlerScript + '</body>');
                console.log('✅ Form handler script injected with websiteId:', websiteId);
              } else {
                // If no </body> tag, append at end
                generatedCode += formHandlerScript;
                console.log('✅ Form handler script appended with websiteId:', websiteId);
              }
              
              // Update database with script-injected HTML
              const { error: updateError } = await supabase
                .from('websites')
                .update({ html_code: generatedCode })
                .eq('id', websiteId);
              
              if (updateError) {
                console.error('❌ Failed to update HTML with script:', updateError);
              } else {
                console.log('✅ Database updated with script-injected HTML');
              }
            }
        } catch (err) {
          console.error('Failed to inject form handler:', err);
        }
      }

      return res.json({
        success: true,
        htmlCode: generatedCode,
        websiteId: websiteId,  // ✅ NEW - Return the UUID from Supabase
        usage: {
          used: generationsThisMonth,
          limit,
          remaining: limit - generationsThisMonth
        },
        tier: userTier,
        generationTime: `${Date.now() - startTime}ms`
      });
    } catch (apiError) {
      clearTimeout(timeout);
      console.error('Claude API error:', apiError);
      
      // 🔒 ROLLBACK counter if generation failed
      if (userId) {
        await supabase.rpc('rollback_generation', { p_user_id: userId })
          .catch(err => console.error('Rollback failed:', err));
      }
      
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
    
    // 🔒 ROLLBACK on any error
    if (userId) {
      await supabase.rpc('rollback_generation', { p_user_id: userId })
        .catch(err => console.error('Rollback failed:', err));
    }
    
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
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX: Handle case when profile doesn't exist
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
      'pro': 25,
      'business': 100
    };
    const downloadLimits = {
  'free': 0,
  'basic': 10,
  'pro': 20,   // ✅ CHANGED from 50 to 20
  'business': 40  // ✅ CHANGED from 200 to 40
};
    const limit = tierLimits[profile.user_tier] || 2;
    const downloadLimit = downloadLimits[profile.user_tier] || 0;
   const generationsThisMonth = profile.generations_this_month || 0;
    const downloadsThisMonth = profile.downloads_this_month || 0;
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
// GET USER'S WEBSITES FROM SUPABASE
// ============================================
app.get('/api/websites', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch all websites for this user from Supabase
    const { data: websites, error } = await supabase
      .from('websites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch websites:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to load websites'
      });
    }
    
    // Transform to frontend format
    const formatted = websites.map(site => ({
      id: site.id,  // UUID from Supabase
      name: site.name || `Website ${site.id.substring(0, 8)}`,
      prompt: site.prompt || '',
      html: site.html_code || '',
      timestamp: new Date(site.created_at).getTime(),
      tags: site.tags || [],
      isFavorite: site.is_favorite || false,
      notes: site.notes || '',
      thumbnail: site.thumbnail || '',
      userId: site.user_id,
      // Include deployment info
      deployment_url: site.deployment_url,
      deployment_id: site.deployment_id,
      deployment_status: site.deployment_status || 'draft'
    }));
    
    return res.json({
      success: true,
      websites: formatted
    });
    
  } catch (error) {
    console.error('Get websites error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
// ============================================
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #16: DOWNLOAD TRACKING ENDPOINT
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
  'pro': 20,   // ✅ CHANGED from 50 to 20
  'business': 40  // ✅ CHANGED from 200 to 40
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
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #22: Log security event
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
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #23: Send warning email when approaching limit
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
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #10: Get user's current tier
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('user_tier')
      .eq('id', user.id)
      .single();
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #11: Log upgrade attempt
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
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #13: Don't expose Stripe errors to client
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
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #24: API KEY RELOAD ENDPOINT (ADMIN ONLY)
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
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX #25: Fetch download statistics
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
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ADD: Download statistics
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
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ADD: Fetch download analytics
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
  const dayDownloads = downloadData ?
    downloadData.filter(d => d.downloaded_at && d.downloaded_at.startsWith(dateStr)).length
    : 0;
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
// PUBLISH LANDING PAGE TO VERCEL
// ============================================
app.post('/api/publish/:websiteId', requireAuth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const userId = req.user.id;
    
    logger.log(`🚀 [${req.id}] Publishing website ${websiteId} for user ${userId}`);

    // 1. Get the website from database
    const { data: website, error: fetchError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !website) {
      logger.warn(`⚠️ [${req.id}] Website not found: ${websiteId}`);
      return res.status(404).json({ 
        success: false,
        error: 'Website not found' 
      });
    }

    // 2. Update status to 'deploying'
    await supabase
      .from('websites')
      .update({ deployment_status: 'deploying' })
      .eq('id', websiteId);

    // 3. Create unique project name (lowercase, no spaces)
    const projectName = `sento-${userId.substring(0, 8)}-${websiteId.substring(0, 8)}`;

    // 4. Inject analytics tracking script
    const backendUrl = process.env.RENDER_EXTERNAL_URL || process.env.VITE_API_URL || 'https://sento-ai.onrender.com';
    const trackingScript = `
<script>
(function() {
  // Generate or get visitor ID
  let visitorId = localStorage.getItem('sento_visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('sento_visitor_id', visitorId);
  }
  
  // Track page view
  fetch('${backendUrl}/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      website_id: '${websiteId}',
      visitor_id: visitorId
    })
  }).catch(function(err) { console.error('Analytics error:', err); });
})();
</script>`;

    // Inject tracking script before </body>
    let htmlWithTracking = website.html_code;
    if (htmlWithTracking.includes('</body>')) {
      htmlWithTracking = htmlWithTracking.replace('</body>', trackingScript + '</body>');
    } else {
      htmlWithTracking = htmlWithTracking + trackingScript;
    }

    // 5. Deploy to Vercel
    logger.log(`📤 [${req.id}] Deploying to Vercel with project name: ${projectName}`);
    const { url, deploymentId } = await vercelDeploy.deployPage(
      htmlWithTracking,
      projectName
    );

    // 5. Update database with deployment info
    const { error: updateError } = await supabase
      .from('websites')
      .update({
        deployment_url: url,
        deployment_id: deploymentId,
        deployment_status: 'live'
      })
      .eq('id', websiteId);

    if (updateError) {
      logger.error(`❌ [${req.id}] Failed to update website with deployment info:`, updateError);
      throw updateError;
    }

    logger.log(`✅ [${req.id}] Successfully published to ${url}`);

    // 6. Return success
    return res.json({
      success: true,
      url: url,
      deploymentId: deploymentId,
      message: 'Page published successfully!'
    });

  } catch (error) {
    logger.error(`❌ [${req.id}] Publish error:`, error);
    
    // Update status to failed
    try {
      await supabase
        .from('websites')
        .update({ deployment_status: 'failed' })
        .eq('id', req.params.websiteId);
    } catch (updateErr) {
      logger.error(`❌ [${req.id}] Failed to update status to failed:`, updateErr);
    }

    return res.status(500).json({ 
      success: false,
      error: 'Failed to publish page',
      details: error.message 
    });
  }
});

// ============================================
// UNPUBLISH LANDING PAGE (DELETE FROM VERCEL)
// ============================================
app.delete('/api/publish/:websiteId', requireAuth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const userId = req.user.id;

    logger.log(`🗑️ [${req.id}] Unpublishing website ${websiteId} for user ${userId}`);

    // Get website
    const { data: website, error: fetchError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !website) {
      return res.status(404).json({ 
        success: false,
        error: 'Website not found' 
      });
    }

    if (!website.deployment_id) {
      return res.status(400).json({ 
        success: false,
        error: 'No published page found' 
      });
    }

    // Delete from Vercel
    logger.log(`🗑️ [${req.id}] Deleting deployment ${website.deployment_id} from Vercel`);
    await vercelDeploy.deleteDeployment(website.deployment_id);

    // Update database
    const { error: updateError } = await supabase
      .from('websites')
      .update({
        deployment_url: null,
        deployment_id: null,
        deployment_status: 'draft'
      })
      .eq('id', websiteId);

    if (updateError) {
      logger.error(`❌ [${req.id}] Failed to update website after unpublish:`, updateError);
      throw updateError;
    }

    logger.log(`✅ [${req.id}] Successfully unpublished`);

    return res.json({ 
      success: true, 
      message: 'Page unpublished successfully' 
    });

  } catch (error) {
    logger.error(`❌ [${req.id}] Unpublish error:`, error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to unpublish page',
      details: error.message
    });
  }
});
// ============================================
// FORM HANDLING ENDPOINTS
// ============================================

// Submit form (public endpoint - anyone can submit)
app.post('/api/forms/submit', async (req, res) => {
  try {
    const formData = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    logger.log(`📝 [${req.id}] Form submission received for website: ${formData.website_id}`);

    // Validate form data
    const validation = formHandler.validateFormData(formData);
    if (!validation.valid) {
      logger.warn(`⚠️ [${req.id}] Invalid form data: ${validation.error}`);
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Sanitize form data
    const sanitizedData = formHandler.sanitizeFormData(formData);

    // Save submission to database
    const { submission, website } = await formHandler.saveSubmission({
      formData: sanitizedData,
      ipAddress,
      userAgent,
      supabase
    });

    // Get owner email
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', website.user_id)
      .single();

    if (ownerProfile?.email) {
      // Send notification email (non-blocking)
      formHandler.notifyOwner({
        ownerEmail: ownerProfile.email,
        pageName: website.name || 'Your Landing Page',
        formData: sanitizedData,
        submittedAt: submission.created_at
      }).catch(err => {
        logger.error(`❌ [${req.id}] Failed to send notification:`, err);
      });
    }

    logger.log(`✅ [${req.id}] Form submission saved: ${submission.id}`);

    // Return success (with redirect URL if needed)
    return res.json({
      success: true,
      message: 'Form submitted successfully!',
      submissionId: submission.id
    });

  } catch (error) {
    logger.error(`❌ [${req.id}] Form submission error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process form submission',
      details: error.message
    });
  }
});

// Get all form submissions for a website (authenticated)
app.get('/api/forms/:websiteId', requireAuth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const userId = req.user.id;

    logger.log(`📊 [${req.id}] Fetching form submissions for website: ${websiteId}`);

    // Verify ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('user_id')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return res.status(404).json({
        success: false,
        error: 'Website not found'
      });
    }

    if (website.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view these submissions'
      });
    }

    // Get all submissions
    const { data: submissions, error: fetchError } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    logger.log(`✅ [${req.id}] Found ${submissions?.length || 0} submissions`);

    return res.json({
      success: true,
      submissions: submissions || [],
      count: submissions?.length || 0
    });

  } catch (error) {
    logger.error(`❌ [${req.id}] Get submissions error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions'
    });
  }
});

// Mark submission as read/unread (authenticated)
app.patch('/api/forms/:submissionId/read', requireAuth, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { isRead } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const { data: submission, error: fetchError } = await supabase
      .from('form_submissions')
      .select('user_id')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    if (submission.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Update read status
    const { error: updateError } = await supabase
      .from('form_submissions')
      .update({ is_read: isRead })
      .eq('id', submissionId);

    if (updateError) {
      throw updateError;
    }

    logger.log(`✅ [${req.id}] Submission ${submissionId} marked as ${isRead ? 'read' : 'unread'}`);

    return res.json({
      success: true,
      message: `Marked as ${isRead ? 'read' : 'unread'}`
    });

  } catch (error) {
    logger.error(`❌ [${req.id}] Update read status error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update submission'
    });
  }
});

// Delete submission (authenticated)
app.delete('/api/forms/:submissionId', requireAuth, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const { data: submission, error: fetchError } = await supabase
      .from('form_submissions')
      .select('user_id')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    if (submission.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Delete submission
    const { error: deleteError } = await supabase
      .from('form_submissions')
      .delete()
      .eq('id', submissionId);

    if (deleteError) {
      throw deleteError;
    }

    logger.log(`✅ [${req.id}] Submission ${submissionId} deleted`);

    return res.json({
      success: true,
      message: 'Submission deleted'
    });

  } catch (error) {
    logger.error(`❌ [${req.id}] Delete submission error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete submission'
    });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

// Track page view (public endpoint - no auth required)
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { website_id, visitor_id } = req.body;

    if (!website_id) {
      return res.status(400).json({
        success: false,
        error: 'website_id is required'
      });
    }

    logger.log(`📊 [${req.id}] Tracking view for website: ${website_id}`);

    await analyticsService.trackView(website_id, visitor_id, supabase);

    logger.log(`✅ [${req.id}] Analytics tracked successfully`);

    return res.json({
      success: true,
      message: 'View tracked'
    });

  } catch (error) {
    logger.error(`❌ [${req.id}] Analytics tracking error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track analytics'
    });
  }
});

// Get analytics for a website (authenticated)
app.get('/api/analytics/:websiteId', requireAuth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const userId = req.user.id;

    logger.log(`📊 [${req.id}] Fetching analytics for website: ${websiteId}`);

    // Verify ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('user_id')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return res.status(404).json({
        success: false,
        error: 'Website not found'
      });
    }

    if (website.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Fetch analytics
    const analyticsData = await analyticsService.getAnalytics(websiteId, supabase);

    logger.log(`✅ [${req.id}] Analytics fetched successfully`);

    return res.json({
      success: true,
      analytics: analyticsData
    });

  } catch (error) {
    logger.error(`❌ [${req.id}] Fetch analytics error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});
// ============================================
// ITERATIVE EDITING - AI-POWERED PAGE UPDATES
// ============================================

// 🎨 EDIT ENDPOINT: Preview edit without saving
// ============================================
// ITERATIVE EDITING - PREVIEW ENDPOINT (FIXED)
// Smart routing: Image fast-path → Section-based → Full edit
// ============================================
app.post('/api/edit/:websiteId', requireAuth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { editInstruction } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!editInstruction || editInstruction.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Edit instruction must be at least 10 characters'
      });
    }

    // Get current website
    const { data: website, error: fetchError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !website) {
      logger.error('❌ [EDIT] Website not found:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Website not found'
      });
    }

    if (!website.html_code) {
      return res.status(400).json({
        success: false,
        error: 'No HTML code found for this website'
      });
    }

    const currentHTML = website.html_code;
    
    // Sanitize instruction
    const sanitizedInstruction = iterativeEditor.sanitizeEditInstruction(editInstruction);
    
    // CRITICAL: Analyze the edit request
    const analysis = iterativeEditor.analyzeEditRequest(sanitizedInstruction, currentHTML);
    
    logger.log(`📊 [EDIT] Analysis:`, {
      targetSection: analysis.targetSection,
      elementSelector: analysis.elementSelector,
      editType: analysis.editType,
      isImageOnly: analysis.isImageOnly,
      isStyleOnly: analysis.isStyleOnly,
      complexity: analysis.complexity
    });

    // ====================================================================
    // FAST PATH 1: IMAGE-ONLY CHANGES (NO CLAUDE API CALL) 💰
    // ====================================================================
    if (analysis.isImageOnly && analysis.elementSelector) {
  logger.log('🖼️ [EDIT] Image-only change detected - using FAST PATH (no API call)');
  
  try {
    const searchTerm = analysis.elementSelector.toLowerCase();
    logger.log(`🔍 [EDIT] Looking for element: "${searchTerm}"`);
    
    let modifiedHTML = currentHTML;
    let imageFound = false;
    
    // STRATEGY 1: Find by heading text (most reliable)
    // Look for <h1-h6> tag containing the search term, then find the nearest image
    const headingRegex = new RegExp(
      `<(h[1-6])[^>]*>([^<]*${searchTerm}[^<]*)<\\/\\1>`,
      'gi'
    );
    
    const headingMatch = currentHTML.match(headingRegex);
    if (headingMatch && headingMatch.length > 0) {
      logger.log(`✅ [EDIT] Found heading with "${searchTerm}"`);
      
      // Get the position of the heading
      const headingIndex = currentHTML.indexOf(headingMatch[0]);
      
      // Look backwards and forwards 500 chars for an image
      const beforeHeading = currentHTML.substring(Math.max(0, headingIndex - 500), headingIndex);
      const afterHeading = currentHTML.substring(headingIndex, headingIndex + 500);
      
      // Try finding image after heading first (more common)
      const imageAfterRegex = /<img[^>]+src="([^"]+)"[^>]*>/i;
      let imageMatch = afterHeading.match(imageAfterRegex);
      let imageContext = afterHeading;
      let searchStart = headingIndex;
      
      // If not found after, try before
      if (!imageMatch) {
        imageMatch = beforeHeading.match(imageAfterRegex);
        imageContext = beforeHeading;
        searchStart = Math.max(0, headingIndex - 500);
      }
      
      if (imageMatch) {
        const fullImageTag = imageMatch[0];
        const oldImageSrc = imageMatch[1];
        
        logger.log(`✅ [EDIT] Found image near heading: ${oldImageSrc.substring(0, 50)}...`);
        
        // Create new image placeholder
        const imageDescription = sanitizedInstruction
          .replace(/change|replace|update|image|picture|photo|for|the|to|a|with/gi, '')
          .trim() || 'updated image';
        
        const newImagePlaceholder = `{{IMAGE_NEW:[${imageDescription}]}}`;
        
        // Replace this specific image tag
        const newImageTag = fullImageTag.replace(oldImageSrc, newImagePlaceholder);
        modifiedHTML = currentHTML.replace(fullImageTag, newImageTag);
        
        imageFound = true;
        logger.log(`✅ [EDIT] Image replaced successfully`);
      }
    }
    
    // STRATEGY 2: Find by alt text (fallback)
    if (!imageFound) {
      logger.log(`⚠️ [EDIT] No heading found, trying alt text match...`);
      
      const altRegex = new RegExp(
        `<img([^>]*alt="[^"]*${searchTerm}[^"]*"[^>]*)src="([^"]+)"([^>]*)>`,
        'gi'
      );
      
      const altMatch = currentHTML.match(altRegex);
      if (altMatch && altMatch.length > 0) {
        const fullImageTag = altMatch[0];
        const srcMatch = fullImageTag.match(/src="([^"]+)"/);
        
        if (srcMatch) {
          const oldImageSrc = srcMatch[1];
          logger.log(`✅ [EDIT] Found image by alt text: ${oldImageSrc.substring(0, 50)}...`);
          
          const imageDescription = sanitizedInstruction
            .replace(/change|replace|update|image|picture|photo|for|the|to|a|with/gi, '')
            .trim() || 'updated image';
          
          const newImagePlaceholder = `{{IMAGE_NEW:[${imageDescription}]}}`;
          const newImageTag = fullImageTag.replace(oldImageSrc, newImagePlaceholder);
          modifiedHTML = currentHTML.replace(fullImageTag, newImageTag);
          
          imageFound = true;
          logger.log(`✅ [EDIT] Image replaced successfully via alt text`);
        }
      }
    }
    
    // STRATEGY 3: Find in section containing search term (last resort)
    if (!imageFound) {
      logger.log(`⚠️ [EDIT] No alt text match, trying section search...`);
      
      // Find section containing the search term
      const sectionRegex = /<section[^>]*>[\s\S]*?<\/section>/gi;
      const sections = currentHTML.match(sectionRegex) || [];
      
      for (const section of sections) {
        if (section.toLowerCase().includes(searchTerm)) {
          logger.log(`✅ [EDIT] Found section containing "${searchTerm}"`);
          
          // Find first image in this section
          const imageInSectionRegex = /<img[^>]+src="([^"]+)"[^>]*>/i;
          const imageMatch = section.match(imageInSectionRegex);
          
          if (imageMatch) {
            const fullImageTag = imageMatch[0];
            const oldImageSrc = imageMatch[1];
            
            logger.log(`✅ [EDIT] Found image in section: ${oldImageSrc.substring(0, 50)}...`);
            
            const imageDescription = sanitizedInstruction
              .replace(/change|replace|update|image|picture|photo|for|the|to|a|with/gi, '')
              .trim() || 'updated image';
            
            const newImagePlaceholder = `{{IMAGE_NEW:[${imageDescription}]}}`;
            const newImageTag = fullImageTag.replace(oldImageSrc, newImagePlaceholder);
            modifiedHTML = currentHTML.replace(fullImageTag, newImageTag);
            
            imageFound = true;
            logger.log(`✅ [EDIT] Image replaced successfully via section search`);
            break;
          }
        }
      }
    }
    
    // Verify change was made
    if (!imageFound || modifiedHTML === currentHTML) {
      logger.warn(`⚠️ [EDIT] Could not find image for "${searchTerm}", falling back to Claude`);
      // Fall through to Claude API below
    } else {
      logger.log(`✅ [EDIT] Image fast-path successful - Zero API cost`);
      
      return res.json({
        success: true,
        previewHtml: modifiedHTML,
        cost: 0.0001, // Near-zero cost (just server processing)
        tokensUsed: 0,
        editType: 'image_fast_path',
        analysis
      });
    }
  } catch (fastPathError) {
    logger.error('❌ [EDIT] Fast path error:', fastPathError);
    // Fall through to Claude API
  }
}

    // ====================================================================
    // FAST PATH 2: SIMPLE STYLE CHANGES (LIGHTWEIGHT PROMPT) 💰
    // ====================================================================
    if (analysis.isStyleOnly && analysis.complexity === 'low') {
      logger.log('🎨 [EDIT] Style-only change - using LIGHTWEIGHT prompt');
    }

    // ====================================================================
    // STANDARD PATH: USE CLAUDE API (with smart prompts)
    // ====================================================================
    logger.log(`🤖 [EDIT] Using Claude API - Complexity: ${analysis.complexity}`);
    
    // Build smart prompt based on analysis
    const editPrompt = iterativeEditor.buildSmartEditPrompt(
      currentHTML,
      sanitizedInstruction,
      analysis
    );
    
    // Estimate tokens
    const estimatedInputTokens = iterativeEditor.estimateTokens(editPrompt);
    const estimatedOutputTokens = iterativeEditor.estimateTokens(currentHTML);
    const estimatedCost = iterativeEditor.estimateCost(estimatedInputTokens, estimatedOutputTokens);
    
    logger.log(`💰 [EDIT] Estimated cost: $${estimatedCost.toFixed(4)}`);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: editPrompt
      }]
    });

    if (!response.content || !response.content[0]) {
      throw new Error('Empty response from Claude API');
    }

    let modifiedHTML = response.content[0].text;

    // Clean up response (remove markdown fences if present)
    modifiedHTML = modifiedHTML
      .replace(/```html\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Validate edited HTML
    const validation = iterativeEditor.validateEditedHTML(modifiedHTML, currentHTML);
    
    if (!validation.valid) {
      logger.error('❌ [EDIT] Validation failed:', validation.issues);
      return res.status(400).json({
        success: false,
        error: 'Generated HTML failed validation',
        issues: validation.issues,
        warnings: validation.warnings
      });
    }

    if (validation.warnings.length > 0) {
      logger.warn('⚠️ [EDIT] Warnings:', validation.warnings);
    }

    // Calculate actual cost
    const actualInputTokens = response.usage?.input_tokens || estimatedInputTokens;
    const actualOutputTokens = response.usage?.output_tokens || estimatedOutputTokens;
    const actualCost = iterativeEditor.estimateCost(actualInputTokens, actualOutputTokens);

    logger.log(`✅ [EDIT] Edit complete - Cost: $${actualCost.toFixed(4)}, Tokens: ${actualInputTokens + actualOutputTokens}`);

    return res.json({
      success: true,
      previewHtml: modifiedHTML,
      cost: actualCost,
      tokensUsed: actualInputTokens + actualOutputTokens,
      editType: analysis.editType,
      analysis,
      validation
    });

  } catch (error) {
    logger.error('❌ [EDIT] Preview error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate edit preview',
      details: error.message
    });
  }
});
// 💾 APPLY EDIT: Save and deploy edited version
app.post('/api/edit/:websiteId/apply', requireAuth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { editedHTML, editInstruction } = req.body;
    const userId = req.user.id;

    if (!editedHTML) {
      return res.status(400).json({
        success: false,
        error: 'No edited HTML provided'
      });
    }

    // Get current website
    const { data: website, error: fetchError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !website) {
      return res.status(404).json({
        success: false,
        error: 'Website not found'
      });
    }

    const newVersion = (website.current_version || 0) + 1;

    // Save current version to history
    const { error: versionError } = await supabase
      .from('website_versions')
      .insert({
        website_id: websiteId,
        user_id: userId,
        html_code: website.html_code,
        version_number: website.current_version || 1,
        change_description: `Version ${website.current_version || 1} - before edit`
      });

    if (versionError) {
      logger.error('Version save error:', versionError);
    }

    // Update website with edited HTML
    const { error: updateError } = await supabase
      .from('websites')
      .update({
        html_code: editedHTML,
        current_version: newVersion,
        last_edited_at: new Date().toISOString()
      })
      .eq('id', websiteId);

    if (updateError) {
      throw updateError;
    }

    // If published, redeploy
    let deploymentResult = null;
    if (website.deployment_status === 'live' && website.deployment_url) {
      try {
        logger.log(`🚀 [EDIT] Redeploying edited page...`);
        
        const { url, deploymentId } = await vercelDeploy.deployPage(
          editedHTML,
          website.name
        );

        // Update deployment info
        await supabase
          .from('websites')
          .update({
            deployment_url: url,
            deployment_id: deploymentId
          })
          .eq('id', websiteId);

        deploymentResult = { url, deploymentId };
        logger.log(`✅ [EDIT] Redeployed to ${url}`);
      } catch (deployError) {
        logger.error('Deployment error:', deployError);
        // Don't fail the edit if deployment fails
      }
    }

    logger.log(`✅ [EDIT] Applied and saved version ${newVersion}`);

    return res.json({
      success: true,
      version: newVersion,
      deployment: deploymentResult,
      message: deploymentResult 
        ? 'Edit applied and redeployed successfully'
        : 'Edit applied successfully'
    });

  } catch (error) {
    logger.error('❌ [EDIT] Apply error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to apply edit'
    });
  }
});

// 📜 GET VERSION HISTORY
app.get('/api/edit/:websiteId/versions', requireAuth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const { data: website, error: verifyError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .eq('user_id', userId)
      .single();

    if (verifyError || !website) {
      return res.status(404).json({
        success: false,
        error: 'Website not found'
      });
    }

    // Get version history
    const { data: versions, error: fetchError } = await supabase
      .from('website_versions')
      .select('*')
      .eq('website_id', websiteId)
      .order('version_number', { ascending: false })
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    return res.json({
      success: true,
      versions: versions || [],
      count: versions?.length || 0
    });

  } catch (error) {
    logger.error('❌ [EDIT] Version history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch version history'
    });
  }
});

// ⏪ REVERT TO PREVIOUS VERSION
app.post('/api/edit/:websiteId/revert/:versionNumber', requireAuth, async (req, res) => {
  try {
    const { websiteId, versionNumber } = req.params;
    const userId = req.user.id;

    // Get website
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', userId)
      .single();

    if (websiteError || !website) {
      return res.status(404).json({
        success: false,
        error: 'Website not found'
      });
    }

    // Get version to revert to
    const { data: version, error: versionError } = await supabase
      .from('website_versions')
      .select('*')
      .eq('website_id', websiteId)
      .eq('version_number', parseInt(versionNumber))
      .single();

    if (versionError || !version) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      });
    }

    // Save current state before reverting
    await supabase
      .from('website_versions')
      .insert({
        website_id: websiteId,
        user_id: userId,
        html_code: website.html_code,
        version_number: website.current_version,
        change_description: `Backup before reverting to v${versionNumber}`
      });

    // Update website with old version
    const { error: updateError } = await supabase
      .from('websites')
      .update({
        html_code: version.html_code,
        current_version: parseInt(versionNumber),
        last_edited_at: new Date().toISOString()
      })
      .eq('id', websiteId);

    if (updateError) {
      throw updateError;
    }

    // If published, redeploy
    if (website.deployment_status === 'live') {
      const { url, deploymentId } = await vercelDeploy.deployPage(
        version.html_code,
        website.name
      );

      await supabase
        .from('websites')
        .update({
          deployment_url: url,
          deployment_id: deploymentId
        })
        .eq('id', websiteId);

      logger.log(`✅ [EDIT] Reverted and redeployed to v${versionNumber}`);
    }

    return res.json({
      success: true,
      version: parseInt(versionNumber),
      message: `Reverted to version ${versionNumber}`
    });

  } catch (error) {
    logger.error('❌ [EDIT] Revert error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to revert version'
    });
  }
});

// ============================================
// END OF ITERATIVE EDITING ENDPOINTS
// ============================================

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
