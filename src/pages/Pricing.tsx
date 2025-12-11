import React, { useState } from 'react';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { TIER_LIMITS } from '@/config/tiers';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for trying out Revenue Rocket',
      price: { monthly: 0, yearly: 0 },
      icon: Sparkles,
      features: TIER_LIMITS.free.features,
      cta: 'Get Started',
      highlighted: false,
      color: 'from-gray-400 to-gray-600'
    },
    {
      name: 'Basic',
      description: 'For solo entrepreneurs and small businesses',
      price: { monthly: 9, yearly: 89 },
      icon: Zap,
      features: [
        'Download 5 websites per month',
        'Landing pages (1-3 sections)',
        '1 custom domain connection',
        'Remove watermark',
        'HTML/CSS export',
        '20+ basic templates',
        'Save up to 10 projects',
        'Basic SEO optimization',
        'Email support (48h)'
      ],
      cta: 'Start Basic',
      highlighted: false,
      color: 'from-blue-500 to-blue-600',
      stripeLink: billingCycle === 'monthly' 
        ? import.meta.env.VITE_STRIPE_BASIC_PRICE_ID
        : import.meta.env.VITE_STRIPE_BASIC_YEARLY_PRICE_ID
    },
    {
      name: 'Pro',
      description: 'For freelancers and growing agencies',
      price: { monthly: 22, yearly: 219 },
      icon: Zap,
      features: [
        'Download 12 websites per month',
        'Multi-page websites (up to 8 pages)',
        '3 custom domains',
        'Remove watermark',
        'HTML/CSS/React export',
        '50+ premium templates',
        'Unlimited projects',
        'Advanced SEO tools',
        'AI chat support (10 iterations per site)',
        'Priority support (24h)',
        'Custom code injection',
        'Version history (3 versions per site)',
        'GitHub sync'
      ],
      cta: 'Start Pro',
      highlighted: true,
      popular: true,
      color: 'from-purple-500 to-purple-600',
      stripeLink: billingCycle === 'monthly'
        ? import.meta.env.VITE_STRIPE_PRO_PRICE_ID
        : import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID
    },
    {
      name: 'Business',
      description: 'For agencies and teams',
      price: { monthly: 49, yearly: 489 },
      icon: Building2,
      features: [
        'Download 40 websites per month',
        'Complex websites (up to 20 pages)',
        'Unlimited team members (3 included)',
        'Unlimited custom domains',
        'White-label solution',
        'Custom templates',
        'API access (100 calls/month)',
        'Dedicated support',
        'SLA guarantee',
        'Custom integrations',
        'Priority generation queue',
        'Unlimited AI iterations',
        'Team collaboration features',
        'Advanced analytics dashboard'
      ],
      cta: 'Contact Sales',
      highlighted: false,
      color: 'from-orange-500 to-orange-600',
      stripeLink: billingCycle === 'monthly'
        ? import.meta.env.VITE_STRIPE_BUSINESS_PRICE_ID
        : import.meta.env.VITE_STRIPE_BUSINESS_YEARLY_PRICE_ID
    }
  ];

  const handlePlanClick = (plan: typeof plans[0]) => {
    if (plan.name === 'Free') {
      window.location.href = '/signup';
    } else if (plan.name === 'Business') {
      window.location.href = 'mailto:sales@revenuerocket.ai?subject=Business Plan Inquiry';
    } else if (plan.stripeLink) {
      window.location.href = `https://checkout.stripe.com/${plan.stripeLink}`;
    }
  };

  const savings = {
    basic: ((9 * 12) - 89),
    pro: ((22 * 12) - 219),
    business: ((49 * 12) - 489)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
      {/* Header */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Choose the perfect plan for your needs. Start free, upgrade anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-800/50 rounded-full p-1 backdrop-blur-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                Save up to $99
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-8 max-w-7xl mx-auto mb-20">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const displayPrice = billingCycle === 'yearly' ? (price / 12).toFixed(0) : price;
            
            return (
              <div
                key={index}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-2 border-purple-500 shadow-2xl shadow-purple-500/20 scale-105'
                    : 'bg-gray-800/50 border border-gray-700'
                } backdrop-blur-sm transition-transform hover:scale-105`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-block p-3 rounded-xl bg-gradient-to-r ${plan.color} mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                  
                  <div className="mb-4">
                    <span className="text-5xl font-bold">${displayPrice}</span>
                    <span className="text-gray-400 ml-2">
                      {billingCycle === 'yearly' ? '/mo' : '/month'}
                    </span>
                  </div>

                  {billingCycle === 'yearly' && plan.name !== 'Free' && (
                    <p className="text-sm text-green-400">
                      Save ${savings[plan.name.toLowerCase() as keyof typeof savings]}/year
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handlePlanClick(plan)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all mb-6 ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="bg-gray-800/50 rounded-2xl p-8 backdrop-blur-sm border border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-400">Feature</th>
                  <th className="text-center py-4 px-4">Free</th>
                  <th className="text-center py-4 px-4">Basic</th>
                  <th className="text-center py-4 px-4 bg-purple-600/10">Pro</th>
                  <th className="text-center py-4 px-4">Business</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 px-4 text-gray-300">Downloads per month</td>
                  <td className="text-center py-4 px-4 text-gray-500">Preview only</td>
                  <td className="text-center py-4 px-4">5</td>
                  <td className="text-center py-4 px-4 bg-purple-600/10">12</td>
                  <td className="text-center py-4 px-4">40</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 px-4 text-gray-300">Pages per website</td>
                  <td className="text-center py-4 px-4 text-gray-500">-</td>
                  <td className="text-center py-4 px-4">1-3 sections</td>
                  <td className="text-center py-4 px-4 bg-purple-600/10">Up to 8 pages</td>
                  <td className="text-center py-4 px-4">Up to 20 pages</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 px-4 text-gray-300">Custom domains</td>
                  <td className="text-center py-4 px-4 text-gray-500">-</td>
                  <td className="text-center py-4 px-4">1</td>
                  <td className="text-center py-4 px-4 bg-purple-600/10">3</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 px-4 text-gray-300">Export formats</td>
                  <td className="text-center py-4 px-4 text-gray-500">-</td>
                  <td className="text-center py-4 px-4">HTML/CSS</td>
                  <td className="text-center py-4 px-4 bg-purple-600/10">HTML/CSS/React</td>
                  <td className="text-center py-4 px-4">All formats</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 px-4 text-gray-300">AI iterations</td>
                  <td className="text-center py-4 px-4 text-gray-500">-</td>
                  <td className="text-center py-4 px-4 text-gray-500">-</td>
                  <td className="text-center py-4 px-4 bg-purple-600/10">10 per site</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 px-4 text-gray-300">Team members</td>
                  <td className="text-center py-4 px-4">1</td>
                  <td className="text-center py-4 px-4">1</td>
                  <td className="text-center py-4 px-4 bg-purple-600/10">1</td>
                  <td className="text-center py-4 px-4">3 included</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 px-4 text-gray-300">API access</td>
                  <td className="text-center py-4 px-4 text-gray-500">-</td>
                  <td className="text-center py-4 px-4 text-gray-500">-</td>
                  <td className="text-center py-4 px-4 bg-purple-600/10 text-gray-500">-</td>
                  <td className="text-center py-4 px-4">100 calls/month</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-300">Support</td>
                  <td className="text-center py-4 px-4">Community</td>
                  <td className="text-center py-4 px-4">Email (48h)</td>
                  <td className="text-center py-4 px-4 bg-purple-600/10">Priority (24h)</td>
                  <td className="text-center py-4 px-4">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6 backdrop-blur-sm border border-gray-700">
              <h3 className="font-semibold mb-2">Can I switch plans anytime?</h3>
              <p className="text-gray-400">Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 backdrop-blur-sm border border-gray-700">
              <h3 className="font-semibold mb-2">What happens if I exceed my download limit?</h3>
              <p className="text-gray-400">You'll be prompted to upgrade to the next tier or wait until your monthly limit resets.</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 backdrop-blur-sm border border-gray-700">
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-gray-400">Yes, we offer a 14-day money-back guarantee on all paid plans.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
