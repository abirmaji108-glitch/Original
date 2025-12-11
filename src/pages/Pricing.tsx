import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Crown, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TIER_LIMITS } from '@/config/tiers';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      yearlyPrice: 0,
      icon: Sparkles,
      color: 'from-gray-400 to-gray-600',
      features: TIER_LIMITS.free.features,
      cta: 'Current Plan',
      popular: false,
      stripePriceId: null,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29,
      yearlyPrice: 290, // ~$24/month when billed yearly
      icon: Crown,
      color: 'from-yellow-400 to-orange-500',
      features: TIER_LIMITS.pro.features,
      cta: 'Upgrade to Pro',
      popular: true,
      stripePriceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      yearlyPrice: 990, // ~$82/month when billed yearly
      icon: Zap,
      color: 'from-purple-500 to-pink-500',
      features: TIER_LIMITS.enterprise.features,
      cta: 'Contact Sales',
      popular: false,
      stripePriceId: import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID,
    },
  ];

  const handleCheckout = async (planId: string, stripePriceId: string | null) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to upgrade your plan',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (planId === 'free') {
      toast({
        title: 'Already on Free Plan',
        description: "You're currently on the free plan",
      });
      return;
    }

    if (planId === 'enterprise') {
      // Open email for enterprise sales
      window.location.href = 'mailto:sales@sento.ai?subject=Enterprise Plan Inquiry';
      return;
    }

    if (!stripePriceId) {
      toast({
        title: 'Configuration Error',
        description: 'Stripe price ID not configured. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingPlan(planId);

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      // Create checkout session
      const response = await fetch('https://original-lbxv.onrender.com/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: stripePriceId,
          userId: user.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Failed',
        description: error instanceof Error ? error.message : 'Unable to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const getPrice = (plan: typeof plans[0]) => {
    if (billingCycle === 'yearly') {
      return plan.yearlyPrice;
    }
    return plan.price;
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (billingCycle === 'yearly' && plan.price > 0) {
      const monthlyCost = plan.price * 12;
      const yearlyCost = plan.yearlyPrice;
      const savings = monthlyCost - yearlyCost;
      return savings;
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-60 left-1/3 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/app')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to App
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-white">Sento</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Start free, upgrade when you need more power. Cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-sm font-semibold ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-400'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative w-14 h-7 bg-white/20 rounded-full transition-all duration-300 hover:bg-white/30"
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-transform duration-300 ${
                    billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm font-semibold ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-400'}`}>
                Yearly
              </span>
              {billingCycle === 'yearly' && (
                <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-semibold animate-pulse">
                  Save up to 20%
                </span>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const price = getPrice(plan);
              const savings = getSavings(plan);

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl backdrop-blur-sm transition-all duration-500 hover:scale-105 ${
                    plan.popular
                      ? 'bg-white/10 border-2 border-yellow-400 shadow-2xl shadow-yellow-400/20'
                      : 'bg-white/5 border border-white/10'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg">
                      🔥 Most Popular
                    </div>
                  )}

                  <div className="p-8">
                    {/* Icon & Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${plan.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-white">${price}</span>
                        {plan.price > 0 && (
                          <span className="text-gray-400">
                            /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        )}
                      </div>
                      {billingCycle === 'yearly' && plan.price > 0 && (
                        <p className="text-sm text-green-400 mt-1">
                          💰 Save ${savings}/year
                        </p>
                      )}
                      {billingCycle === 'yearly' && plan.price > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          ${Math.round(price / 12)}/month when billed annually
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleCheckout(plan.id, plan.stripePriceId)}
                      disabled={loadingPlan === plan.id}
                      className={`w-full h-12 font-bold transition-all duration-300 ${
                        plan.popular
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                      }`}
                    >
                      {loadingPlan === plan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        plan.cta
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature Comparison Table */}
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              Compare All Features
            </h2>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-white font-semibold">Feature</th>
                    <th className="px-6 py-4 text-center text-white font-semibold">Free</th>
                    <th className="px-6 py-4 text-center text-white font-semibold bg-yellow-400/10">Pro</th>
                    <th className="px-6 py-4 text-center text-white font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr>
                    <td className="px-6 py-4 text-gray-300">Generations per day</td>
                    <td className="px-6 py-4 text-center text-gray-400">5</td>
                    <td className="px-6 py-4 text-center text-green-400 bg-yellow-400/5">Unlimited</td>
                    <td className="px-6 py-4 text-center text-green-400">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-300">Projects</td>
                    <td className="px-6 py-4 text-center text-gray-400">3</td>
                    <td className="px-6 py-4 text-center text-green-400 bg-yellow-400/5">Unlimited</td>
                    <td className="px-6 py-4 text-center text-green-400">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-300">Templates</td>
                    <td className="px-6 py-4 text-center text-gray-400">Basic</td>
                    <td className="px-6 py-4 text-center text-green-400 bg-yellow-400/5">Premium</td>
                    <td className="px-6 py-4 text-center text-green-400">Custom</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-300">Priority Support</td>
                    <td className="px-6 py-4 text-center text-red-400">✗</td>
                    <td className="px-6 py-4 text-center text-green-400 bg-yellow-400/5">✓</td>
                    <td className="px-6 py-4 text-center text-green-400">✓</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-300">Export Options</td>
                    <td className="px-6 py-4 text-center text-gray-400">Basic</td>
                    <td className="px-6 py-4 text-center text-green-400 bg-yellow-400/5">Advanced</td>
                    <td className="px-6 py-4 text-center text-green-400">Full</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-300">White Label</td>
                    <td className="px-6 py-4 text-center text-red-400">✗</td>
                    <td className="px-6 py-4 text-center text-red-400 bg-yellow-400/5">✗</td>
                    <td className="px-6 py-4 text-center text-green-400">✓</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-300">API Access</td>
                    <td className="px-6 py-4 text-center text-red-400">✗</td>
                    <td className="px-6 py-4 text-center text-red-400 bg-yellow-400/5">✗</td>
                    <td className="px-6 py-4 text-center text-green-400">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mt-16">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Can I change my plan later?',
                  a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.',
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'We accept all major credit cards, debit cards, and digital wallets through Stripe.',
                },
                {
                  q: 'Is there a free trial?',
                  a: 'The Free plan is available forever with 5 generations per day. No credit card required.',
                },
                {
                  q: 'Can I cancel anytime?',
                  a: 'Absolutely! Cancel anytime from your account settings. No questions asked.',
                },
              ].map((faq, i) => (
                <div
                  key={i}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
                >
                  <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
                  <p className="text-gray-400">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-4">
                Still have questions?
              </h2>
              <p className="text-gray-300 mb-6">
                Our team is here to help you choose the right plan for your needs.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => window.location.href = 'mailto:support@sento.ai'}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                >
                  Contact Support
                </Button>
                <Button
                  onClick={() => navigate('/app')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                >
                  Start Building Free
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Pricing;
