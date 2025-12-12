import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Zap, Crown, Building2 } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/forever",
      description: "Perfect for trying out Sento",
      features: [
        { text: "2 website previews per month", included: true },
        { text: "Basic templates only", included: true },
        { text: "Watermarked outputs", included: true },
        { text: "Community support", included: true },
        { text: "Download as ZIP", included: false },
        { text: "Premium templates", included: false },
        { text: "Priority support", included: false },
        { text: "Custom branding", included: false },
      ],
      cta: "Get Started",
      popular: false,
      icon: Sparkles,
      gradient: "from-gray-600 to-gray-800",
      ctaVariant: "outline" as const,
    },
    {
      name: "Basic",
      price: "$9",
      period: "/month",
      description: "For solo entrepreneurs & freelancers",
      features: [
        { text: "5 website downloads per month", included: true },
        { text: "20+ premium templates", included: true },
        { text: "No watermark", included: true },
        { text: "Email support", included: true },
        { text: "Download as ZIP", included: true },
        { text: "Basic customization", included: true },
        { text: "Priority support", included: false },
        { text: "Custom branding", included: false },
      ],
      cta: "Start Basic",
      popular: false,
      icon: Zap,
      gradient: "from-cyan-600 to-blue-600",
      ctaVariant: "default" as const,
    },
    {
      name: "Pro",
      price: "$22",
      period: "/month",
      description: "For growing agencies & teams",
      features: [
        { text: "12 website downloads per month", included: true },
        { text: "50+ premium templates", included: true },
        { text: "No watermark", included: true },
        { text: "Priority support", included: true },
        { text: "Advanced customization", included: true },
        { text: "AI chat support", included: true },
        { text: "Team collaboration (3 seats)", included: true },
        { text: "Custom branding", included: true },
      ],
      cta: "Start Pro",
      popular: true,
      icon: Crown,
      gradient: "from-purple-600 to-pink-600",
      ctaVariant: "default" as const,
    },
    {
      name: "Business",
      price: "$49",
      period: "/month",
      description: "For large agencies & enterprises",
      features: [
        { text: "40 website downloads per month", included: true },
        { text: "Custom templates library", included: true },
        { text: "White-label solution", included: true },
        { text: "Dedicated support", included: true },
        { text: "API access", included: true },
        { text: "Unlimited team seats", included: true },
        { text: "Custom integrations", included: true },
        { text: "SLA guarantee", included: true },
      ],
      cta: "Contact Sales",
      popular: false,
      icon: Building2,
      gradient: "from-orange-600 to-red-600",
      ctaVariant: "default" as const,
    },
  ];

  const handlePlanClick = (plan: typeof plans[0]) => {
    if (plan.name === "Free") {
      window.location.href = '/#/signup';
    } else if (plan.name === "Business") {
      window.location.href = 'mailto:sales@sento.ai';
    } else {
      window.location.href = '/#/signup';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Zap className="w-4 h-4" />
            Simple, Transparent Pricing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include core features. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`
                  relative bg-white rounded-2xl p-6 border-2 
                  ${plan.popular ? 'border-purple-500 shadow-2xl scale-105' : 'border-gray-200 shadow-lg'}
                  transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:scale-105
                  animate-fade-in-up
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-6">
                  <div className={`w-12 h-12 bg-gradient-to-r ${plan.gradient} rounded-xl flex items-center justify-center mx-auto mb-4 transform transition-transform duration-300 hover:scale-110 hover:rotate-6`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handlePlanClick(plan)}
                  className={`
                    w-full mb-6 transition-all duration-300 hover:scale-105 active:scale-95
                    ${plan.popular 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg' 
                      : plan.ctaVariant === 'outline'
                      ? 'border-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white'
                      : `bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white`
                    }
                  `}
                >
                  {plan.cta}
                </Button>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="max-w-7xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Compare All Features</h2>
            <p className="text-gray-600">See exactly what's included in each plan</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
              <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Feature</th>
                  <th className="px-6 py-4 text-center">Free</th>
                  <th className="px-6 py-4 text-center">Basic</th>
                  <th className="px-6 py-4 text-center">Pro</th>
                  <th className="px-6 py-4 text-center">Business</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-purple-50 transition-colors">
                  <td className="px-6 py-4 font-medium">Website Generations</td>
                  <td className="px-6 py-4 text-center">2/month</td>
                  <td className="px-6 py-4 text-center">5/month</td>
                  <td className="px-6 py-4 text-center">12/month</td>
                  <td className="px-6 py-4 text-center">40/month</td>
                </tr>
                <tr className="hover:bg-purple-50 transition-colors">
                  <td className="px-6 py-4 font-medium">Templates Access</td>
                  <td className="px-6 py-4 text-center">Basic</td>
                  <td className="px-6 py-4 text-center">20+ Premium</td>
                  <td className="px-6 py-4 text-center">50+ Premium</td>
                  <td className="px-6 py-4 text-center">Custom Library</td>
                </tr>
                <tr className="hover:bg-purple-50 transition-colors">
                  <td className="px-6 py-4 font-medium">Watermark</td>
                  <td className="px-6 py-4 text-center">
                    <X className="w-5 h-5 text-red-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="hover:bg-purple-50 transition-colors">
                  <td className="px-6 py-4 font-medium">Support</td>
                  <td className="px-6 py-4 text-center">Community</td>
                  <td className="px-6 py-4 text-center">Email</td>
                  <td className="px-6 py-4 text-center">Priority + AI Chat</td>
                  <td className="px-6 py-4 text-center">Dedicated</td>
                </tr>
                <tr className="hover:bg-purple-50 transition-colors">
                  <td className="px-6 py-4 font-medium">Team Seats</td>
                  <td className="px-6 py-4 text-center">1</td>
                  <td className="px-6 py-4 text-center">1</td>
                  <td className="px-6 py-4 text-center">3</td>
                  <td className="px-6 py-4 text-center">Unlimited</td>
                </tr>
                <tr className="hover:bg-purple-50 transition-colors">
                  <td className="px-6 py-4 font-medium">API Access</td>
                  <td className="px-6 py-4 text-center">
                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600">Got questions? We've got answers</p>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Can I change plans later?</h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. All payments are processed securely through Stripe.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Is there a free trial?</h3>
              <p className="text-gray-600">
                Our Free plan lets you try Sento with 2 website previews per month. No credit card required. Upgrade anytime for more features.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Build Your Dream Website?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Start free today. No credit card required.
            </p>
            <Button
              size="lg"
              onClick={() => window.location.href = '/#/signup'}
              className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg font-bold shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started Free
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default Pricing;
