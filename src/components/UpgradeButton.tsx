import { Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeButtonProps {
  tier: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline';
}

export function UpgradeButton({ 
  tier, 
  size = 'md',
  variant = 'default' 
}: UpgradeButtonProps) {
  // Don't show if already Pro/Business
  if (tier === 'pro' || tier === 'business') return null;

  const navigate = useNavigate();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variantClasses = variant === 'outline'
    ? 'border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50'
    : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600';

  const tierName = tier === 'free' ? 'Basic' : 'Pro';

  return (
    <button
      type="button"
      onClick={() => navigate('/pricing')}
      className={`
        inline-flex items-center gap-2 rounded-full font-semibold 
        transition-all duration-200 transform hover:scale-105
        shadow-lg hover:shadow-xl
        ${sizeClasses[size]}
        ${variantClasses}
      `}
    >
      <Crown className="w-4 h-4" />
      <span>Upgrade to {tierName}</span>
      <Sparkles className="w-4 h-4" />
    </button>
  );
}
