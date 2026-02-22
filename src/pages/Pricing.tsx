import React, { useState, useEffect } from 'react';
import { Check, Sparkles, Zap, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

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
      popular: false,
      color: 'from-gray-400 to-gray-500',
      glowColor: 'rgba(156,163,175,0.15)',
      badgeColor: '',
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
      popular: false,
      color: 'from-cyan-400 to-blue-500',
      glowColor: 'rgba(6,182,212,0.2)',
      badgeColor: '',
      stripeLink: true
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Most popular — for growing businesses',
      price: { monthly: 10, yearly: 99 },
      icon: Star,
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
      color: 'from-violet-500 to-purple-600',
      glowColor: 'rgba(139,92,246,0.35)',
      badgeColor: 'from-violet-500 to-purple-500',
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
      popular: false,
      color: 'from-pink-500 to-rose-500',
      glowColor: 'rgba(236,72,153,0.2)',
      badgeColor: '',
      stripeLink: true
    }
  ];

  const handleStartPlan = async (plan: typeof pricingTiers[0]) => {
    if (loadingPlan) return;
    if (!user) { navigate('/signup'); return; }
    if (!user.id) {
      toast({ title: "Authentication Error", description: "User session is invalid. Please log in again.", variant: "destructive" });
      navigate('/login');
      return;
    }
    setLoadingPlan(plan.id);
    if (plan.id === 'free') {
      try {
        const { error } = await supabase.from('profiles').update({ user_tier: 'free' }).eq('id', user.id);
        if (error) throw error;
        toast({ title: "Welcome to Free Plan!", description: "You're all set to start creating." });
        navigate('/app');
      } catch (error) {
        toast({ title: "Update Failed", description: "Failed to update plan. Please try again.", variant: "destructive" });
      } finally {
        setLoadingPlan(null);
      }
      return;
    }
    if (plan.stripeLink) {
      try {
        let priceId;
        if (plan.id === 'starter') priceId = import.meta.env.VITE_STRIPE_STARTER_PRICE_ID;
        else if (plan.id === 'basic') priceId = import.meta.env.VITE_STRIPE_BASIC_PRICE_ID;
        else if (plan.id === 'pro') priceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
        if (!priceId) throw new Error(`Stripe price ID not configured for ${plan.id}`);
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        if (!backendUrl) {
          toast({ title: "Configuration Error", description: "Payment system configuration error. Please contact support.", variant: "destructive" });
          setLoadingPlan(null);
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Authentication token missing. Please log in again.");
        const response = await fetch(`${backendUrl}/api/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ tier: plan.id, interval: billingCycle }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');
        const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!stripePublishableKey) throw new Error('Stripe publishable key not configured.');
        if (!(window as any).Stripe) throw new Error('Stripe.js failed to load.');
        const stripe = (window as any).Stripe(stripePublishableKey);
        if (!stripe) throw new Error('Failed to initialize Stripe.');
        const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (error) throw error;
      } catch (error: any) {
        console.error('Stripe checkout error:', error);
        toast({ title: "Checkout Failed", description: error.message || "Payment initialization failed.", variant: "destructive" });
        setLoadingPlan(null);
      }
    }
  };

  const savings = { starter: 5 * 12 - 49, basic: 10 * 12 - 99, pro: 25 * 12 - 249 };

  const comparisonFeatures = [
    { name: 'Credits', free: '20 lifetime', starter: '60/mo', basic: '130/mo', pro: '400/mo' },
    { name: 'Page Generations', free: '2', starter: '6', basic: '13', pro: '40' },
    { name: 'AI Edits', free: '0', starter: '20', basic: '43', pro: '133' },
    { name: 'Published Pages', free: 'Preview only', starter: '3', basic: 'Unlimited', pro: 'Unlimited' },
    { name: 'Custom Domains', free: '0', starter: '0', basic: '1', pro: '5' }
  ];

  const faqs = [
    { question: 'Can I change plans anytime?', answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences." },
    { question: 'What happens when I run out of credits?', answer: "You can still view your existing pages, but generating or editing will be paused until you upgrade or your credits reset next month." },
    { question: 'Do you offer refunds?', answer: "Yes, we offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund." }
  ];

  return (
    <div className="min-h-screen bg-[#09090f] text-white overflow-hidden">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] rounded-full bg-pink-600/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-cyan-600/6 blur-[80px]" />
      </div>

      <div className="relative container mx-auto px-6 py-20">

        {/* Header */}
        <div
          className="text-center mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="w-3 h-3" />
            Simple, transparent pricing
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-5 tracking-tight">
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
              Pay for what
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              you actually use
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
            Start free, upgrade when you're ready. Credits roll over your workflow — generate pages, run AI edits, all from one balance.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full p-1 backdrop-blur-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-xs bg-gradient-to-r from-green-400 to-emerald-400 text-black px-2 py-0.5 rounded-full font-semibold">
                Save up to $51
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-5 max-w-7xl mx-auto mb-24">
          {pricingTiers.map((plan, index) => {
            const Icon = plan.icon;
            const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const displayPrice = billingCycle === 'yearly' && plan.id !== 'free' ? Math.round(price / 12) : price;

            return (
              <div
                key={plan.id}
                className={`pricing-card relative rounded-2xl p-6 border transition-all duration-500 ${
                  plan.highlighted
                    ? 'border-violet-500/60 bg-gradient-to-b from-violet-950/80 to-purple-950/60'
                    : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible
                    ? plan.highlighted ? 'translateY(-8px) scale(1.03)' : 'translateY(0)'
                    : 'translateY(32px)',
                  transition: `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s, box-shadow 0.3s ease, border-color 0.3s ease`,
                  boxShadow: plan.highlighted
                    ? `0 0 40px ${plan.glowColor}, 0 20px 60px rgba(0,0,0,0.4)`
                    : `0 4px 24px rgba(0,0,0,0.2)`,
                }}
              >
                {/* Glow border effect on highlighted */}
                {plan.highlighted && (
                  <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 rounded-2xl border border-violet-400/40 animate-pulse-slow" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />
                  </div>
                )}

                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className={`bg-gradient-to-r ${plan.badgeColor} text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30`}>
                      <Star className="w-3 h-3 fill-white" />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Icon + Name */}
                <div className="mb-5">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} mb-4 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-5xl font-bold tracking-tight text-white">${displayPrice}</span>
                    <span className="text-gray-500 text-sm pb-2">
                      {plan.id !== 'free' ? (billingCycle === 'yearly' ? '/mo' : '/month') : ''}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && plan.id !== 'free' && (
                    <p className="text-xs text-emerald-400 font-medium">
                      ✓ Save ${savings[plan.id as keyof typeof savings]} per year
                    </p>
                  )}
                  {plan.id !== 'free' && billingCycle === 'monthly' && (
                    <p className="text-xs text-gray-600">billed monthly</p>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleStartPlan(plan)}
                  disabled={loadingPlan !== null}
                  className={`cta-btn w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 mb-6 relative overflow-hidden ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:from-violet-400 hover:to-purple-500'
                      : 'bg-white/8 text-gray-200 border border-white/10 hover:bg-white/15 hover:border-white/20'
                  } ${loadingPlan !== null ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                  {loadingPlan === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : plan.cta}
                </button>

                {/* Features */}
                <div className="space-y-2.5">
                  {plan.features.map((feature, fi) => (
                    <div key={fi} className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                        plan.highlighted ? 'bg-violet-500/20' : 'bg-white/5'
                      }`}>
                        <Check className={`w-2.5 h-2.5 ${plan.highlighted ? 'text-violet-300' : 'text-gray-400'}`} />
                      </div>
                      <span className={`text-xs leading-relaxed ${plan.highlighted ? 'text-gray-200' : 'text-gray-400'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div
          className="max-w-5xl mx-auto mb-24"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.5s',
          }}
        >
          <h2 className="text-3xl font-bold text-center mb-3 text-white">Compare Plans</h2>
          <p className="text-center text-gray-500 text-sm mb-8">See exactly what you get at each tier</p>
          <div className="rounded-2xl border border-white/8 overflow-hidden backdrop-blur-sm bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.03]">
                  <th className="text-left py-4 px-5 text-gray-400 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-gray-500 font-medium">Free</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-medium">Starter</th>
                  <th className="text-center py-4 px-4 text-violet-300 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      Basic <Star className="w-3 h-3 fill-violet-300" />
                    </span>
                  </th>
                  <th className="text-center py-4 px-4 text-pink-400 font-medium">Pro</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr
                    key={index}
                    className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-4 px-5 text-gray-300 font-medium">{feature.name}</td>
                    <td className="text-center py-4 px-4 text-gray-500">{feature.free}</td>
                    <td className="text-center py-4 px-4 text-cyan-300/80">{feature.starter}</td>
                    <td className="text-center py-4 px-4 text-violet-300 font-semibold">{feature.basic}</td>
                    <td className="text-center py-4 px-4 text-pink-300/80">{feature.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div
          className="max-w-2xl mx-auto"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.7s',
          }}
        >
          <h2 className="text-3xl font-bold text-center mb-3 text-white">Questions?</h2>
          <p className="text-center text-gray-500 text-sm mb-8">Everything you need to know</p>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/8 bg-white/[0.03] p-5 backdrop-blur-sm hover:border-white/15 transition-all duration-300"
              >
                <h3 className="text-sm font-semibold mb-2 text-white">{faq.question}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .pricing-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35) !important;
        }
        .pricing-card:hover .cta-btn {
          filter: brightness(1.05);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Pricing;
