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
      color: 'from-cyan-500 to-blue-600',
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
      window.location.href = '/#/signup';
    } else if (plan.name === 'Business') {
      window.location.href = 'mailto:sales@sento.ai?subject=Business Plan Inquiry';
    } else if (plan.stripeLink) {
      window.open(`https://buy.stripe.com/test_${plan.stripeLink}`, '_blank');
    }
  };

  const savings = {
    basic: ((9 * 12) - 89),
    pro: ((22 * 12) - 219),
    business: ((49 * 12) - 489)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Choose the perfect plan for your needs. Start free, upgrade anytime.
          </p>
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

        <div className="grid md:grid-cols-4 gap-8 max-w-7xl mx-auto mb-20">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const displayPrice = billingCycle === 'yearly' ? (price / 12).toFixed(0) : price;

            return (
              <div
                key={index}
                style={{ animationDelay: `${index * 0.1}s` }}
                className={`pricing-card glass-card relative rounded-2xl p-8 animate-slide-up ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-2 border-purple-500 shadow-2xl shadow-purple-500/20 scale-105 animate-pulse-glow'
                    : 'bg-gray-800/50 border border-gray-700'
                } backdrop-blur-sm transition-all duration-500 hover:scale-110 hover:-translate-y-4 hover:shadow-2xl`}
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

        {/* Comparison Table & FAQ remain unchanged */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="bg-gray-800/50 rounded-2xl p-8 backdrop-blur-sm border border-gray-700 overflow-x-auto">
            <table className="w-full">
              {/* ... table content unchanged ... */}
            </table>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {/* ... FAQ items unchanged ... */}
          </div>
        </div>
      </div>

      {/* NEW STYLE BLOCK — REPLACED AS REQUESTED */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(168, 85, 247, 0.6);
          }
        }
        
        @keyframes gradient-border {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .pricing-card {
          position: relative;
          transition: all 0.3s ease;
        }
        
        .pricing-card::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 1rem;
          background: linear-gradient(45deg, #a855f7, #06b6d4, #ec4899, #a855f7);
          background-size: 300% 300%;
          opacity: 0;
          z-index: -1;
          transition: opacity 0.3s ease;
          filter: blur(10px);
        }
        
        .pricing-card:hover::before {
          opacity: 0.6;
          animation: gradient-border 3s ease infinite;
        }
        
        .glass-card {
          backdrop-filter: blur(16px) saturate(180%);
          background-color: rgba(17, 24, 39, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.125);
        }
      `}</style>
    </div>
  );
};

export default Pricing;
