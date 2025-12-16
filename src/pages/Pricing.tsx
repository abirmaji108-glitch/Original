import React, { useState } from 'react';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { user } = useAuth();
  const navigate = useNavigate();

  const pricingTiers = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for trying out Revenue Rocket',
      price: { monthly: 0, yearly: 0 },
      icon: Sparkles,
      features: [
        '2 website previews per month',
        'Landing pages (3-5 sections max)',
        'Basic templates only',
        'Watermarked exports',
        'Community support'
      ],
      cta: 'Get Started',
      highlighted: false,
      color: 'from-gray-400 to-gray-600'
    },
    {
      id: 'basic',
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
      stripeLink: true
    },
    {
      id: 'pro',
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
        'AI chat support (10 iterations)',
        'Priority support (24h)',
        'Custom code injection',
        'Version history (3 versions)',
        'GitHub sync'
      ],
      cta: 'Start Pro',
      highlighted: true,
      popular: true,
      color: 'from-purple-500 to-purple-600',
      stripeLink: true
    },
    {
      id: 'business',
      name: 'Business',
      description: 'For agencies and teams',
      price: { monthly: 49, yearly: 489 },
      icon: Building2,
      features: [
        'Download 40 websites per month',
        'Complex websites (up to 20 pages)',
        '3 team members included',
        'Unlimited custom domains',
        'White-label solution',
        'Custom templates',
        'API access (100 calls/month)',
        'Dedicated support',
        'SLA guarantee',
        'Custom integrations',
        'Priority generation queue',
        'Unlimited AI iterations',
        'Team collaboration',
        'Advanced analytics'
      ],
      cta: 'Contact Sales',
      highlighted: false,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const handleStartPlan = async (plan: typeof pricingTiers[0]) => {
    // If user not logged in, redirect to signup
    if (!user) {
      navigate('/signup');
      return;
    }

    // Free plan - just update tier in database
    if (plan.id === 'free') {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ user_tier: 'free' })
          .eq('id', user.id);
        if (error) throw error;
        alert('Welcome to the Free plan!');
        navigate('/dashboard');
      } catch (error) {
        console.error('Error updating tier:', error);
        alert('Failed to update plan. Please try again.');
      }
      return;
    }

    // Business plan - contact sales
    if (plan.id === 'business') {
      window.location.href = 'mailto:sales@sento.ai?subject=Business Plan Inquiry';
      return;
    }

    // Paid plans (Basic & Pro) - redirect to Stripe checkout
    if (plan.stripeLink) {
      try {
        // Determine correct price ID based on billing cycle and plan
        let priceId;
       
        if (billingCycle === 'monthly') {
          // Monthly pricing
          priceId = plan.id === 'basic'
            ? import.meta.env.VITE_STRIPE_BASIC_PRICE_ID
            : import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
        } else {
          // Yearly pricing
          priceId = plan.id === 'basic'
            ? import.meta.env.VITE_STRIPE_BASIC_YEARLY_PRICE_ID
            : import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID;
        }

        if (!priceId) {
          throw new Error(`Stripe price ID not configured for ${plan.id} ${billingCycle}`);
        }

        console.log(`💳 Starting checkout: ${plan.name} (${billingCycle}) - Price ID: ${priceId}`);

        // Use flexible backend URL with fallback to localhost:3000
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

        const response = await fetch(`${backendUrl}/api/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId,
            userId: user.id,
            email: user.email,
            planName: plan.name,
            billingCycle, // Send billing cycle to backend for logging
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        // Load Stripe and redirect
        const stripe = (window as any).Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
        if (!stripe) {
          throw new Error('Stripe failed to load');
        }

        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });

        if (error) {
          throw error;
        }
      } catch (error: any) {
        console.error('Stripe checkout error:', error);
        alert(`Failed to start checkout: ${error.message}. Please try again or contact support.`);
      }
    }
  };

  const savings = {
    basic: 9 * 12 - 89,
    pro: 22 * 12 - 219,
    business: 49 * 12 - 489
  };

  const comparisonFeatures = [
    { name: 'Monthly Downloads', free: '2 previews', basic: '5 sites', pro: '12 sites', business: '40 sites' },
    { name: 'Website Complexity', free: '3-5 sections', basic: '1-3 sections', pro: 'Up to 8 pages', business: 'Up to 20 pages' },
    { name: 'Custom Domains', free: '0', basic: '1', pro: '3', business: 'Unlimited' },
    { name: 'Templates', free: 'Basic only', basic: '20+', pro: '50+ premium', business: 'Custom' },
    { name: 'AI Support', free: 'None', basic: 'None', pro: '10 iterations', business: 'Unlimited' },
    { name: 'Support', free: 'Community', basic: '48h email', pro: '24h priority', business: 'Dedicated' }
  ];

  const faqs = [
    {
      question: 'Can I change plans anytime?',
      answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any differences.'
    },
    {
      question: 'What happens if I exceed my download limit?',
      answer: 'You can still generate and preview websites, but downloads will be disabled until next month or you can upgrade to a higher tier for immediate access.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 14-day money-back guarantee on all paid plans. If you\'re not satisfied, contact us for a full refund.'
    }
  ];

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

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
          {pricingTiers.map((plan, index) => {
            const Icon = plan.icon;
            const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const displayPrice = billingCycle === 'yearly' && plan.id !== 'free' ? Math.round(price / 12) : price;

            return (
              <div
                key={index}
                style={{ animationDelay: `${index * 0.1}s` }}
                className={`pricing-card relative rounded-2xl p-6 animate-slide-up ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-purple-600/10 to-pink-600/10 border-2 border-purple-500/50'
                    : 'bg-gray-800/40 border border-gray-700/50'
                } backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:border-purple-500/30`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <div className={`inline-block p-2 rounded-xl bg-gradient-to-r ${plan.color} mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-xs mb-4">{plan.description}</p>
                  <div className="mb-3">
                    <span className="text-4xl font-bold">${displayPrice}</span>
                    <span className="text-gray-400 text-sm ml-1">
                      {billingCycle === 'yearly' && plan.id !== 'free' ? '/mo' : '/month'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && plan.id !== 'free' && (
                    <p className="text-xs text-green-400">
                      Save ${savings[plan.id as keyof typeof savings]}/year
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleStartPlan(plan)}
                  className={`w-full py-2.5 rounded-lg font-semibold transition-all mb-6 text-sm ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {plan.cta}
                </button>
                <div className="space-y-2">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="max-w-7xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="bg-gray-800/30 rounded-2xl p-6 backdrop-blur-sm border border-gray-700/50 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Free</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Basic</th>
                  <th className="text-center py-4 px-4 text-purple-400 font-medium">Pro</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Business</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr key={index} className="border-b border-gray-800/50">
                    <td className="py-4 px-4 text-gray-300 font-medium">{feature.name}</td>
                    <td className="text-center py-4 px-4 text-gray-400">{feature.free}</td>
                    <td className="text-center py-4 px-4 text-gray-300">{feature.basic}</td>
                    <td className="text-center py-4 px-4 text-purple-300 font-medium">{feature.pro}</td>
                    <td className="text-center py-4 px-4 text-gray-300">{feature.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-800/30 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
                <h3 className="text-lg font-semibold mb-3 text-purple-300">{faq.question}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
       
        .animate-slide-up {
          animation: slideUp 0.5s ease-out forwards;
        }
       
        .pricing-card {
          position: relative;
          transition: all 0.3s ease;
        }
       
        .pricing-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 1rem;
          background: linear-gradient(45deg, rgba(168, 85, 247, 0.3), rgba(6, 182, 212, 0.3), rgba(236, 72, 153, 0.3));
          opacity: 0;
          z-index: -1;
          transition: opacity 0.3s ease;
          filter: blur(8px);
        }
       
        .pricing-card:hover::before {
          opacity: 0.4;
        }
      `}</style>
    </div>
  );
};

export default Pricing;
