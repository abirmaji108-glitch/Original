// src/lib/email.js - Email Service with Resend
import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send Welcome Email after successful payment
 */
export async function sendWelcomeEmail(email, userName, tier) {
  try {
    const tierNames = {
      basic: 'Basic',
      pro: 'Pro',
      business: 'Business'
    };

    const tierFeatures = {
      basic: ['5 generations per month', '2000 character prompts', 'Basic templates'],
      pro: ['12 generations per month', '5000 character prompts', '50+ premium templates', 'No watermark'],
      business: ['40 generations per month', '10,000 character prompts', 'All premium templates', 'Priority support']
    };

    const { data, error } = await resend.emails.send({
      from: 'Sento AI <onboarding@resend.dev>',
      to: email,
      subject: `Welcome to Sento AI ${tierNames[tier]} Plan! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .feature { padding: 10px 0; display: flex; align-items: center; }
              .feature::before { content: "✅"; margin-right: 10px; font-size: 18px; }
              .cta { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚡ Welcome to Sento AI!</h1>
                <p style="font-size: 18px; margin: 10px 0 0 0;">You're now on the ${tierNames[tier]} Plan</p>
              </div>
              <div class="content">
                <p>Hi ${userName || 'there'},</p>
                <p><strong>Thank you for upgrading to ${tierNames[tier]}!</strong> You now have access to:</p>
                ${tierFeatures[tier].map(feature => `<div class="feature">${feature}</div>`).join('')}
                <p style="margin-top: 30px;">Ready to create your first professional website?</p>
                <a href="${process.env.FRONTEND_URL || 'https://sento-ai.com'}" class="cta">Start Creating →</a>
                <div class="footer">
                  <p>Need help? Reply to this email or visit our support center.</p>
                  <p>© 2024 Sento AI. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error };
    }

    console.log('✅ Welcome email sent to:', email);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Welcome email error:', error);
    return { success: false, error };
  }
}

/**
 * Send Limit Warning Email at 80% usage
 */
export async function sendLimitWarningEmail(email, userName, tier, used, limit) {
  try {
    const remaining = limit - used;
    const percentUsed = Math.round((used / limit) * 100);

    const upgradeTiers = {
      free: { name: 'Basic', limit: 5, price: '$9/mo' },
      basic: { name: 'Pro', limit: 12, price: '$24/mo' },
      pro: { name: 'Business', limit: 40, price: '$49/mo' },
      business: null // Already on highest tier
    };

    const upgrade = upgradeTiers[tier];

    const { data, error } = await resend.emails.send({
      from: 'Sento AI <onboarding@resend.dev>',
      to: email,
      subject: `⚠️ You've used ${used} of ${limit} generations this month`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #fbbf24; color: #78350f; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .stat-row:last-child { border-bottom: none; }
              .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; margin: 20px 0; }
              .progress-fill { background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%); height: 100%; width: ${percentUsed}%; }
              .cta { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Generation Limit Warning</h1>
                <p style="font-size: 18px; margin: 10px 0 0 0;">You're running low on generations</p>
              </div>
              <div class="content">
                <p>Hi ${userName || 'there'},</p>
                <p>You've used <strong>${percentUsed}%</strong> of your monthly generation limit.</p>
                
                <div class="stats">
                  <div class="stat-row">
                    <span><strong>Current Plan:</strong></span>
                    <span>${tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
                  </div>
                  <div class="stat-row">
                    <span><strong>Used:</strong></span>
                    <span>${used} generations</span>
                  </div>
                  <div class="stat-row">
                    <span><strong>Remaining:</strong></span>
                    <span>${remaining} generations</span>
                  </div>
                  <div class="stat-row">
                    <span><strong>Limit:</strong></span>
                    <span>${limit} generations/month</span>
                  </div>
                </div>

                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>

                ${upgrade ? `
                  <p style="margin-top: 30px;">Want unlimited creativity? Upgrade to <strong>${upgrade.name}</strong> for ${upgrade.limit} generations/month!</p>
                  <a href="${process.env.FRONTEND_URL || 'https://sento-ai.com'}/#/pricing" class="cta">Upgrade to ${upgrade.name} (${upgrade.price}) →</a>
                ` : `
                  <p style="margin-top: 30px;">You're on the highest tier! Your limit resets on the 1st of next month.</p>
                `}

                <div class="footer">
                  <p>Your limit resets on the 1st of each month.</p>
                  <p>© 2024 Sento AI. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send limit warning email:', error);
      return { success: false, error };
    }

    console.log('✅ Limit warning email sent to:', email);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Limit warning email error:', error);
    return { success: false, error };
  }
}
