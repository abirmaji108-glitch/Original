import React, { useState } from 'react';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null); // Track which plan is loading
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricingTiers = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for trying out Sento',
      price: { monthly: 0, yearly: 0 },
      icon: Sparkles,
      features: [
        '2 website generations (lifetime)',
        'Landing pages (1-3 sections)',
        '20 basic templates',
        'Preview only (no downloads)',
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
        '10 generations & 10 downloads per month',
        'Landing pages (1-3 sections)',
        'Remove watermark',
        'HTML/CSS export',
        '35 templates (20 basic + 15 premium)',
        'Unlimited saved projects'
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
        '25 generations & 20 downloads per month',
        'Multi-page websites (up to 8 pages)',
        'Remove watermark',
        'HTML/CSS/React export',
        'All 50 templates',
        'Unlimited saved projects'
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
        '100 generations & 40 downloads per month',
        'Complex websites (up to 20 pages)',
        'Remove watermark',
        'All export formats',
        'All 50 templates',
        'Unlimited saved projects',
        'Priority generation queue'
      ],
      cta: 'Contact Sales',
      highlighted: false,
      color: 'from-orange-500 to-orange-600'
    }
  ];
  const handleStartPlan = async (plan: typeof pricingTiers[0]) => {
    // Prevent double-clicks
    if (loadingPlan) {
      return; // Already processing a payment
    }
    // Validate user and user.id exist
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
    // Set loading state
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
        navigate('/app'); // Changed from /dashboard to /app
      } catch (error) {
        console.error('Error updating tier:', error);
        toast({
          title: "Update Failed",
          description: "Failed to update plan. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoadingPlan(null); // Reset loading state
      }
      return;
    }
    // Business plan - contact sales
    if (plan.id === 'business') {
      window.location.href = 'mailto:sales@sento.ai?subject=Business Plan Inquiry';
      setLoadingPlan(null);
      return;
    }
    // Paid plans (Basic & Pro) - redirect to Stripe checkout
    if (plan.stripeLink) {
      try {
        // Determine correct price ID based on billing cycle and plan
        let priceId;
        // Add support for Business plan
        if (billingCycle === 'monthly') {
          // Monthly pricing
          if (plan.id === 'basic') {
            priceId = import.meta.env.VITE_STRIPE_BASIC_PRICE_ID;
          } else if (plan.id === 'pro') {
            priceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
          } else if (plan.id === 'business') {
            priceId = import.meta.env.VITE_STRIPE_BUSINESS_PRICE_ID;
          }
        } else {
          // Yearly pricing
          if (plan.id === 'basic') {
            priceId = import.meta.env.VITE_STRIPE_BASIC_YEARLY_PRICE_ID;
          } else if (plan.id === 'pro') {
            priceId = import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID;
          } else if (plan.id === 'business') {
            priceId = import.meta.env.VITE_STRIPE_BUSINESS_YEARLY_PRICE_ID;
          }
        }
        if (!priceId) {
          throw new Error(`Stripe price ID not configured for ${plan.id} ${billingCycle}`);
        }
        console.log(`💳 Starting checkout: ${plan.name} (${billingCycle}) - Price ID: ${priceId}`);
        // Never fallback to localhost in production
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        if (!backendUrl) {
          console.error('❌ VITE_BACKEND_URL not configured!');
          toast({
            title: "Configuration Error",
            description: "Payment system configuration error. Please contact support.",
            variant: "destructive"
          });
          setLoadingPlan(null); // ← ADD THIS LINE
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
    tier: plan.id, // backend expects "tier"
    interval: billingCycle, // backend expects "interval"
  }),
});
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }
        // Better validation and error messages
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
        setLoadingPlan(null); // Reset loading state
      }
    }
    // Reset loading state if we didn't redirect
    setLoadingPlan(null);
  };
  const savings = {
    basic: 9 * 12 - 89,
    pro: 22 * 12 - 219,
    business: 49 * 12 - 489
  };
  const comparisonFeatures = [
    { name: 'Monthly Generations', free: '2 lifetime', basic: '10', pro: '25', business: '100' },
    { name: 'Monthly Downloads', free: '0', basic: '10', pro: '20', business: '40' },
    { name: 'Website Complexity', free: '3-5 sections', basic: '1-3 sections', pro: 'Up to 8 pages', business: 'Up to 20 pages' },
    { name: 'Custom Domains', free: '0', basic: '1', pro: '3', business: 'Unlimited' },
    { name: 'Templates', free: '20 basic', basic: '35 (20+15)', pro: 'All 50', business: 'All 50' }
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
                  disabled={loadingPlan !== null} // Disable all buttons while loading
                  className={`w-full py-2.5 rounded-lg font-semibold transition-all mb-6 text-sm ${
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
