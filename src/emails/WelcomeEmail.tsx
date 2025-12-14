import React from 'react';

/**
 * Welcome Email Template Component
 * Used for payment success emails
 * 
 * NOTE: This is a React component for reference/preview only.
 * The actual email HTML is in src/lib/email.ts (sendWelcomeEmail function)
 * 
 * This file helps you visualize what the email looks like.
 */

interface WelcomeEmailProps {
  userName?: string;
  tier: 'basic' | 'pro' | 'business';
}

const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ 
  userName = 'there', 
  tier = 'pro' 
}) => {
  const tierInfo = {
    basic: {
      name: 'Basic',
      features: [
        '5 generations per month',
        '2000 character prompts',
        'Basic templates'
      ]
    },
    pro: {
      name: 'Pro',
      features: [
        '12 generations per month',
        '5000 character prompts',
        '50+ premium templates',
        'No watermark'
      ]
    },
    business: {
      name: 'Business',
      features: [
        '40 generations per month',
        '10,000 character prompts',
        'All premium templates',
        'Priority support'
      ]
    }
  };

  const info = tierInfo[tier];

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-8 text-center">
          <div className="text-5xl mb-4">⚡</div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Sento AI!</h1>
          <p className="text-lg opacity-90">You're now on the {info.name} Plan</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-gray-700 mb-4">Hi {userName},</p>
          
          <p className="text-gray-700 mb-6">
            <strong>Thank you for upgrading to {info.name}!</strong> You now have access to:
          </p>

          {/* Features List */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            {info.features.map((feature, index) => (
              <div key={index} className="flex items-center mb-3 last:mb-0">
                <span className="text-green-500 text-xl mr-3">✅</span>
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          <p className="text-gray-700 mb-6">
            Ready to create your first professional website?
          </p>

          {/* CTA Button */}
          <div className="text-center">
            <a 
              href="https://sento-ai.com"
              className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Start Creating →
            </a>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p className="mb-2">
              Need help? Reply to this email or visit our support center.
            </p>
            <p>© 2024 Sento AI. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Preview Note */}
      <div className="mt-8 text-center">
        <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
          <p className="text-blue-800 text-sm">
            📧 <strong>Email Preview:</strong> This is how your welcome email will look!
          </p>
          <p className="text-blue-600 text-xs mt-1">
            Actual email is sent from: <code>src/lib/email.ts</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeEmail;
