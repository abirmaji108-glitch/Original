import React, { useState } from 'react';
import { Check, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricingTiers = [
    {
      id: 'free',
      name: 'Free',
      description: 'Try Sento AI — no card required',
      price: { monthly: 0, yearly: 0 },
      icon: Sparkles,
      features: [
        '20 credits (lifetime)',
        '2 page generations',
        'Preview only — no publishing',
        'Basic templates',
        'Community support'
      ],
      cta: 'Get Started',
      highlighted: false,
      color: 'from-gray-400 to-gray-600'
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for freelancers and side projects',
      price: { monthly: 5, yearly: 49 },
      icon: Zap,
      features: [
        '60 credits/month',
        '6 generations or 20 edits',
        'Publish up to 3 live pages',
        'Basic analytics',
        'Remove Sento badge',
        'Email support'
      ],
      cta: 'Start Starter',
      highlighted: false,
      color: 'from-cyan-500 to-blue-500',
      stripeLink: true
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Most popular — for growing businesses',
      price: { monthly: 10, yearly: 99 },
      icon: Zap,
      features: [
        '130 credits/month',
        '13 generations or 43 edits',
        'Unlimited published pages',
        '1 custom domain',
        'Full analytics (30 days)',
        'Export HTML code',
        'Priority email support'
      ],
      cta: 'Start Basic',
      highlighted: true,
      popular: true,
      color: 'from-blue-500 to-violet-500',
      stripeLink: true
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For agencies and power users',
      price: { monthly: 25, yearly: 249 },
      icon: Zap,
      features: [
        '400 credits/month',
        '40 generations or 133 edits',
        'Everything in Basic',
        '5 custom domains',
        'Advanced analytics (90 days)',
        'White-label option',
        'API access',
        'Priority phone support'
      ],
      cta: 'Start Pro',
      highlighted: false,
      color: 'from-purple-500 to-pink-500',
      stripeLink: true
    }
  ];
  const handleStartPlan = async (plan: typeof pricingTiers[0]) => {
    if (loadingPlan) {
      return;
    }
    if (!user) {
      navigate('/signup');
      return;
    }
    if (!user.id) {
      toast({
        title: "Authentication Error",
        description: "User session is invalid. Please log in again.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    setLoadingPlan(plan.id);
    // Free plan - just update tier in database
    if (plan.id === 'free') {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ user_tier: 'free' })
          .eq('id', user.id);
        if (error) throw error;
        toast({
          title: "Welcome to Free Plan!",
          description: "You're all set to start creating.",
        });
        navigate('/app');
      } catch (error) {
        console.error('Error updating tier:', error);
        toast({
          title: "Update Failed",
          description: "Failed to update plan. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoadingPlan(null);
      }
      return;
    }
    // Paid plans (Starter, Basic, Pro) - redirect to Stripe checkout
    if (plan.stripeLink) {
      try {
        let priceId;
        if (plan.id === 'starter') {
          priceId = import.meta.env.VITE_STRIPE_STARTER_PRICE_ID;
        } else if (plan.id === 'basic') {
          priceId = import.meta.env.VITE_STRIPE_BASIC_PRICE_ID;
        } else if (plan.id === 'pro') {
          priceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
        }
        if (!priceId) {
          throw new Error(`Stripe price ID not configured for ${plan.id}`);
        }
        console.log(`💳 Starting checkout: ${plan.name} - Price ID: ${priceId}`);
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        if (!backendUrl) {
          console.error('❌ VITE_BACKEND_URL not configured!');
          toast({
            title: "Configuration Error",
            description: "Payment system configuration error. Please contact support.",
            variant: "destructive"
          });
          setLoadingPlan(null);
          return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("Authentication token missing. Please log in again.");
        }
        const response = await fetch(`${backendUrl}/api/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tier: plan.id,
            interval: billingCycle,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }
        const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!stripePublishableKey) {
          throw new Error('Stripe publishable key not configured. Please contact support.');
        }
        if (!(window as any).Stripe) {
          throw new Error('Stripe.js failed to load. Please check your internet connection and try again.');
        }
        const stripe = (window as any).Stripe(stripePublishableKey);
        if (!stripe) {
          throw new Error('Failed to initialize Stripe. Please refresh the page and try again.');
        }
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (error) {
          throw error;
        }
      } catch (error: any) {
        console.error('Stripe checkout error:', error);
        toast({
          title: "Checkout Failed",
          description: error.message || "Please try again or contact support.",
          variant: "destructive"
        });
        setLoadingPlan(null);
      }
    }
    setLoadingPlan(null);
  };
  const savings = {
    starter: 5 * 12 - 49,
    basic: 10 * 12 - 99,
    pro: 25 * 12 - 249
  };
  const comparisonFeatures = [
    { name: 'Credits', free: '20 lifetime', starter: '60/mo', basic: '130/mo', pro: '400/mo' },
    { name: 'Page Generations', free: '2', starter: '6', basic: '13', pro: '40' },
    { name: 'AI Edits', free: '0', starter: '20', basic: '43', pro: '133' },
    { name: 'Published Pages', free: 'Preview only', starter: '3', basic: 'Unlimited', pro: 'Unlimited' },
    { name: 'Custom Domains', free: '0', starter: '0', basic: '1', pro: '5' }
  ];
  const faqs = [
    {
      question: 'Can I change plans anytime?',
      answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any differences.'
    },
    {
      question: 'What happens when I run out of credits?',
      answer: 'You can still view your existing pages, but generating or editing will be paused until you upgrade or your credits reset next month.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 14-day money-back guarantee on all paid plans. If you\'re not satisfied, contact us for a full refund.'
    }
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16 pricing-hero">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Pay for what</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">you actually use</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Start free, upgrade when you're ready. Credits power everything — generate pages, run AI edits, all from one balance.
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
                Save up to $51
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
                className={`pricing-card ${plan.highlighted ? 'highlighted-card' : ''} relative rounded-2xl p-6 animate-slide-up ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-purple-600/10 to-pink-600/10 border-2 border-purple-500/50'
                    : 'bg-gray-800/40 border border-gray-700/50'
                } backdrop-blur-sm transition-all duration-300 hover:border-purple-500/30`}
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
                      {plan.id === 'free' ? '' : billingCycle === 'yearly' ? '/mo' : '/month'}
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
                  disabled={loadingPlan !== null}
                  className={`plan-btn w-full py-2.5 rounded-lg font-semibold transition-all mb-6 text-sm ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  } ${loadingPlan !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loadingPlan === plan.id ? 'Processing...' : plan.cta}
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
        <div className="max-w-7xl mx-auto mb-20 compare-section">
          <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="bg-gray-800/30 rounded-2xl p-6 backdrop-blur-sm border border-gray-700/50 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Free</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-medium">Starter</th>
                  <th className="text-center py-4 px-4 text-blue-400 font-medium">Basic</th>
                  <th className="text-center py-4 px-4 text-purple-400 font-medium">Pro ⭐</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr key={index} className="border-b border-gray-800/50">
                    <td className="py-4 px-4 text-gray-300 font-medium">{feature.name}</td>
                    <td className="text-center py-4 px-4 text-gray-400">{feature.free}</td>
                    <td className="text-center py-4 px-4 text-cyan-300">{feature.starter}</td>
                    <td className="text-center py-4 px-4 text-blue-300">{feature.basic}</td>
                    <td className="text-center py-4 px-4 text-purple-300 font-medium">{feature.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto faq-section">
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
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.25), 0 0 40px rgba(139, 92, 246, 0.1); }
          50% { box-shadow: 0 0 35px rgba(139, 92, 246, 0.5), 0 0 70px rgba(139, 92, 246, 0.25); }
        }

        .animate-slide-up {
          opacity: 0;
          animation: slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .pricing-hero {
          animation: fadeIn 0.65s ease-out both;
        }

        .pricing-card {
          position: relative;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .pricing-card:hover {
          transform: translateY(-6px) scale(1.02);
        }

        .highlighted-card {
          animation: glowPulse 3s ease-in-out infinite;
        }

        .highlighted-card:hover {
          transform: translateY(-8px) scale(1.03) !important;
          animation: none;
          box-shadow: 0 0 45px rgba(139, 92, 246, 0.55), 0 24px 60px rgba(0,0,0,0.4) !important;
        }

        .pricing-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 1rem;
          background: linear-gradient(45deg, rgba(168, 85, 247, 0.3), rgba(6, 182, 212, 0.3), rgba(236, 72, 153, 0.3));
          opacity: 0;
          z-index: -1;
          transition: opacity 0.35s ease;
          filter: blur(10px);
        }

        .pricing-card:hover::before {
          opacity: 0.5;
        }

        .compare-section {
          animation: fadeIn 0.6s ease-out 0.45s both;
        }

        .faq-section {
          animation: fadeIn 0.6s ease-out 0.65s both;
        }

        .plan-btn {
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .plan-btn:hover:not(:disabled) {
          transform: scale(1.02);
          filter: brightness(1.08);
        }
        .plan-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
      `}</style>
    </div>
  );
};
export default Pricing;
