// src/components/EnhancedUpgradeModal.tsx
import { Crown, Zap, Star, X } from 'lucide-react';

interface EnhancedUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: string;
  generationsUsed: number;
  generationsLimit: number;
}

export function EnhancedUpgradeModal({ 
  open, 
  onOpenChange,
  currentTier,
  generationsUsed,
  generationsLimit
}: EnhancedUpgradeModalProps) {
  if (!open) return null;

  const plans = [
    {
      name: 'Basic',
      price: '$9',
      period: '/month',
      generations: '5 generations/month',
      features: [
        '5 website generations per month',
        'All templates included',
        'Basic customization',
        'Export as HTML/CSS'
      ],
      highlight: currentTier === 'free'
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/month',
      generations: '12 generations/month',
      features: [
        '12 website generations per month',
        'All templates + Premium designs',
        'Advanced customization',
        'Priority generation speed',
        'Remove watermark'
      ],
      highlight: true,
      popular: true
    },
    {
      name: 'Business',
      price: '$39',
      period: '/month',
      generations: '40 generations/month',
      features: [
        '40 website generations per month',
        'Everything in Pro',
        'White-label options',
        'Custom branding',
        'Priority support'
      ],
      highlight: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white p-6">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <Crown className="w-12 h-12 mx-auto mb-3 animate-bounce" />
            <h2 className="text-2xl font-bold mb-2">
              Generation Limit Reached
            </h2>
            <p className="text-white/90">
              You've used {generationsUsed}/{generationsLimit} generations this month. 
              Upgrade to continue creating amazing websites!
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="p-6 grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`
                relative border-2 rounded-xl p-5 transition-all duration-200
                ${plan.highlight 
                  ? 'border-orange-500 shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-orange-300'
                }
              `}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 text-sm">
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {plan.generations}
                </p>
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Zap className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/pricing"
                className={`
                  block w-full py-2.5 rounded-lg font-semibold text-center transition-all duration-200
                  ${plan.highlight
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 shadow-md'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }
                `}
              >
                Choose {plan.name}
              </a>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span>Instant activation</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span>No hidden fees</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
