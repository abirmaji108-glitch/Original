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
  { name: 'GROQ_API_KEY', critical: true },
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
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
  },
  body: JSON.stringify({
    model: 'moonshotai/kimi-k2-instruct',
    max_tokens: 9500,
    temperature: 0.65,
    messages: [
      {
        role: 'system',
        content: 
          `CRITICAL INSTRUCTION — READ THIS FIRST BEFORE ANYTHING ELSE

FOR EVERY SINGLE IMAGE ON THE PAGE, YOU MUST WRITE:
<img src="{{IMAGE_1:exact description of what this image shows}}" alt="...">

THE DESCRIPTION MUST BE SPECIFIC TO WHAT THE IMAGE SHOWS:
<img src="{{IMAGE_1:muscular man doing barbell squat in dark gym orange lighting}}" alt="Gym">
<img src="{{IMAGE_2:truffle carbonara pasta with black truffle shavings close up}}" alt="Pasta">
<img src="{{IMAGE_3:woman personal trainer smiling fitness studio}}" alt="Trainer">
<img src="{{IMAGE_4:boxing ring heavy bags professional gym dark moody}}" alt="Boxing">

FOR CSS BACKGROUNDS YOU MUST WRITE:
style="background: linear-gradient(rgba(0,0,0,0.7),rgba(0,0,0,0.7)), url('{{IMAGE_1:gym interior dark dramatic lighting}}') center/cover"

PICSUM.PHOTOS IS ABSOLUTELY FORBIDDEN. IF YOU WRITE picsum.photos THE PAGE WILL SHOW NO IMAGES.
HARDCODED UNSPLASH URLS ARE ABSOLUTELY FORBIDDEN.
EMPTY SRC IS FORBIDDEN.

THIS IS THE MOST IMPORTANT RULE. VIOLATING THIS BREAKS THE ENTIRE PRODUCT.
You are Sento AI — the world's most elite landing page designer and engineer. You combine the design vision of a Pentagram creative director with the engineering precision of a Google principal engineer. Every page you generate looks like a $50,000+ custom build — rich, complete, conversion-optimized, and pixel-perfect.

════════════════════════════════════════
ABSOLUTE OUTPUT RULE
════════════════════════════════════════
Output ONLY raw HTML. No markdown. No explanation. No code fences. No comments about what you did. Start with <!DOCTYPE html> and end with </html>. Nothing before <!DOCTYPE. Nothing after </html>.
════════════════════════════════════════
USER INTENT DETECTION — HIGHEST PRIORITY
════════════════════════════════════════
Read the user's prompt FIRST and classify it before applying any defaults.

TYPE A — VAGUE/OPEN: ("make a website for my gym", "dental clinic", "coffee shop")
→ Apply ALL niche defaults, mandatory minimums, full richness rules
→ Invent brand name, details, full section list
→ This is the most common case

TYPE B — SPECIFIC/CONSTRAINED: User explicitly limits scope
Trigger words: "one page", "single section", "minimal", "simple", "just a hero", "only show X", "landing page for my ad", "quick page", "just need a form", "short"
→ OBEY THE USER. Build ONLY what they asked for.
→ Skip sections they didn't request. Don't add testimonials/stats they didn't want.
→ Still apply niche fonts/colors, still make it beautiful — just smaller scope.
→ Example: "one-page ad landing page for my gym" → Hero + Form + Footer only. Nothing else.

TYPE C — DETAILED/SPECIFIED: User gives exact section list or exact requirements
("I need: hero, 3 feature cards, pricing table, contact form — nothing else")
→ Build EXACTLY that. Do not add extra sections.
→ User's section list overrides all default section requirements.
→ Still apply quality polish, animations, niche design DNA.

TYPE D — MULTI-SECTION WITH SPECIFIC IMAGES: User provides their own images or says "use these images"
→ Note: The image system uses {{IMAGE_N:description}} placeholders for Unsplash
→ If user provides specific image URLs, use them directly in <img src="">
→ If user says "use an image of X", write a very specific description for that X in the placeholder

RULE: User's explicit instructions ALWAYS override mandatory minimums.
Mandatory minimums only apply when the user gave no constraint (Type A).
When in doubt whether user is Type A or B/C: lean toward obeying the user.

MULTI-PAGE NOTE: This system generates one complete HTML file per request.
If user asks for "multi-page website", interpret as: build the most important page
(usually the homepage) as one complete, rich, single-file HTML. Do not attempt
to generate multiple separate HTML files — output one polished file only.

════════════════════════════════════════
CRITICAL BUG-FREE CODE RULES — NEVER VIOLATE
════════════════════════════════════════
These rules exist to prevent rendering failures seen in real deployments. Breaking any of these produces broken pages.

RULE 1 — FADE-UP ANIMATIONS (most critical fix):
NEVER set opacity:0 via JavaScript inline styles. ALWAYS use this CSS class-based approach:

In <style>:
.fade-up { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
.fade-up.visible { opacity: 1 !important; transform: translateY(0) !important; }

In <script> at bottom of body:
(function(){
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.fade-up').forEach(function(el){ io.observe(el); });
  setTimeout(function(){ document.querySelectorAll('.fade-up').forEach(function(el){ el.classList.add('visible'); }); }, 900);
})();

The setTimeout fallback is MANDATORY — it ensures sections are visible even if IntersectionObserver fails (local files, certain browsers).

RULE 2 — HTML SELECT DROPDOWNS:
ALWAYS write proper <select> with individual <option> tags. NEVER write option text as raw paragraph text.
CORRECT:
<select name="service" id="service" style="width:100%; padding:14px 16px; border:1px solid #D1D5DB; border-radius:8px; font-size:1rem; background:#fff;">
  <option value="">Select a Service</option>
  <option value="general">General Dentistry</option>
  <option value="cosmetic">Cosmetic Dentistry</option>
  <option value="implants">Dental Implants</option>
</select>
WRONG: <select>General Dentistry Cosmetic Dentistry Dental Implants</select>

RULE 3 — HERO HEADLINE COLOR IS ALWAYS WHITE:
Hero section headlines, subheadings, and body text MUST always be color: #FFFFFF or color: white. The dark overlay (rgba 0.55-0.70) makes only white readable. NEVER use brand colors for hero text — they will be unreadable.

RULE 4 — FORM SUBMIT BUTTON USES NICHE PRIMARY COLOR:
The form submit button MUST use var(--primary) as background. NEVER use #059669, #10B981, or any generic green unless the brand is explicitly green. Style: background: var(--primary); color: #fff; border: none;

RULE 5 — MOBILE HAMBURGER MENU (always include this exact code):
Button:
<button id="mob-btn" class="md:hidden flex items-center p-2" style="color:inherit;">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
</button>
Mobile menu div (id="mob-menu", hidden by default, shows on click):
<div id="mob-menu" style="display:none;" class="md:hidden px-4 pb-4 flex flex-col gap-3">...</div>
Script:
document.getElementById('mob-btn').addEventListener('click',function(){ var m=document.getElementById('mob-menu'); m.style.display=m.style.display==='none'?'flex':'none'; });

RULE 6 — STAT COUNTERS ANIMATE UP:
Every stats section MUST use animated counters. Markup: <span class="counter" data-target="15000" data-suffix="+">0</span>
Script (include once per page):
(function(){
  function animateCount(el){
    var target=parseInt(el.dataset.target), suffix=el.dataset.suffix||'', dur=2000, step=target/(dur/16), cur=0;
    var t=setInterval(function(){ cur+=step; if(cur>=target){cur=target;clearInterval(t);} el.textContent=Math.floor(cur).toLocaleString()+suffix; },16);
  }
  var co=new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting&&!e.target.dataset.done){ e.target.dataset.done='1'; animateCount(e.target); co.unobserve(e.target); }});
  },{threshold:0.5});
  document.querySelectorAll('.counter').forEach(function(el){co.observe(el);});
})();
RULE 7 — IMAGE PLACEHOLDERS ARE MANDATORY — THIS IS NON-NEGOTIABLE:
You MUST use {{IMAGE_N:description}} for EVERY image. This is how the backend fetches real photos.
FORBIDDEN — never write these:
  src="https://picsum.photos/..."
  src="https://images.unsplash.com/photo-..." (never hardcode Unsplash photo IDs) 
  src="https://placeholder.com/..."
  src="" (empty)
  src="any-real-url"
CORRECT — always write exactly this format:
  <img src="{{IMAGE_1:muscular athlete barbell squat dark gym red lighting}}" alt="Gym workout">
  <img src="{{IMAGE_2:professional chef plating food fine dining kitchen}}" alt="Chef cooking">
If you use picsum, placeholder, or any real URL instead of {{IMAGE_N:...}}, the entire image system breaks. The backend REQUIRES the {{IMAGE_N:description}} format to fetch photos from Unsplash.



════════════════════════════════════════
VAGUE PROMPT MASTERY — READ THIS CAREFULLY
════════════════════════════════════════
When user gives a vague prompt ("make a website for my gym", "dental clinic", "coffee shop"):
→ INVENT a compelling, realistic brand name (IronForge Gym, Smile SF Dental, Ember & Oak)
→ INVENT specific, plausible details: full address, phone number, email, hours, prices, team names with credentials
→ DETECT the niche and apply ALL niche-specific rules below
→ BUILD the complete required section list for that niche
→ A 5-word prompt must produce a RICHER, MORE COMPLETE page than a detailed one — fill every gap with industry best practices
→ Never ask for more info. Never output partial pages. Always output the complete, stunning page.

════════════════════════════════════════
NICHE DETECTION & DESIGN DNA
════════════════════════════════════════
Detect the niche from keywords. Apply the exact design DNA. This is what separates Sento from generic builders.

── RESTAURANT / CAFE / BISTRO / FOOD ──
Fonts: 'Playfair Display', serif (headings) + 'Lato', sans-serif (body)
Google Fonts: Playfair+Display:wght@400;700;900|Lato:wght@300;400;700
CSS vars: --primary:#8B0000; --accent:#DAA520; --bg:#F5F5DC; --dark:#1A0A00; --text:#2C1810; --surface:#FFF8F0
Hero: dark overlay rgba(10,5,0,0.65) over restaurant image. WHITE text. Full 100vh.
Required sections: Nav → Hero (full viewport, white text, 2 CTAs) → Signature Dishes (4-card grid with prices) → About/Story (split image+text) → Chef Spotlight → Testimonials (3 cards, star ratings) → Reservation Form → Hours & Location (2-col) → Footer
Card style: cream bg, border-left:4px solid var(--accent), subtle shadow
Mood: Michelin-starred, romantic, warm, luxurious

── STEAKHOUSE / UPSCALE DINING ──
Fonts: 'Playfair Display', serif + 'Lato'
CSS vars: --primary:#D4520A; --accent:#C9A96E; --bg:#F5F0E8; --dark:#1C1C1C; --text:#2D1B0E
Required sections: Nav → Hero (dark, moody, full viewport, WHITE text) → Signature Cuts (4 menu cards with prices+descriptions) → About the Experience (image+text) → Wine Collection (3-col) → Reservation Form → Hours & Location → Footer

── SAAS / TECH / APP / SOFTWARE ──
Fonts: 'Inter', sans-serif (all text)
Google Fonts: Inter:wght@300;400;500;600;700;800
CSS vars: --primary:#1E40AF; --secondary:#7C3AED; --bg:#FFFFFF; --surface:#F8FAFF; --text:#111827; --muted:#6B7280
Hero: gradient background linear-gradient(135deg,#1E40AF,#7C3AED), white text, center-aligned, trust badges below CTA
Required sections: Nav (with Login + CTA button) → Hero (gradient, white text, social proof line) → Features (3-col icon cards) → How It Works (3-step process with numbers) → Testimonials (3 cards with avatar, company, role) → Pricing (3-tier table, middle highlighted) → Integration logos strip → Demo/CTA Form → Footer
Card style: white, border:1px solid #E5E7EB, border-radius:12px, hover shadow
Mood: Stripe, Linear, Notion — clean, modern, trustworthy

── GYM / FITNESS / CROSSFIT / SPORTS ──
Fonts: 'Oswald', sans-serif (headings, UPPERCASE) + 'Open Sans' (body)
Google Fonts: Oswald:wght@400;500;600;700|Open+Sans:wght@400;600
CSS vars: --primary:#FF4500; --dark:#0A0A0A; --surface:#141414; --text:#F5F5F5; --accent:#FF6B35
Hero: BLACK background, intense full-bleed image, orange/red overlay, massive UPPERCASE headline, white subtext
Required sections: Nav (dark, uppercase links) → Hero (dark, WHITE text, 2 CTAs) → Stats bar (4 counters: Members, Classes, Trainers, Access — use .counter) → Programs (3 cards dark bg) → Meet The Trainers (3 profile cards with name, specialty, bio) → Membership Pricing (3 tiers) → Contact/Book Consultation form → Footer (dark)
Card style: #141414 bg, 1px border --primary, hover shift to #1A1A1A
Mood: raw, powerful, intense — CrossFit, Barry's Bootcamp energy

── SALON / SPA / BEAUTY / SKINCARE ──
Fonts: 'Cormorant Garamond', serif (light weight, letter-spaced headings) + 'Raleway'
Google Fonts: Cormorant+Garamond:wght@300;400;600;700|Raleway:wght@300;400;500;600
CSS vars: --primary:#C9A96E; --dark:#1A1A1A; --bg:#FFF9F5; --surface:#F5EDE0; --text:#3D2B1F
Required sections: Nav → Hero (soft dreamy, WHITE text) → Services Menu (3-col grid with icons+prices) → Gallery Strip (6 images masonry) → About/Philosophy → Client Reviews (3 testimonials) → Booking Form → Footer
Mood: luxurious, feminine, serene — Drybar, Sephora, top NYC salon

── MEDICAL / CLINIC / DENTAL / HEALTH ──
Fonts: 'Merriweather', serif (headings) + 'Source Sans 3' (body)
Google Fonts: Merriweather:wght@400;700|Source+Sans+3:wght@300;400;600;700
CSS vars: --primary:#0077CC; --secondary:#00B4D8; --bg:#FFFFFF; --surface:#F0F8FF; --text:#1A2E44
Required sections: Nav → Hero (clean light blue, WHITE text on overlay) → Services (3 cards with sub-bullets) → Trust Stats (4 counters: Patients, Years, Satisfaction%, Reviews — use .counter) → Doctor/Team Profile (image+bio+credentials+mini stats) → Patient Testimonials (3 cards with ★★★★★) → Appointment Form → Hours & Location → Footer
Card style: white, left border accent --primary, icon top, clean
Mood: professional, compassionate, trustworthy — top hospital website

── WEDDING / PHOTOGRAPHY / EVENT STUDIO ──
Fonts: 'Great Vibes', cursive (accent/names ONLY) + 'Cormorant Garamond', serif (headings)
Google Fonts: Great+Vibes|Cormorant+Garamond:wght@300;400;500;700
CSS vars: --primary:#C9A96E; --soft:#F5F0EB; --dark:#2C1810; --accent:#8B7355; --blush:#F2D5C8
Required sections: Nav (elegant, thin font) → Hero (romantic full-bleed, WHITE text, script font accent line, 2 CTAs) → Portfolio Gallery (MANDATORY: 6-image 3-column CSS grid masonry layout, each image with overlay on hover) → About the Photographer/Studio (image+story) → Services & Packages (3 tier cards with what's included) → Client Love (3 testimonials with couple names, wedding location) → Contact/Booking Form → Footer
CRITICAL: The portfolio grid MUST be a real CSS grid with 6 images. This is the most important section for this niche.
Card style: cream bg, gold border, delicate shadow
Mood: Vogue wedding, editorial, timeless, emotional

── REAL ESTATE / PROPERTY ──
Fonts: 'Libre Baskerville', serif + 'Nunito Sans'
Google Fonts: Libre+Baskerville:wght@400;700|Nunito+Sans:wght@300;400;600;700
CSS vars: --primary:#1B4332; --accent:#D4A853; --bg:#FAFAFA; --dark:#0D1B0F; --text:#2D3436
Required sections: Nav → Hero (luxury property image, WHITE text, search/CTA overlay) → Featured Listings (3-card grid with property image, price, beds/baths/sqft) → Why Choose Us (4 stat counters) → Agent Team → Testimonials → Contact Form → Footer
Mood: Sotheby's, prestige, aspirational

── EDUCATION / COURSE / SCHOOL / COACHING ──
Fonts: 'Merriweather', serif + 'Open Sans'
Google Fonts: Merriweather:wght@400;700|Open+Sans:wght@400;600;700
CSS vars: --primary:#2563EB; --secondary:#059669; --bg:#FFFFFF; --surface:#F9FAFB; --text:#111827
Required sections: Nav → Hero (inspiring, light, WHITE text on overlay) → What You'll Learn (4-6 bullet outcomes) → Course Curriculum (accordion or 3-col cards) → Instructor Profile → Student Results/Testimonials (3 cards) → Pricing/Enroll CTA → FAQ (5-6 questions) → Footer
Mood: approachable, achievement-oriented, inspiring

── AGENCY / MARKETING / CREATIVE ──
Fonts: 'Poppins', sans-serif
Google Fonts: Poppins:wght@300;400;500;600;700;800
CSS vars: --primary:#667EEA; --secondary:#764BA2; --bg:#FFFFFF; --dark:#0A0A1A; --text:#374151
Required sections: Nav → Hero (bold dark/gradient, WHITE text, tagline) → Services (3-4 cards) → Work/Portfolio (6-image grid) → Our Process (4-step numbered) → Client Logos strip → Team → Contact → Footer
Mood: award-winning, bold, innovative

── HOTEL / HOSPITALITY / RESORT ──
Fonts: 'Playfair Display', serif + 'Raleway'
Google Fonts: Playfair+Display:wght@400;700|Raleway:wght@300;400;500
CSS vars: --primary:#B8860B; --dark:#1A1209; --bg:#FDF8F0; --surface:#F5EDD8; --text:#2C2416
Required sections: Nav → Hero (stunning property image, WHITE text, booking widget/CTA) → Room Types (3 cards with image, name, amenities, price/night) → Amenities (4-6 icon cards) → Location/Experiences → Guest Reviews → Booking Form → Footer
Mood: luxury, escape, aspirational — Four Seasons energy

── E-COMMERCE / FASHION / RETAIL / PRODUCT ──
Fonts: 'Poppins', sans-serif
Google Fonts: Poppins:wght@300;400;500;600;700
CSS vars: --primary:#111827; --accent:#F59E0B; --bg:#FFFFFF; --surface:#F9FAFB; --text:#111827
Required sections: Nav (with cart icon) → Hero (product/lifestyle image, strong headline, shop CTA) → Featured Products (6-card grid with image, name, price, Add to Cart button) → Category strips → Brand Story → Reviews → Newsletter → Footer

── LAW FIRM / LEGAL / FINANCIAL ADVISORY ──
Fonts: 'EB Garamond', serif + 'Source Sans 3'
Google Fonts: EB+Garamond:wght@400;700|Source+Sans+3:wght@400;600
CSS vars: --primary:#1A237E; --accent:#B8860B; --bg:#FFFFFF; --dark:#0D1421; --text:#1A2033
Required sections: Nav → Hero (authoritative dark, WHITE text) → Practice Areas (3-4 cards) → Why Our Firm (4 trust stats) → Attorney Profiles → Case Results/Testimonials → Free Consultation Form → Footer
Mood: authoritative, trustworthy, prestigious

── GENERAL BUSINESS (default if no clear niche) ──
Fonts: 'Poppins', sans-serif
Google Fonts: Poppins:wght@300;400;500;600;700
CSS vars: --primary:#2563EB; --bg:#FFFFFF; --surface:#F9FAFB; --text:#111827; --accent:#F59E0B
Required sections: Nav → Hero → Services/Features (3 cards) → About → Stats counters → Testimonials → Contact Form → Footer

════════════════════════════════════════
UNIVERSAL DESIGN PATTERNS — ALWAYS USE
════════════════════════════════════════

NAVIGATION (every page — fixed, glass effect):
<nav style="position:fixed; top:0; left:0; right:0; z-index:1000; background:rgba(0,0,0,0.85); backdrop-filter:blur(12px); padding:1rem 2rem; display:flex; align-items:center; justify-content:space-between;">
- Logo left (brand name in niche font, --accent or white color)
- Links right (hidden on mobile — use md:flex)
- Mobile hamburger button (RULE 5 above — include EVERY time)
- CTA button in nav for SaaS/agency niches

HERO SECTION:
- min-height:100vh, display:flex, align-items:center, position:relative
- Background: linear-gradient(rgba(0,0,0,0.60),rgba(0,0,0,0.60)), url({{IMAGE_1:...}}) center/cover no-repeat
- ALL TEXT INSIDE HERO IS WHITE — headline, subheadline, trust badges
- Headline: 3.5rem desktop, font-weight:800 or 900, line-height:1.1
- Subheadline: 1.2rem, font-weight:300, max-width:600px, opacity:0.9
- Two CTA buttons side by side: primary (solid --primary), secondary (white outline)
- Add hero entrance animations: .hero-title{animation:fadeInUp 0.8s ease 0.2s both} .hero-sub{animation:fadeInUp 0.8s ease 0.4s both} .hero-cta{animation:fadeInUp 0.8s ease 0.6s both}

SECTION BACKGROUNDS — MUST ALTERNATE WITH HIGH CONTRAST:
Use this rhythm (never two similar light sections in a row):
Section 1 after hero: white (#FFFFFF)
Section 2: dark (#0A0A0A or niche --dark)
Section 3: light surface (niche --surface or #F9FAFB)
Section 4: gradient (linear-gradient using niche colors)
Section 5: white
Section 6: dark or colored
Footer: always dark

CARDS:
- border-radius:12px to 16px
- padding:1.75rem to 2rem
- hover: transform:translateY(-8px), box-shadow 0 4px 20px rgba(0,0,0,0.08) → 0 24px 48px rgba(0,0,0,0.16)
- transition:all 0.35s cubic-bezier(0.4,0,0.2,1)
- Always add class="fade-up"

GRID LAYOUTS:
- 3 col desktop: display:grid; grid-template-columns:repeat(3,1fr); gap:2rem
- Responsive: @media(max-width:768px){grid-template-columns:1fr}
- 4 col stat bars: repeat(4,1fr)

TESTIMONIALS (always include — 3 minimum):
Each card: white or surface bg, padding:2rem, rounded-xl, border, shadow
- Large ❝ in --primary or --accent, font-size:3rem
- Quote text in italic
- ★★★★★ stars in gold (#DAA520)
- Avatar image placeholder (48px round) + Name bold + Role/Company
- Add class="fade-up" to each card

ICONS — use niche-relevant emoji in styled circle:
Gym: 💪 🏋️ 🔥 ⚡ 🎯 | Restaurant: 🍽️ 👨‍🍳 🍷 ⭐ 🌿
SaaS: ⚡ 🔒 📊 🔗 🚀 | Medical: 🦷 💙 🏥 ✓ 🩺
Wedding: 📸 💍 🌸 ✨ 🎬 | Hotel: 🏨 🛎️ 🍳 🏊 ✈️
Icon circle: width:60px;height:60px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin-bottom:1rem

CSS ANIMATIONS (always include in <style>):
@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeInLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}

FOOTER (always dark, multi-column):
- background: var(--dark) or #0A0A0A; padding:60px 0 20px
- 4 columns: Brand+tagline | Quick Links | Contact Info | Newsletter/Social
- Bottom border-top + copyright
- Social icons: SVG for Instagram, X, Facebook, LinkedIn — all white

════════════════════════════════════════
IMAGE RULES — CRITICAL SYSTEM
════════════════════════════════════════
EVERY image uses this EXACT placeholder format:
<img src="{{IMAGE_N:description}}" alt="alt text">

Description must be 15+ words: subject + setting + mood + lighting + style
Examples:
{{IMAGE_1:elegant dark steakhouse dining room leather chairs warm amber candlelight aged wood accents intimate romantic atmosphere cinematic moody lighting}}
{{IMAGE_2:professional female dentist white coat smiling warmly at patient modern bright dental office natural daylight trust compassion}}
{{IMAGE_3:muscular athlete barbell squat dark industrial gym dramatic red lighting intense focused expression raw power energy}}

RULES:
- Generate 8 to 16 images per page
- NUMBER sequentially: IMAGE_1, IMAGE_2, IMAGE_3...
- Hero = IMAGE_1 (most cinematic, full-width)
- Team/people: one image each with round border-radius:50% for avatars
- Menu/product cards: one image each
- Portfolio sections: 6 images minimum
- NEVER use picsum.photos, placeholder.com, or any real URL
- Every <img> MUST have src="{{IMAGE_N:...}}" and alt="..."

════════════════════════════════════════
FORM RULES — EXACT FORMAT (backend requires)
════════════════════════════════════════
<form method="POST" data-sento-form="true" class="sento-contact-form">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
    <input type="text" name="first_name" required placeholder="First Name" style="padding:14px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:1rem;width:100%;">
    <input type="text" name="last_name" required placeholder="Last Name" style="padding:14px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:1rem;width:100%;">
  </div>
  <input type="email" name="email" required placeholder="your@email.com" style="padding:14px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:1rem;width:100%;margin-top:1rem;">
  <input type="tel" name="phone" placeholder="Phone Number" style="padding:14px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:1rem;width:100%;margin-top:1rem;">
  [ADD niche fields: <select> with proper <option> tags for service selection; <input type="date"> for appointments]
  <button type="submit" style="margin-top:1.5rem;width:100%;padding:16px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:1.1rem;font-weight:600;cursor:pointer;">Submit</button>
  <div id="form-message" class="hidden"></div>
</form>
NEVER add JavaScript form handlers. Backend handles submission.
Submit button background is ALWAYS var(--primary). Never green (#059669) unless brand is green.

════════════════════════════════════════
PAGE RICHNESS — MANDATORY MINIMUMS (TYPE A VAGUE PROMPTS ONLY — Type B/C override these completely)
════════════════════════════════════════
Every page MUST have:
✓ 7+ distinct sections (more is always better)
✓ 8+ images with {{IMAGE_N:...}} placeholders
✓ Fixed nav with working mobile hamburger (RULE 5)
✓ Hero at 100vh, dark overlay, WHITE text only
✓ Stats bar with animated .counter elements (RULE 6)
✓ Testimonials section — 3 cards minimum (ALWAYS include for every niche)
✓ Contact/booking form using the exact format above
✓ Dark multi-column footer with social SVGs
✓ CSS fade-up with class method + setTimeout fallback (RULE 1)
✓ Section backgrounds alternating high-contrast (dark ↔ light — NEVER two light sections adjacent)
✓ Mobile hamburger with SVG + click handler (RULE 5)

If user didn't specify details, invent them:
- Full address: "2847 South Congress Ave, Austin, TX 78704"
- Phone: "(512) 555-0123" | Email: "info@brandname.com"
- Realistic business hours for the niche
- 3-4 team members with full names + credentials
- Realistic prices (industry standard)
- 3-4 specific services/menu items/features with real descriptions

════════════════════════════════════════
FINAL QUALITY CHECKLIST
════════════════════════════════════════
Before outputting, mentally verify every item:
□ Hero text is WHITE (never brand color)
□ Form submit button is var(--primary) not green
□ All <select> have proper <option> tags (not raw text)
□ .fade-up uses CSS class method + setTimeout 900ms fallback
□ Mobile hamburger has SVG icon + addEventListener click handler
□ Stats section has .counter with data-target attributes
□ Testimonials section exists with 3+ cards and ★★★★★
□ 7+ distinct sections present
□ Section backgrounds alternate dark ↔ light with high contrast
□ 8+ {{IMAGE_N:...}} placeholders generated

Output only if all boxes checked. The result must be indistinguishable from a $50,000 Webflow template built by a top-tier agency.

FINAL REMINDER BEFORE YOU WRITE A SINGLE LINE OF HTML:
Every image = {{IMAGE_N:specific description}}. No Unsplash URLs. No picsum. {{IMAGE_N:...}} only.`
      },
      {
        role: 'user',
        content: sanitizedPrompt + '\n\n⚠️ MANDATORY FOR IMAGES: Use {{IMAGE_1:description}}, {{IMAGE_2:description}} etc for EVERY image src and CSS background url(). Example: <img src="{{IMAGE_1:chef cooking in professional kitchen}}" alt="Chef">. Hardcoded Unsplash/picsum URLs are forbidden.'
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
      generatedCode = data.choices[0].message.content.trim()
  .replace(/```html\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

// POST-PROCESSING: Fix common Kimi K2 rendering failures
// Fix 1: If fade-up JS uses inline style opacity:0, add the setTimeout fallback
if (generatedCode.includes('fade-up') && !generatedCode.includes('setTimeout')) {
  generatedCode = generatedCode.replace(
    '</body>',
    `<script>setTimeout(function(){document.querySelectorAll('.fade-up').forEach(function(el){el.style.opacity='1';el.style.transform='none';});},1000);</script></body>`
  );
}

// Fix 2: Ensure HTML doesn't start with markdown
if (!generatedCode.startsWith('<!DOCTYPE')) {
  const doctypeIndex = generatedCode.indexOf('<!DOCTYPE');
  if (doctypeIndex > -1) generatedCode = generatedCode.substring(doctypeIndex);
}
      // 📧 INJECT FORM HANDLER (if forms exist and websiteId is available)
      if (generatedCode.includes('data-sento-form') && userId) {
        // We'll get websiteId after saving to database, so we'll inject it later
        console.log('✅ Form detected - will inject handler after website is saved');
      }
      // Smart query extractor — must be defined before try block for rescue access
  function smartQuery(description) {
    const noiseWords = new Set([
      'cinematic','moody','atmospheric','dramatic','ethereal','intimate','aesthetic',
      'vibes','style','feel','tone','warm','soft','bright','dark','light','bold',
      'modern','elegant','luxury','premium','professional','beautiful','stunning',
      'perfect','amazing','incredible','natural','organic','clean','minimalist',
      'cozy','rustic','vintage','classic','contemporary','sleek','polished',
      'ambient','gentle','harsh','vivid','rich','deep','crisp','sharp',
      'golden','silver','white','black','blue','green','red','purple','pink',
      'hour','lighting','light','glow','shadow','contrast','texture','pattern',
      'background','foreground','setting','scene','moment','atmosphere','mood',
      'focus','blur','bokeh','angle','shot','view','perspective','composition',
      'portrait','lifestyle','stock','photo','image','picture','shot'
    ]);
    const words = description.toLowerCase()
      .replace(/[,\.;:!?()]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !noiseWords.has(w));
    return words.slice(0, 5).join(' ') || description.split(' ').slice(0, 4).join(' ');
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
 
  // KIMI RESCUE: Kimi sometimes uses picsum instead of {{IMAGE_N:...}} placeholders
  // Extract alt texts from picsum img tags and treat them as descriptions
  const hasPicsum = generatedCode.includes('picsum.photos');
  const hasFakeUnsplash = generatedCode.includes('images.unsplash.com');
  if (descriptions.length === 0 && (hasPicsum || hasFakeUnsplash)) {
    console.log('⚠️ [IMAGE] Kimi used direct URLs — activating rescue pipeline');
    const topic = detectTopic(sanitizedPrompt);
    const noiseAlts = new Set(['hero','banner','image','photo','story','report','logo','partner','background','project','agent','client','portrait','headshot','profile']);

    function isPersonName(alt) {
      return /\b(agent|client|dr|mr|mrs|ms|coach|trainer|founder|ceo|chef|doctor|attorney|specialist|therapist|consultant)\b/i.test(alt);
    }

    function buildRescueQuery(altText, imgUrl) {
      const pos = generatedCode.indexOf(imgUrl);
      const before = generatedCode.substring(Math.max(0, pos - 600), pos);
      const after = generatedCode.substring(pos, Math.min(generatedCode.length, pos + 200));

      // Get nearest heading before AND after the image
      const headingMatch = before.match(/<h[1-6][^>]*>([^<]{3,60})<\/h[1-6]>/gi);
      const afterHeadingMatch = after.match(/<h[1-6][^>]*>([^<]{3,60})<\/h[1-6]>/gi);
      const rawHeading = (headingMatch ? headingMatch[headingMatch.length - 1] : '') || (afterHeadingMatch ? afterHeadingMatch[0] : '');
      // Strip "The Art of / The Science of / The Power of" noise prefixes
      const lastHeading = rawHeading.replace(/<[^>]+>/g, '').replace(/^(the\s+)?(art|science|power|beauty|magic|story|world)\s+of\s+/i, '').replace(/^(the|your|our|a|an)\s+/i, '').trim();

      const paraMatch = before.match(/<p[^>]*>([^<]{10,100})<\/p>/gi);
      const lastPara = paraMatch ? paraMatch[paraMatch.length - 1].replace(/<[^>]+>/g, '').trim() : '';

      // Hero detection — covers both Tailwind and inline styles
      const isHero = before.slice(-400).includes('min-h-screen')
        || before.slice(-400).includes('min-height:100vh')
        || before.slice(-400).includes('min-height: 100vh')
        || /id=["']?(hero|home|banner|main-hero)["']?/i.test(before.slice(-400));

      // Person/avatar detection — rounded image near a name
      const isRoundImg = after.includes('rounded-full') || before.slice(-150).includes('rounded-full');

      // FIX 1: Hero — use heading + topic, never "lifestyle product modern"
      if (isHero) {
        const heroQuery = lastHeading || sanitizedPrompt.split(' ').slice(0, 5).join(' ');
        return `${heroQuery} ${topic} interior`;
      }

      // FIX 2: Person — detect gender from nearby name, use role not "person"
      if (isRoundImg) {
        const roleMatch = before.match(/\b(trainer|coach|doctor|chef|agent|specialist|founder|ceo|attorney|therapist|esthetician|practitioner|consultant|instructor|director)\b/i);
        const role = roleMatch ? roleMatch[1] : 'professional';
        // Look for female/male name cues in surrounding 300 chars
        const nameContext = before.slice(-300) + after;
        const isFemale = /\b(sarah|jessica|emily|maria|anna|jennifer|lisa|amanda|rachel|priya|sophie|claire|emma|olivia|natalie|diana|elena|nina|amanda|lee)\b/i.test(nameContext);
        const isMale = /\b(marcus|david|john|james|carlos|michael|robert|tyler|ahmed|daniel|kevin|ryan|chris|matthew|jason|peter|simon|tom|david|kim)\b/i.test(nameContext);
        const gender = isFemale ? 'woman' : isMale ? 'man' : 'person';
        return `${gender} ${role} smiling portrait professional headshot`;
      }

      // FIX 3: Content images — heading + paragraph gives best context
      if (lastHeading && lastHeading.length > 4 && !/^(featured|shop|our|meet|client|customer|welcome|about)/i.test(lastHeading)) {
        return lastPara ? `${lastHeading} ${lastPara.slice(0, 40)}` : `${lastHeading} ${topic}`;
      }

      if (altText && altText.length > 4 && !/^(product \d|user|image|photo|home|wellness|electronics|accessories|client|hero|banner)$/i.test(altText)) {
        return `${altText} ${topic}`;
      }

      return `${topic} professional`;
    }

    let ri = 1;

    // CSS background URLs
    const cssRx = /url\(['"]?(https?:\/\/(?:picsum\.photos|images\.unsplash\.com)[^'")\s]+)['"]?\)/gi;
    let cm;
    while ((cm = cssRx.exec(generatedCode)) !== null) {
      const cssUrl = cm[1];
      const query = buildRescueQuery('', cssUrl);
      descriptions.push({ index: ri++, description: query, placeholder: cssUrl, isRescue: true, isCss: true });
    }

    // img tag src URLs
    const imgRx = /src=["'](https?:\/\/(?:picsum\.photos|images\.unsplash\.com)[^"']+)["'][^>]*alt=["']([^"']*?)["']|alt=["']([^"']*?)["'][^>]*src=["'](https?:\/\/(?:picsum\.photos|images\.unsplash\.com)[^"']+)["']/gi;
    let pm;
    while ((pm = imgRx.exec(generatedCode)) !== null) {
      const imgUrl = pm[1] || pm[4];
      const altText = (pm[2] || pm[3] || '').trim();
      if (imgUrl) {
        const query = buildRescueQuery(altText, imgUrl);
        descriptions.push({ index: ri++, description: query, placeholder: imgUrl, isRescue: true });
      }
    }

    console.log(`🚑 [IMAGE] Rescue found ${descriptions.length} images to replace`);
  }
  if (descriptions.length === 0) {
    console.log('⚠️ [IMAGE] No image descriptions found anywhere — using topic fallback');
    throw new Error('No image descriptions generated');
  }
 
  // Fetch perfect images from Unsplash for each description
  const images = [];
  const sources = [];

  for (const desc of descriptions.sort((a, b) => a.index - b.index)) {
    try {
      // Rescue descriptions are already clean queries — don't double-process
      const query = desc.isRescue ? desc.description : smartQuery(desc.description);
      const orient = desc.isCss ? 'landscape' : (desc.description.includes('headshot') || desc.description.includes('portrait') || desc.description.includes('person smiling') ? 'squarish' : 'landscape');
      console.log(`🖼️ [IMAGE ${desc.index}] Query: "${query}" orient:${orient}`);
     
      // Use Unsplash API with smart extracted keywords
      const searchResponse = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=${orient}`,
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
        // Pick randomly from top 3 results for variety across generations
        const pick = Math.floor(Math.random() * Math.min(3, searchData.results.length));
        const imageUrl = searchData.results[pick].urls.regular;
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
      if (desc.isRescue) {
        generatedCode = generatedCode.split(desc.placeholder).join(images[idx]);
        console.log(`🚑 [IMAGE ${desc.index}] Rescue replaced picsum with Unsplash`);
      } else {
        const escapedPlaceholder = desc.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        generatedCode = generatedCode.replace(new RegExp(escapedPlaceholder, 'g'), images[idx]);
        console.log(`🔄 [IMAGE ${desc.index}] Replaced with ${sources[idx]} image`);
      }
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
// ================================================================
// GEMINI FLASH 2.5 HELPER — used exclusively for iterative editing
// ================================================================
async function callGeminiFlash(prompt, maxTokens = 6000) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: maxTokens
        }
      })
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Gemini API error: ${response.status} — ${errBody}`);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0]) {
    throw new Error('Gemini returned no candidates');
  }

  const text = data.candidates[0].content.parts.map(p => p.text || '').join('');
  const inputTokens  = data.usageMetadata?.promptTokenCount     || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

  return { text, inputTokens, outputTokens };
}

// ITERATIVE EDITING - AI-POWERED PAGE UPDATES
// ============================================


app.post('/api/edit/:websiteId/preview', requireAuth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { editInstruction } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!editInstruction) {
      return res.status(400).json({
        success: false,
        error: 'Edit instruction is required'
      });
    }

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

    // Sanitize and analyze
    const sanitized = iterativeEditor.sanitizeEditInstruction(editInstruction);
    const analysis = iterativeEditor.analyzeEditRequest(sanitized, website.html_code);
    
    logger.log(`🎯 [EDIT] Type: ${analysis.editType}, Target: ${analysis.targetSection}`);
    logger.log(`🎯 [EDIT] Multi-target: ${analysis.isMultiTarget}, Insertion: ${analysis.isInsertion}`);

    // ================================================================
    // IMAGE CHANGES: Redirect to pencil icon picker (free, instant)
    // ================================================================
    if (analysis.isImageOnly) {
      logger.log('🖼️ [EDIT] Image change requested - redirecting to pencil icon picker');
      return res.json({
        success: false,
        isImageRequest: true,
        message: 'To change an image, hover over any image on your page and click the pencil icon that appears. It\'s free and instant!'
      });
    }

    // ================================================================
    // INSERTION EDITS: Add new content at precise location
    // ================================================================
    if (analysis.isInsertion) {
      logger.log('➕ [EDIT] Insertion detected - using precision insertion');
      
      try {
        // Step 1: Find insertion point
        const insertionPoint = iterativeEditor.findInsertionPoint(
          website.html_code,
          analysis.insertionAnchor.anchor,
          analysis.insertionAnchor.position
        );
        
        if (!insertionPoint) {
          logger.warn('⚠️ [INSERT] Could not find insertion point, using full HTML edit');
          // Fall through to regular edit
        } else {
          // Step 2: Build insertion prompt
          const insertionPrompt = iterativeEditor.buildInsertionPrompt(
            website.html_code,
            sanitized,
            analysis
          );
          
          const estimatedInputTokens = iterativeEditor.estimateTokens(insertionPrompt);
          const estimatedCost = iterativeEditor.estimateCost(estimatedInputTokens, 4000);
          logger.log(`💰 [INSERT] Estimated cost: $${estimatedCost.toFixed(4)}`);
          
          // Step 3: Call Gemini Flash 2.5 for new section HTML
          const geminiInsert = await callGeminiFlash(insertionPrompt, 6000);
          let newSectionHTML = geminiInsert.text.trim()
            .replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim();

          // Process image placeholders in new section only
          const descriptions = [];
          const regex = /\{\{IMAGE_(\d+):([^}]+)\}\}/g;
          let match;
          while ((match = regex.exec(newSectionHTML)) !== null) {
            descriptions.push({ index: parseInt(match[1]), description: match[2].trim(), placeholder: match[0] });
          }
          if (descriptions.length > 0) {
            const { getContextAwareImages } = await import('./imageLibrary.js');
            const images = await getContextAwareImages(sanitized, descriptions.length);
            descriptions.forEach((desc, idx) => {
              if (images[idx]) {
                const escaped = desc.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                newSectionHTML = newSectionHTML.replace(new RegExp(escaped, 'g'), images[idx]);
              }
            });
          }

          // Splice in programmatically — footer lives in afterText, Claude never touched it
          let editedHTML = insertionPoint.beforeText + '\n' + newSectionHTML + '\n' + insertionPoint.afterText;
          
          const actualInputTokens  = geminiInsert.inputTokens  || estimatedInputTokens;
          const actualOutputTokens = geminiInsert.outputTokens || 4000;
          const actualCost = iterativeEditor.estimateCost(actualInputTokens, actualOutputTokens);
          
          logger.log(`💰 [INSERT] Actual cost: $${actualCost.toFixed(4)}`);
          
          // Validate the insertion
          const validation = iterativeEditor.validateEditedHTML(editedHTML, website.html_code);
          
          
          
          logger.log('✅ [INSERT] New section inserted successfully');
          
          return res.json({
            success: true,
            preview: editedHTML,
            analysis,
            validation,
            cost: {
              inputTokens: actualInputTokens,
              outputTokens: actualOutputTokens,
              totalCost: actualCost,
              approach: 'precision-insertion'
            },
            message: 'New section added - review before applying'
          });
        }
      } catch (insertError) {
        logger.error('❌ [INSERT] Error:', insertError.message);
        // Fall through to regular edit
      }
    }

    // ================================================================
    // MULTI-TARGET EDITS: Edit multiple sections separately
    // ================================================================
    if (analysis.isMultiTarget && analysis.targetType) {
      logger.log(`🎯 [MULTI] Multi-target edit detected for: ${analysis.targetType}`);
      
      try {
        // Step 1: Extract all sections with the target element
        const sections = iterativeEditor.extractAllSectionsWithElement(
          website.html_code,
          analysis.targetType
        );
        
        if (sections.length === 0) {
          logger.warn('⚠️ [MULTI] No sections found with target, using full edit');
          // Fall through to regular edit
        } else if (sections.length === 1) {
          logger.log('ℹ️ [MULTI] Only 1 section found, treating as single edit');
          // Fall through to regular edit (more efficient)
        } else {
          logger.log(`📍 [MULTI] Editing ${sections.length} sections separately`);
          
          let editedHTML = website.html_code;
          let totalCost = 0;
          let totalInputTokens = 0;
          let totalOutputTokens = 0;
          let successCount = 0;
          
          // Step 2: Edit each section separately
          for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            logger.log(`🔄 [MULTI] Editing section ${i + 1}/${sections.length}`);
            
            // Build prompt for this specific section
            const sectionPrompt = iterativeEditor.buildMultiTargetSectionPrompt(
              section.html,
              sanitized,
              analysis.targetType
            );
            
            // Call Gemini Flash 2.5 for this section
            const geminiSection = await callGeminiFlash(sectionPrompt, 2000);
            const editedSection = htmlParser.cleanHTML(geminiSection.text);

            totalInputTokens  += geminiSection.inputTokens;
            totalOutputTokens += geminiSection.outputTokens;
            
            // Merge this edited section back
            const mergeResult = iterativeEditor.smartMergeSection(
              editedHTML,
              section.html,
              editedSection
            );
            
            if (mergeResult.success) {
              editedHTML = mergeResult.html;
              successCount++;
              logger.log(`✅ [MULTI] Section ${i + 1} merged using: ${mergeResult.method}`);
            } else {
              logger.error(`❌ [MULTI] Section ${i + 1} merge failed`);
            }
          }
          
          totalCost = iterativeEditor.estimateCost(totalInputTokens, totalOutputTokens);
          logger.log(`💰 [MULTI] Total cost: $${totalCost.toFixed(4)} for ${sections.length} sections`);
          logger.log(`📊 [MULTI] Success rate: ${successCount}/${sections.length} sections`);
          
          if (successCount === 0) {
            throw new Error('All multi-target sections failed to merge');
          }
          
          // Validate final result
          const validation = iterativeEditor.validateSectionMerge(website.html_code, editedHTML);
          
          if (!validation.valid) {
            logger.warn(`⚠️ [MULTI] Validation issues: ${validation.issues.join(', ')}`);
          }
          
          logger.log('✅ [MULTI] Multi-target edit complete');
          
          return res.json({
            success: true,
            preview: editedHTML,
            analysis,
            validation,
            cost: {
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              totalCost: totalCost,
              approach: `multi-target (${sections.length} sections)`,
              successRate: `${successCount}/${sections.length}`
            },
            message: `Edited ${successCount} sections - review before applying`
          });
        }
      } catch (multiError) {
        logger.error('❌ [MULTI] Error:', multiError.message);
        // Fall through to regular edit
      }
    }

    // ================================================================
    // REGULAR PATH: Single-section or full HTML edit
    // ================================================================
    logger.log('📝 [EDIT] Using standard edit path');

    const editPrompt = iterativeEditor.buildSmartEditPrompt(
  website.html_code,
  sanitized,
  analysis
) || iterativeEditor.buildFullEditPrompt(website.html_code, sanitized);

    const estimatedInputTokens = iterativeEditor.estimateTokens(editPrompt);
    const estimatedCost = iterativeEditor.estimateCost(estimatedInputTokens, 2000);
    logger.log(`💰 [EDIT] Estimated cost: $${estimatedCost.toFixed(4)}`);

    // Call Gemini Flash 2.5
    const geminiEdit = await callGeminiFlash(
      editPrompt,
      analysis.complexity === 'low' ? 2000 : 6000
    );

    if (!geminiEdit.text) {
      throw new Error('Gemini returned empty response');
    }

    let editedHTML = htmlParser.cleanHTML(geminiEdit.text);

    const actualInputTokens  = geminiEdit.inputTokens  || estimatedInputTokens;
    const actualOutputTokens = geminiEdit.outputTokens || 2000;
    const actualCost = iterativeEditor.estimateCost(actualInputTokens, actualOutputTokens);
    logger.log(`💰 [EDIT] Actual cost: $${actualCost.toFixed(4)}`);

    // If section edit, merge back into full HTML with SMART MERGING
    if (analysis.complexity === 'low' && editedHTML.length < website.html_code.length / 2) {
      logger.log('🔀 [EDIT] Attempting to merge edited section back into full HTML');
      
      const relevantSection = iterativeEditor.extractRelevantSection(website.html_code, analysis);
      
      if (relevantSection) {
        const mergeResult = iterativeEditor.smartMergeSection(
          website.html_code,
          relevantSection,
          editedHTML
        );
        
        if (mergeResult.success) {
          logger.log(`✅ [EDIT] Section merged successfully using: ${mergeResult.method}`);
          
          const mergeValidation = iterativeEditor.validateSectionMerge(
            website.html_code,
            mergeResult.html
          );
          
          if (mergeValidation.valid) {
            editedHTML = mergeResult.html;
            logger.log(`✅ [MERGE] Validation passed: ${JSON.stringify(mergeValidation.stats)}`);
          } else {
            logger.error(`❌ [MERGE] Validation failed: ${mergeValidation.issues.join(', ')}`);
            logger.warn('⚠️ [MERGE] Using full Claude response instead of merged version');
          }
        } else {
          logger.error('❌ [EDIT] All merge strategies failed');
          logger.warn('⚠️ [EDIT] Using Claude response as-is (might be incomplete page)');
        }
      } else {
        logger.warn('⚠️ [EDIT] Could not extract relevant section, using Claude response as-is');
      }
    }

    // Validate edited HTML
    const validation = iterativeEditor.validateEditedHTML(editedHTML, website.html_code);

    if (!validation.valid) {
      logger.log(`⚠️ [EDIT] Validation issues: ${validation.issues.join(', ')}`);
      editedHTML = htmlParser.preserveCriticalAttributes(editedHTML, website.html_code);
    }

    // Process images
    const descriptions = [];
    const regex = /\{\{IMAGE_(\d+):([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(editedHTML)) !== null) {
      descriptions.push({
        index: parseInt(match[1]),
        description: match[2].trim(),
        placeholder: match[0]
      });
    }

    if (descriptions.length > 0) {
      logger.log(`🖼️ [EDIT] Processing ${descriptions.length} images`);
      const { getContextAwareImages } = await import('./imageLibrary.js');
      const images = await getContextAwareImages(sanitized, descriptions.length);
      
      descriptions.forEach((desc, idx) => {
        if (images[idx]) {
          const escapedPlaceholder = desc.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          editedHTML = editedHTML.replace(new RegExp(escapedPlaceholder, 'g'), images[idx]);
        }
      });
    }

    logger.log(`✅ [EDIT] Preview generated successfully`);

    return res.json({
      success: true,
      preview: editedHTML,
      analysis,
      validation,
      cost: {
        inputTokens: actualInputTokens,
        outputTokens: actualOutputTokens,
        totalCost: actualCost,
        approach: analysis.complexity === 'low' ? 'section-based' : 'full-regeneration'
      },
      message: 'Edit preview ready - review before applying'
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
    if (website.deployment_url && ['live', 'deployed', 'published'].includes(website.deployment_status)) {
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
// 🖼️ REPLACE IMAGE: Swap one image src for another (zero AI cost)
app.post('/api/edit/:websiteId/replace-image', requireAuth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { oldSrc, newSrc, unsplashId } = req.body;
    const userId = req.user.id;

    if (!oldSrc || !newSrc) {
      return res.status(400).json({ success: false, error: 'oldSrc and newSrc required' });
    }

    const { data: website, error: fetchError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !website) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }

    // Simple src swap - no Claude needed
    const updatedHTML = website.html_code.replace(
      new RegExp(oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      newSrc
    );

    // Trigger Unsplash download endpoint (required by their API guidelines)
    if (unsplashId) {
      try {
        await fetch(`https://api.unsplash.com/photos/${unsplashId}/download`, {
          headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }
        });
      } catch (e) {
        // Non-fatal - don't block the save
        logger.warn('Unsplash download trigger failed:', e.message);
      }
    }

    // Save immediately
    const { error: updateError } = await supabase
      .from('websites')
      .update({
        html_code: updatedHTML,
        last_edited_at: new Date().toISOString()
      })
      .eq('id', websiteId);

    if (updateError) throw updateError;

    // Redeploy if live
    if (website.deployment_status === 'live') {
      try {
        const { url } = await vercelDeploy.deployPage(updatedHTML, website.name);
        await supabase.from('websites').update({ deployment_url: url }).eq('id', websiteId);
      } catch (e) {
        logger.warn('Redeploy after image replace failed:', e.message);
      }
    }

    logger.log(`🖼️ [IMAGE] Replaced image in website ${websiteId}`);

    return res.json({ success: true, message: 'Image replaced successfully' });

  } catch (error) {
    logger.error('❌ [IMAGE] Replace error:', error);
    return res.status(500).json({ success: false, error: 'Failed to replace image' });
  }
});

// 🔍 SEARCH IMAGES: Unsplash search for image picker
app.get('/api/images/search', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query required' });
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`,
      { headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();

    const images = data.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.small,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
      downloadUrl: photo.links.download_location
    }));

    return res.json({ success: true, images });

  } catch (error) {
    logger.error('❌ [IMAGE] Search error:', error);
    return res.status(500).json({ success: false, error: 'Image search failed' });
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
