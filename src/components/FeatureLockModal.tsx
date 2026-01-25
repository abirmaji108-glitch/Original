// src/components/FeatureLockModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Star, CheckCircle2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'download' | 'template' | 'character-limit' | 'generation-limit';
  currentTier: string;
}

const FEATURE_CONTENT = {
  'download': {
    icon: '📥',
    title: 'Download Websites',
    description: 'Download your generated websites as ZIP files with all assets included.',
    lockedMessage: 'Downloading websites is a premium feature',
    benefits: [
      'Download complete HTML, CSS, and JS files',
      'Get organized ZIP packages',
      'Export unlimited websites',
      'Professional project structure'
    ]
  },
  'template': {
    icon: '🎨',
    title: 'Premium Templates',
    description: 'Access 50+ professionally designed templates for any industry.',
    lockedMessage: 'This template is available on paid plans',
    benefits: [
      '50+ premium templates',
      'Industry-specific designs',
      'Advanced layouts',
      'Regular template updates'
    ]
  },
  'character-limit': {
    icon: '✍️',
    title: 'Extended Prompts',
    description: 'Write longer, more detailed descriptions for better results.',
    lockedMessage: 'You\'ve reached the character limit for free tier',
    benefits: [
      'Basic: 2,000 characters',
      'Pro: 5,000 characters',
      'Business: 10,000 characters',
      'More details = better websites'
    ]
  },
  'generation-limit': {
    icon: '⚡',
    title: 'More Generations',
    description: 'Create more websites every month without limits.',
    lockedMessage: 'You\'ve used all your free generations this month',
    benefits: [
      'Basic: 10 generations/month',  // ✅ FIXED
      'Pro: 25 generations/month',    // ✅ FIXED
      'Business: 100 generations/month',  // ✅ FIXED
      'Never run out of creativity'
    ]
  }
};

const TIER_PRICING = {
  'free': {
    upgrade: 'basic',
    price: '$9',
    period: 'month'
  },
  'basic': {
    upgrade: 'pro',
    price: '$22',  // ✅ FIXED
    period: 'month'
  },
  'pro': {
    upgrade: 'business',
    price: '$49',
    period: 'month'
  }
};

export function FeatureLockModal({ isOpen, onClose, feature, currentTier }: FeatureLockModalProps) {
  const navigate = useNavigate();
  const content = FEATURE_CONTENT[feature];
  const pricing = TIER_PRICING[currentTier as keyof typeof TIER_PRICING];

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-2 border-purple-200 dark:border-purple-800">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader className="space-y-4">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-4xl shadow-lg animate-bounce">
            {content.icon}
          </div>

          {/* Title */}
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            <Crown className="w-6 h-6 inline-block mr-2 text-yellow-500" />
            {content.title}
          </DialogTitle>

          {/* Description */}
          <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        {/* Locked Message */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
          <p className="text-sm text-red-800 dark:text-red-200 font-semibold text-center">
            🔒 {content.lockedMessage}
          </p>
        </div>

        {/* Benefits List */}
        <div className="space-y-3 my-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            ✨ Unlock with upgrade:
          </p>
          {content.benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Upgrade CTA */}
        <div className="space-y-3 mt-6">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-6 text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Crown className="w-5 h-5 mr-2" />
            Upgrade to {pricing?.upgrade.charAt(0).toUpperCase() + pricing?.upgrade.slice(1)}
            <span className="ml-2 text-sm opacity-90">
              ({pricing?.price}/{pricing?.period})
            </span>
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Maybe Later
          </Button>
        </div>

        {/* Trust Badge */}
        <div className="text-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>Join 10,000+ creators</span>
            <Zap className="w-4 h-4 text-purple-500" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
