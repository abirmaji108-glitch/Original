// src/components/TemplateSelector.tsx
import React, { useState } from 'react';
import { getTemplatesByTier, Template } from '@/data/templates';
import { Sparkles, Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface TemplateSelectorProps {
  onSelectTemplate: (prompt: string) => void;
  userTier: 'free' | 'basic' | 'pro' | 'business';
  isDarkMode: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelectTemplate,
  userTier,
  isDarkMode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const templates = getTemplatesByTier(userTier);

  // Get unique categories
  const categories = ['all', ...new Set(templates.map(t => t.category))];

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  // Group templates by basic/premium
  const basicTemplates = filteredTemplates.filter(t => !t.isPremium);
  const premiumTemplates = filteredTemplates.filter(t => t.isPremium);

  const handleTemplateClick = (template: Template) => {
    if (template.isPremium && (userTier === 'free' || userTier === 'basic')) {
      // ✅ FIX: Show clear error message
      alert(`This is a premium template. Upgrade to Pro or Business to unlock!`);
      return;
    }
    
    // ✅ FIX: Close dropdown immediately
    setIsOpen(false);
    
    // ✅ FIX: Pass prompt to parent (parent handles state update + delay)
    onSelectTemplate(template.prompt);
  };

  // ✅ FIX: Add keyboard support
  const handleKeyDown = (e: React.KeyboardEvent, template: Template) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTemplateClick(template);
    }
  };

  const dynamicBgClass = isDarkMode
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200';

  const dynamicTextClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const dynamicSecondaryText = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const dynamicHoverClass = isDarkMode
    ? 'hover:bg-gray-700'
    : 'hover:bg-gray-50';

  return (
    <div className="space-y-3">
      <label className={`text-sm font-semibold flex items-center gap-2 ${dynamicTextClass}`}>
        <Sparkles className="w-4 h-4 text-purple-500" />
        ✨ Quick Start Templates
      </label>
    
      {/* Template Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border ${dynamicBgClass} ${dynamicHoverClass} transition-colors`}
      >
        <span className={`text-sm ${dynamicTextClass}`}>
          Choose a template to get started quickly
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Template Dropdown */}
      {isOpen && (
        <div className={`rounded-lg border ${dynamicBgClass} p-4 space-y-4 max-h-[500px] overflow-y-auto`}>
        
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white'
                    : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>

          {/* Basic Templates Section */}
          {basicTemplates.length > 0 && (
            <div className="space-y-2">
              <h3 className={`text-xs font-semibold ${dynamicSecondaryText} uppercase tracking-wide`}>
                Basic Templates ({basicTemplates.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {basicTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    onKeyDown={(e) => handleKeyDown(e, template)}
                    tabIndex={0}
                    aria-label={`Select ${template.name} template`}
                    className={`text-left p-3 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${dynamicTextClass}`}>
                          {template.name}
                        </div>
                        <div className={`text-xs ${dynamicSecondaryText} mt-1 line-clamp-2`}>
                          {template.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Premium Templates Section */}
          {premiumTemplates.length > 0 && (
            <div className="space-y-2">
              <h3 className={`text-xs font-semibold ${dynamicSecondaryText} uppercase tracking-wide flex items-center gap-2`}>
                <Sparkles className="w-3 h-3 text-yellow-500" />
                Premium Templates ({premiumTemplates.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {premiumTemplates.map(template => {
                  const isLocked = userTier === 'free' || userTier === 'basic';
                
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      onKeyDown={(e) => handleKeyDown(e, template)}
                      disabled={isLocked}
                      tabIndex={0}
                      aria-label={`Select ${template.name} template`}
                      className={`text-left p-3 rounded-lg border relative ${
                        isLocked
                          ? isDarkMode
                            ? 'bg-gray-800/50 border-gray-700 opacity-60 cursor-not-allowed'
                            : 'bg-gray-100/50 border-gray-300 opacity-60 cursor-not-allowed'
                          : isDarkMode
                          ? 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-700 hover:border-purple-600'
                          : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-300 hover:border-purple-400'
                      } transition-colors`}
                    >
                      {isLocked && (
                        <div className="absolute top-2 right-2">
                          <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${dynamicTextClass} flex items-center gap-2`}>
                            {template.name}
                            <Sparkles className="w-3 h-3 text-yellow-500" />
                          </div>
                          <div className={`text-xs ${dynamicSecondaryText} mt-1 line-clamp-2`}>
                            {template.description}
                          </div>
                          {isLocked && (
                            <div className="text-xs text-purple-600 font-medium mt-2">
                              Upgrade to {userTier === 'free' ? 'Basic or Pro' : 'Pro'} to unlock
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <div className={`text-center py-8 ${dynamicSecondaryText}`}>
              {/* ✅ FIX: Better empty state message */}
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-sm font-medium">No templates in "{selectedCategory}" category</p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-purple-600 hover:text-purple-700 mt-2 underline"
              >
                View all templates
              </button>
            </div>
          )}

          {/* Footer Info */}
          <div className={`text-xs ${dynamicSecondaryText} pt-3 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            {userTier === 'free' || userTier === 'basic' ? (
              <p>
                You have access to {basicTemplates.length} basic templates.
                <span className="text-purple-600 font-medium"> Upgrade to Pro</span> to unlock
                {premiumTemplates.length} premium templates!
              </p>
            ) : (
              <p>
                You have access to all {templates.length} templates as a {userTier} user.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
