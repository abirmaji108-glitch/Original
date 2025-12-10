// src/components/ProBadge.tsx
import { Crown } from 'lucide-react';

export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-semibold rounded-full ${className}`}>
      <Crown className="w-3 h-3" />
      PRO
    </span>
  );
}
