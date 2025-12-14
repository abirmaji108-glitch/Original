import React from 'react';

/**
 * Limit Warning Email Template Component
 * Sent when user reaches 80% of their generation limit
 * 
 * NOTE: This is a React component for reference/preview only.
 * The actual email HTML is in src/lib/email.ts (sendLimitWarningEmail function)
 * 
 * This file helps you visualize what the email looks like.
 */

interface LimitWarningEmailProps {
  userName?: string;
  tier: 'free' | 'basic' | 'pro' | 'business';
  used: number;
  limit: number;
}

const LimitWarningEmail: React.FC<LimitWarningEmailProps> = ({ 
  userName = 'there',
  tier = 'free',
  used = 8,
  limit = 10
}) => {
  const remaining = limit - used;
  const percentUsed = Math.round((used / limit) * 100);

  const upgradeTiers = {
    free: { name: 'Basic', limit: 5, price: '$9/mo' },
    basic: { name: 'Pro', limit: 12, price: '$24/mo' },
    pro: { name: 'Business', limit: 40, price: '$49/mo' },
    business: null
  };

  const upgrade = upgradeTiers[tier];

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-400 text-yellow-900 p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold mb-2">Generation Limit Warning</h1>
          <p className="text-lg">You're running low on generations</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-gray-700 mb-4">Hi {userName},</p>
          
          <p className="text-gray-700 mb-6">
            You've used <strong>{percentUsed}%</strong> of your monthly generation limit.
          </p>

          {/* Stats Box */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-700">Current Plan:</span>
              <span className="text-gray-900">
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-700">Used:</span>
              <span className="text-gray-900">{used} generations</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-700">Remaining:</span>
              <span className="text-orange-600 font-bold">{remaining} generations</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="font-semibold text-gray-700">Limit:</span>
              <span className="text-gray-900">{limit} generations/month</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${percentUsed}%` }}
              >
                {percentUsed}%
              </div>
            </div>
          </div>

          {/* Upgrade CTA or Info */}
          {upgrade ? (
            <>
              <p className="text-gray-700 mb-6">
                Want unlimited creativity? Upgrade to <strong>{upgrade.name}</strong> for {upgrade.limit} generations/month!
              </p>
              <div className="text-center">
                <a 
                  href="https://sento-ai.com/#/pricing"
                  className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Upgrade to {upgrade.name} ({upgrade.price}) →
                </a>
              </div>
            </>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-800">
                You're on the highest tier! Your limit resets on the 1st of next month.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p className="mb-2">
              Your limit resets on the 1st of each month.
            </p>
            <p>© 2024 Sento AI. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Preview Note */}
      <div className="mt-8 text-center">
        <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
          <p className="text-blue-800 text-sm">
            📧 <strong>Email Preview:</strong> This is how your limit warning email will look!
          </p>
          <p className="text-blue-600 text-xs mt-1">
            Actual email is sent from: <code>src/lib/email.ts</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LimitWarningEmail;
