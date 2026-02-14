import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type UserTier } from "@/config/tiers";
import {
  Sparkles,
  MessageSquare,
  Lightbulb,
  Zap,
  Loader2,
  Download,
  Mail,
  Copy,
  Plus,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PartyPopper,
  User,
  Share2,
  Play,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  X,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SavedWebsite, STORAGE_KEY, MAX_WEBSITES } from "@/types/website";
import JSZip from "jszip";
import { useAuth } from '@/contexts/AuthContext';
import { useUsageTracking, notifyUsageUpdate } from '@/hooks/use-usage-tracking';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/ui/spinner';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradeModal } from '@/components/UpgradeModal';
import { ProBadge } from '@/components/ProBadge';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { UpgradeButton } from '@/components/UpgradeButton';
import { EnhancedUpgradeModal } from '@/components/EnhancedUpgradeModal';
import { TemplateSelector } from '@/components/TemplateSelector';
import { DownloadButton } from '@/components/DownloadButton';
import { CharacterCounter } from '@/components/CharacterCounter';
import { PROMPT_LIMITS } from '@/utils/promptLimits';
import { FeatureLockModal } from '@/components/FeatureLockModal';
// ✅ FIX: Removed unused DOMPurify import, using only isomorphic-dompurify
import DOMPurifyIsomorphic from 'isomorphic-dompurify';

// ✅ FIX: Import templates from centralized source
import { basicTemplates } from '@/data/templates';

// Use first 6 basic templates for quick start section
const QUICK_START_TEMPLATES = basicTemplates.slice(0, 6);

const ChatModal = lazy(() => import("@/components/ChatModal").then(m => ({ default: m.ChatModal })));
const AnalyticsModal = lazy(() => import("@/components/AnalyticsModal").then(m => ({ default: m.AnalyticsModal })));
const ProjectModal = lazy(() => import("@/components/ProjectModal").then(m => ({ default: m.ProjectModal })));

const INDUSTRY_TEMPLATES: Record<string, string> = {
  restaurant: "Create a stunning restaurant website for [RestaurantName] specializing in [cuisine]. Include: hero section with food photography and reservation CTA, interactive menu with categories and prices, photo gallery, about section with chef's story, customer testimonials, contact section with map and hours. Use warm colors (burgundy, gold, cream). Mobile-responsive with smooth animations.",
  gym: "Design a modern fitness/gym website for [GymName]. Include: powerful hero with transformation photos and membership CTA, class schedule with timings, trainer profiles with photos and specialties, membership pricing plans, success stories with before/after, facilities gallery, contact form and location map. Use energetic colors (red, black, orange). Mobile-first design.",
  portfolio: "Build a professional portfolio for [YourName], a [profession]. Include: hero with photo and tagline, about section with skills and experience, projects showcase with 6-8 items in grid layout with hover effects, skills with visual representation, testimonials, contact form and social links. Modern minimalist design with bold accents. Smooth scrolling and animations.",
  ecommerce: "Create an e-commerce site for [StoreName] selling [products]. Include: hero with featured products and promo banner, product grid with 8-12 items showing images/prices/'Add to Cart', category navigation, bestsellers section, trust badges (shipping, returns, payment), newsletter signup, footer with customer service. Clean conversion-focused design with prominent CTAs.",
  agency: "Design a creative agency website for [AgencyName]. Include: bold hero with latest work showcase, services section with 4-6 offerings, portfolio grid with case studies, client logos and testimonials, team members with photos, process/methodology section, contact form with office location. Modern design with creative typography and micro-animations.",
  custom: "",
};

const STYLE_DESCRIPTIONS: Record<string, string> = {
  modern: "Clean, contemporary design with smooth animations, gradients, and glass-morphism effects. Uses bold colors and modern typography.",
  minimal: "Simple, elegant design with lots of white space, subtle colors, and focus on content. Typography-focused with minimal decorative elements.",
  bold: "Vibrant, eye-catching design with strong colors, large typography, dramatic contrasts, and confident visual statements.",
  elegant: "Sophisticated, refined design with serif fonts, soft colors, subtle animations, and premium aesthetic. Luxurious feel.",
  playful: "Fun, energetic design with bright colors, rounded shapes, playful illustrations, and dynamic animations. Youthful vibe.",
  professional: "Corporate, trustworthy design with structured layouts, conservative colors (blues, grays), and business-focused aesthetic."
};

type ViewMode = "desktop" | "tablet" | "mobile";

// Skeleton Loading Components
const SkeletonCard = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className={`backdrop-blur-sm rounded-xl p-6 animate-pulse ${
    isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
  }`}>
    <div className={`h-6 rounded mb-4 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} style={{ width: '70%' }}></div>
    <div className={`h-4 rounded mb-2 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} style={{ width: '100%' }}></div>
    <div className={`h-4 rounded mb-4 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} style={{ width: '80%' }}></div>
    <div className="flex gap-2">
      <div className={`h-10 rounded flex-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
      <div className={`h-10 rounded flex-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
      <div className={`h-10 rounded w-10 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
    </div>
  </div>
);

const SkeletonTemplate = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className={`backdrop-blur-sm rounded-xl p-6 animate-pulse ${
    isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
  }`}>
    <div className={`h-16 w-16 rounded-full mb-4 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
    <div className={`h-6 rounded mb-2 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} style={{ width: '80%' }}></div>
    <div className={`h-4 rounded ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} style={{ width: '60%' }}></div>
  </div>
);

// Input sanitization function
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 10000); // Hard cap at 10k chars
};

// ✅ FIX #8: Enhanced HTML sanitization function with isomorphic-dompurify
const sanitizeHTML = (html: string): string => {
  return DOMPurifyIsomorphic.sanitize(html, {
    ALLOWED_TAGS: [
      'html', 'head', 'body', 'title', 'meta', 'link', 'style',
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'button', 'input', 'form',
      'section', 'article', 'header', 'footer', 'nav', 'main',
      'aside', 'figure', 'figcaption', 'table', 'thead', 'tbody',
      'tr', 'td', 'th', 'br', 'hr', 'strong', 'em', 'script'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'type', 'name', 'value', 'placeholder', 'target', 'rel',
      'charset', 'content', 'viewport', 'http-equiv'
    ],
    ALLOW_DATA_ATTR: true,
    ADD_TAGS: ['script', 'style'],
    ADD_ATTR: ['src', 'type'],
    KEEP_CONTENT: true,
    FORCE_BODY: false,
    WHOLE_DOCUMENT: true,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: false
  });
};

// ✅ ADD #9: Watermark injection for free users
const addWatermarkToCode = (code: string, tier: string): string => {
  if (tier !== 'free') return code;

  const watermark = `
    <!-- Generated by Sento AI - Free Plan -->
    <div style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; z-index: 9999; font-family: Arial, sans-serif;">
      Made with <a href="https://sentoai.com" target="_blank" style="color: #00d4ff; text-decoration: none;">Sento AI</a> ⚡
    </div>
  `;

  // Inject before closing </body> tag
  if (code.includes('</body>')) {
    return code.replace('</body>', `${watermark}</body>`);
  }
  // If no body tag, append at end
  return code + watermark;
};

// ✅ ADD #12: Mobile download fallback
const downloadForMobile = (blob: Blob, filename: string) => {
  // Check if mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Use different approach for mobile
    const reader = new FileReader();
    reader.onload = function() {
      const dataUrl = reader.result as string;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
    };
    reader.readAsDataURL(blob);
  } else {
    // Standard desktop download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// ✅ ADD #14: Save generation to history
const saveToHistory = async (userId: string | undefined, prompt: string, code: string) => {
  if (!userId) return;

  try {
    await supabase
      .from('generation_history')
      .insert({
        user_id: userId,
        prompt: prompt,
        generated_code: code,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error saving to history:', error);
  }
};

// ✅ CORRECTED #1: Remove userTier === 'free' condition


const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [sanitizedCode, setSanitizedCode] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [status, setStatus] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [previewMode, setPreviewMode] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [industry, setIndustry] = useState("custom");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const [websiteHistory, setWebsiteHistory] = useState<Array<{
  id: string;
  name: string;
  prompt: string;
  html?: string;
  timestamp: number;
  tags: string[];
  isFavorite: boolean;
  notes: string;
  thumbnail?: string;
  userId?: string; // Add userId field
}>>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalGenerated: 0,
    averageTime: 0,
    templateUsage: {} as Record<string, number>,
    generationDates: [] as string[],
    totalStorageKB: 0
  });
  const [showChat, setShowChat] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [projectNotes, setProjectNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("modern");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [monthlyDownloads, setMonthlyDownloads] = useState(0);
  const [showUsageBanner, setShowUsageBanner] = useState(false);
  // ✅ ADD #13: Rate limiting state
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const GENERATION_COOLDOWN = 5000; // 5 seconds
  const [publishingId, setPublishingId] = useState<string | null>(null);
const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  
  // Form Submissions State
  const [showFormSubmissionsModal, setShowFormSubmissionsModal] = useState(false);
  const [selectedWebsiteForForms, setSelectedWebsiteForForms] = useState<string | null>(null);
  const [formSubmissions, setFormSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  
  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressInterval2Ref = useRef<NodeJS.Timeout | null>(null);
  const generateRequestId = useRef<string | null>(null);
  
  const { toast } = useToast();
  
  // ✅ CORRECTED: Get userTier directly from useAuth()
  const { user, userTier, signOut } = useAuth();
  const tier = (userTier || 'free') as UserTier;
  
  // Feature gating
  const {
  canGenerate: canGenerateMore,
  generationsToday,
  tierLimits,
  isPro,
  isFree,
  refreshLimits,
  loading  // ✅ ADD THIS LINE
} = useFeatureGate();


  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const [featureLockModal, setFeatureLockModal] = useState<{
    isOpen: boolean;
    feature: 'download' | 'template' | 'character-limit' | 'generation-limit';
  }>({
    isOpen: false,
    feature: 'download'
  });

  // ✅ Load websites from Supabase (with localStorage fallback)
useEffect(() => {
  const loadWebsites = async () => {
    if (!userId) return;
    
    // Try Supabase first
    try {
      await fetchWebsites();
    } catch (error) {
      console.error('Supabase load failed, trying localStorage:', error);
      
      // Fallback to localStorage if Supabase fails
      const saved = localStorage.getItem('websiteHistory');
      if (saved) {
        const allHistory = JSON.parse(saved);
        const userHistory = allHistory.filter((site: any) => site.userId === userId);
        setWebsiteHistory(userHistory);
      }
    }
    
    calculateAnalytics();
  };
  
  if (userId) {
    loadWebsites();
  }
}, [userId]);
  useEffect(() => {
    calculateAnalytics();
  }, [websiteHistory]);

  // Sync usage across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'usage_tracking' || e.key === 'generations_today') {
        // Reload page to sync usage data across tabs
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Get authenticated user ID - OPTIMIZED VERSION
useEffect(() => {
  const loadUserProfile = async () => {
    setIsLoadingProfile(true);
    
    try {
      if (user?.id) {
        setUserId(user.id);
        
        // ✅ FIX: Load EVERYTHING in parallel for instant display
        await Promise.all([
          // Load usage stats
          (async () => {
            try {
              await refreshLimits();
              console.log('✅ Usage stats loaded');
            } catch (error) {
              console.error('Failed to load usage stats:', error);
            }
          })(),
          
          // Load download count
          (async () => {
            try {
              await refreshDownloadCount();
              console.log('✅ Download count loaded');
            } catch (error) {
              console.error('Failed to load download count:', error);
            }
          })(),
          
          // Load projects from localStorage immediately
          (async () => {
            try {
              const saved = localStorage.getItem('websiteHistory');
              if (saved) {
                const allHistory = JSON.parse(saved);
                const userHistory = allHistory.filter((site: any) => site.userId === user.id);
                setWebsiteHistory(userHistory);
                console.log('✅ Projects loaded:', userHistory.length);
              }
            } catch (error) {
              console.error('Failed to load projects:', error);
            }
          })()
        ]);
      }
    } catch (error) {
      console.error('Profile load error:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };
  
  loadUserProfile();
}, [user]);

// ✅ FIX: Load projects immediately when userId is set
useEffect(() => {
  if (userId) {
    const loadProjects = () => {
      const saved = localStorage.getItem('websiteHistory');
      if (saved) {
        const allHistory = JSON.parse(saved);
        // Filter to only show current user's websites
        const userHistory = allHistory.filter((site: any) => site.userId === userId);
        setWebsiteHistory(userHistory);
        calculateAnalytics();
      }
    };
    
    // Load immediately
    loadProjects();
  }
}, [userId]);
  // ✅ ADD #7: Function to refresh download count after successful download
  const refreshDownloadCount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data } = await supabase
      .from('download_tracking')
      .select('id')
      .eq('user_id', session.user.id)
      .gte('downloaded_at', `${currentMonth}-01`);

    // Update the download count state
    setMonthlyDownloads(data?.length || 0);
  };

  // ✅ ADD #7: Function to track download
  const trackDownload = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from('download_tracking')
      .insert({
        user_id: session.user.id,
        downloaded_at: new Date().toISOString()
      });

    // Refresh download count
    await refreshDownloadCount();
  };

  // Sanitize generated code when it changes
  useEffect(() => {
    if (generatedCode) {
      const sanitized = sanitizeHTML(generatedCode);
      setSanitizedCode(sanitized);
    } else {
      setSanitizedCode("");
    }
  }, [generatedCode]);

  // Check if there's a shared website in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCode = params.get('shared');
    if (sharedCode && !generatedCode) {
      try {
        const decodedCode = decodeURIComponent(atob(sharedCode));
        setGeneratedCode(decodedCode);
        setTimeout(() => {
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }, 500);
      } catch (error) {
        console.error('Error loading shared website:', error);
      }
    }
  }, []);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showShareMenu && !target.closest('.relative')) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);

  // Load from navigation state if regenerating
  useEffect(() => {
    if (location.state?.description) {
      setInput(location.state.description);
      if (location.state.industry) {
        setIndustry(location.state.industry);
      }
    }
  }, [location.state]);

  // Initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      // Ctrl/Cmd + Enter - Generate website
      if (ctrlKey && e.key === 'Enter' && !isGenerating && input.length >= 50) {
        e.preventDefault();
        handleGenerate();
      }
      // Ctrl/Cmd + / - Toggle theme
      if (ctrlKey && e.key === '/') {
        e.preventDefault();
        toggleTheme();
      }
      // Ctrl/Cmd + S - Download website
      if (ctrlKey && e.key === 's' && generatedCode) {
        e.preventDefault();
        handleDownload();
      }
      // Escape - Close modals
      if (e.key === 'Escape') {
        setShowAnalytics(false);
        setShowProjectModal(false);
        setShowShareMenu(false);
        setShowChat(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, isGenerating, generatedCode]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (progressInterval2Ref.current) {
        clearInterval(progressInterval2Ref.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ✅ REMOVED: useUsageTracking - using useFeatureGate instead
// const { usage, loading: usageLoading, refreshUsage } = useUsageTracking(userId);
// ✅ FIX: Map loading from useFeatureGate for backward compatibility
  const usageLoading = loading;
  const calculateAnalytics = () => {
    const history = websiteHistory;
    const totalGenerated = history.length;
    const avgTime = history.length > 0
      ? Math.floor((history.reduce((sum, site) => sum + site.prompt.length, 0) / history.length) / 10)
      : 0;
    
    const templateUsage: Record<string, number> = {};
    QUICK_START_TEMPLATES.forEach(template => {
      const count = history.filter(site =>
        site.prompt.toLowerCase().includes(template.name.toLowerCase().split(' ')[0])
      ).length;
      if (count > 0) {
        templateUsage[template.name] = count;
      }
    });
    
    const generationDates = history.map(site =>
      new Date(site.timestamp).toLocaleDateString()
    );
    
    const totalStorage = history.reduce((sum, site) =>
      sum + (site.prompt.length + (site.html?.length || 0)), 0
    );
    const totalStorageKB = Math.round(totalStorage / 1024);
    
    setAnalytics({
      totalGenerated,
      averageTime: avgTime,
      templateUsage,
      generationDates,
      totalStorageKB
    });
  };

  const getGenerationsPerDay = () => {
    const dateCount: Record<string, number> = {};
    websiteHistory.forEach(site => {
      const date = new Date(site.timestamp).toLocaleDateString();
      dateCount[date] = (dateCount[date] || 0) + 1;
    });
    return dateCount;
  };

  const handleIndustryChange = (value: string) => {
    setIndustry(value);
    if (value !== "custom" && INDUSTRY_TEMPLATES[value]) {
      setInput(INDUSTRY_TEMPLATES[value]);
    } else if (value === "custom") {
      setInput("");
    }
  };

  // Elapsed time counter
  useEffect(() => {
    if (isGenerating) {
      const startTime = Date.now();
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setElapsedTime(0);
    }
  }, [isGenerating]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const generateShareLink = () => {
    if (!generatedCode) return "";
    const encodedCode = btoa(encodeURIComponent(generatedCode));
    const shareUrl = `${window.location.origin}${window.location.pathname}?shared=${encodedCode}`;
    setShareLink(shareUrl);
    return shareUrl;
  };

  const handleCopyLink = () => {
    const link = generateShareLink();
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleShareTwitter = () => {
    const link = generateShareLink();
    const text = "Check out this website I created with AI! 🚀";
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
    window.open(url, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareLinkedIn = () => {
    const link = generateShareLink();
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
    window.open(url, '_blank', 'width=600,height=600');
    setShowShareMenu(false);
  };

  const handleShareFacebook = () => {
    const link = generateShareLink();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    window.open(url, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareEmail = () => {
    const link = generateShareLink();
    const subject = "Check out my AI-generated website!";
    const body = `I just created this amazing website using AI! Take a look:\n\n${link}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowShareMenu(false);
  };

  const handleOpenInCodeSandbox = () => {
    if (!generatedCode) return;
    const styleMatch = generatedCode.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : '';
    const scriptMatch = generatedCode.match(/<script>([\s\S]*?)<\/script>/);
    const scripts = scriptMatch ? scriptMatch[1] : '';
    
    let cleanHtml = generatedCode
      .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="./styles.css">')
      .replace(/<script>[\s\S]*?<\/script>/, '<script src="./script.js"></script>');
    
    const parameters = {
      files: {
        "index.html": {
          content: cleanHtml
        },
        "styles.css": {
          content: styles
        },
        "script.js": {
          content: scripts
        },
        "package.json": {
          content: JSON.stringify({
            name: "ai-generated-website",
            version: "1.0.0",
            description: "Website generated with AI",
            main: "index.html",
            scripts: {
              start: "serve .",
              build: "echo 'Build complete'"
            }
          })
        },
        "sandbox.config.json": {
          content: JSON.stringify({
            template: "static"
          })
        }
      }
    };
    
    const compressed = JSON.stringify(parameters);
    const encoded = btoa(unescape(encodeURIComponent(compressed)));
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://codesandbox.io/api/v1/sandboxes/define';
    form.target = '_blank';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'parameters';
    input.value = encoded;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleOpenInStackBlitz = () => {
    if (!generatedCode) return;
    const styleMatch = generatedCode.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : '';
    const scriptMatch = generatedCode.match(/<script>([\s\S]*?)<\/script>/);
    const scripts = scriptMatch ? scriptMatch[1] : '';
    
    let cleanHtml = generatedCode
      .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="styles.css">')
      .replace(/<script>[\s\S]*?<\/script>/, '<script src="script.js"></script>');
    
    const project = {
      title: 'AI Generated Website',
      description: 'Website created with AI Website Generator',
      template: 'html',
      files: {
        'index.html': cleanHtml,
        'styles.css': styles,
        'script.js': scripts,
        'README.md': `# AI Generated Website
This website was created using an AI Website Generator.
## Files
- \`index.html\` - Main HTML structure
- \`styles.css\` - Styling
- \`script.js\` - JavaScript functionality
## Edit
Feel free to modify any files to customize your website!
Generated on: ${new Date().toLocaleDateString()}
`
      }
    };
    
    const projectString = JSON.stringify(project);
    const encoded = btoa(encodeURIComponent(projectString));
    window.open(`https://stackblitz.com/edit/html-${Date.now()}?project=${encoded}`, '_blank');
  };

  const getStatusForProgress = (progress: number): string => {
    if (progress < 20) return "🤔 AI analyzing your requirements...";
    if (progress < 40) return "🎨 Designing perfect layout structure...";
    if (progress < 60) return "✨ Crafting beautiful visual elements...";
    if (progress < 80) return "📱 Optimizing for all devices...";
    return "🚀 Finalizing your professional website...";
  };

  const saveWebsite = async (htmlCode: string) => {
    try {
      if (!userId) {
        console.error('No user ID - cannot save to database');
        return;
      }
      
      const name = input.split('\n')[0].slice(0, 50) || 'Untitled Website';
      
      // ✅ Website is already saved by Server.js - no need to save again!
// Just use the htmlCode directly for localStorage
const data = {
  id: crypto.randomUUID(), // Generate ID for localStorage only
  name,
  prompt: input,
  html_code: htmlCode
};
const error = null; // No error since we're not inserting
        
      if (error) {
        console.error('❌ FULL SUPABASE ERROR:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast({
          title: "Save Failed",
          description: error.message || "Could not save website to database",
          variant: "destructive",
        });
        return;
      }
      
      const websites: SavedWebsite[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const newWebsite: SavedWebsite = {
        id: data.id,
        name,
        prompt: input,
        htmlCode,
        timestamp: Date.now(),
      };
      websites.unshift(newWebsite);
      if (websites.length > MAX_WEBSITES) {
        websites.splice(MAX_WEBSITES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(websites));
      
      toast({
        title: "Saved! 💾",
        description: "Website saved to your account",
      });
    } catch (error) {
      console.error('Error saving website:', error);
    }
  };

  const simulateProgress = () => {
    const stages = [
      { progress: 25, message: "🔍 Analyzing your requirements..." },
      { progress: 50, message: "🎨 Designing layout and structure..." },
      { progress: 75, message: "💻 Writing HTML, CSS, and JavaScript..." },
      { progress: 90, message: "✨ Finalizing your website..." }
    ];
    
    let currentStage = 0;
    setProgress(0);
    setProgressStage(stages[0].message);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setProgressStage(stages[currentStage].message);
        currentStage++;
      } else {
        clearInterval(interval);
        progressIntervalRef.current = null;
      }
    }, 8000);
    
    progressIntervalRef.current = interval;
    return interval;
  };

  const saveProjectDetails = () => {
  if (!editingProject) return;
  
  // Update in ALL history
  const allHistory = JSON.parse(localStorage.getItem('websiteHistory') || '[]');
  const updatedAllHistory = allHistory.map((site: any) =>
    site.id === editingProject
      ? {
          ...site,
          name: projectName.trim() || `Website ${websiteHistory.length}`,
          tags: projectTags,
          notes: projectNotes
        }
      : site
  );
  localStorage.setItem('websiteHistory', JSON.stringify(updatedAllHistory));
  
  // Update current user's view
  const updatedUserHistory = websiteHistory.map(site =>
    site.id === editingProject
      ? {
          ...site,
          name: projectName.trim() || `Website ${websiteHistory.length}`,
          tags: projectTags,
          notes: projectNotes
        }
      : site
  );
  setWebsiteHistory(updatedUserHistory);
    setShowProjectModal(false);
    setEditingProject(null);
    setProjectName("");
    setProjectTags([]);
    setProjectNotes("");
  };

  const toggleFavorite = (id: string) => {
  // Update in ALL history
  const allHistory = JSON.parse(localStorage.getItem('websiteHistory') || '[]');
  const updatedAllHistory = allHistory.map((site: any) =>
    site.id === id ? { ...site, isFavorite: !site.isFavorite } : site
  );
  localStorage.setItem('websiteHistory', JSON.stringify(updatedAllHistory));
  
  // Update current user's view
  const updatedUserHistory = websiteHistory.map(site =>
    site.id === id ? { ...site, isFavorite: !site.isFavorite } : site
  );
  setWebsiteHistory(updatedUserHistory);
};

  const addTag = (tag: string) => {
    if (tag.trim() && !projectTags.includes(tag.trim())) {
      setProjectTags([...projectTags, tag.trim()]);
    }
  };

  const removeTag = (tag: string) => {
    setProjectTags(projectTags.filter(t => t !== tag));
  };

  const openEditProject = (site: typeof websiteHistory[0]) => {
    setEditingProject(site.id);
    setProjectName(site.name);
    setProjectTags(site.tags);
    setProjectNotes(site.notes);
    setShowProjectModal(true);
  };

  const getFilteredProjects = () => {
    let filtered = [...websiteHistory];
    if (searchQuery.trim()) {
      filtered = filtered.filter(site =>
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (filterTag !== "all") {
      filtered = filtered.filter(site => site.tags.includes(filterTag));
    }
    if (showFavoritesOnly) {
      filtered = filtered.filter(site => site.isFavorite);
    }
    return filtered;
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    websiteHistory.forEach(site => {
      site.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  };

  const handleGenerate = async (directPrompt?: string) => {
  // Use directPrompt if provided, otherwise use input state
  const actualInput = directPrompt || input;
  
  // Debug logging
    console.log('🔵 Generate called with input:', {
      inputLength: actualInput.length,
      inputValue: actualInput.substring(0, 100),
    tier: tier,
    canGenerateMore: canGenerateMore
  });
    
    // ✅ ADD #13: Rate limiting check
    const now = Date.now();
    const timeSinceLastGen = now - lastGenerationTime;
    
    if (timeSinceLastGen < GENERATION_COOLDOWN) {
      toast({
        title: "Please wait",
        description: `You can generate again in ${Math.ceil((GENERATION_COOLDOWN - timeSinceLastGen) / 1000)} seconds.`,
        variant: "destructive"
      });
      return;
    }
    
    setLastGenerationTime(now);

    // Prevent concurrent requests
    if (isGenerating) {
      toast({
        title: "Already Generating",
        description: "Please wait for the current generation to complete.",
      });
      return;
    }

    // ✅ CHECK 1: Check length BEFORE sanitization (on raw input)
const currentInputLength = actualInput.trim().length;
console.log('🔍 Validation check:', { currentInputLength, inputPreview: actualInput.substring(0, 100) });

if (currentInputLength < 50) {
  toast({
    title: "Description too short",
    description: `Please write at least 50 characters (currently ${currentInputLength})`,
    variant: "destructive",
  });
  return;
}

    // Sanitize input
    // Sanitize input
const sanitizedPrompt = sanitizeInput(actualInput);

    // ✅ CHECK 2: Check empty input AFTER sanitization
    if (!sanitizedPrompt || sanitizedPrompt.trim().length === 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a template or enter a description.",
        variant: "destructive",
      });
      return;
    }

    // Now trim for API submission
    const trimmedPrompt = sanitizedPrompt.trim();

    // ✅ CHECK 3: Check max length
    const tierMaxLengths = {
      free: 1000,
      basic: 2000,
      pro: 5000,
      business: 10000
    };
    
    const maxLength = tierMaxLengths[tier] || 1000;

    if (trimmedPrompt.length > maxLength) {
      toast({
        title: "Prompt too long",
        description: `${tier.toUpperCase()} users can use up to ${maxLength} characters. Current: ${trimmedPrompt.length}`,
        variant: "destructive"
      });
      return;
    }

    // ✅ CORRECTED: ALL CLIENT-SIDE VALIDATIONS REMOVED
    // Server now handles all validations including:
    // - Monthly limit check
    // - Prompt length check
    // - Premium template check

    // Create unique request ID
    const requestId = `gen_${Date.now()}_${Math.random()}`;
    generateRequestId.current = requestId;

    setIsGenerating(true);
setProgress(0);
setGeneratedCode(null);
setShowSuccess(false);
setShowUsageBanner(false); // ✅ ADD THIS
    
    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    // Start progress simulation
    simulateProgress();
    
    // Clear existing smooth progress interval
    if (progressInterval2Ref.current) {
      clearInterval(progressInterval2Ref.current);
    }
    
    // Smooth progress animation
    progressInterval2Ref.current = setInterval(() => {
      setProgress((p) => {
        const newProgress = Math.min(p + 0.5, 95);
        return newProgress;
      });
    }, 150);

    try {
      const styleInstruction = STYLE_DESCRIPTIONS[selectedStyle] || STYLE_DESCRIPTIONS.modern;
const prompt = `Generate a complete, production-ready, single-file HTML website based on this description:
${sanitizedPrompt}
DESIGN STYLE: ${selectedStyle.toUpperCase()}
${styleInstruction}
Apply this design style consistently throughout the website.

REQUIREMENTS:
- Complete HTML5 document starting with <!DOCTYPE html>
- Use Tailwind CSS CDN in HEAD: <script src="https://cdn.tailwindcss.com"></script>
- CRITICAL: Add this in <head> section for proper rendering:
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="UTF-8">
- Ensure ALL CSS loads BEFORE any content is rendered
- Inline all CSS in <style> tags if needed beyond Tailwind
- Inline all JavaScript in <script> tags
- Mobile-first responsive design
- Modern, professional design with smooth animations
- 🖼️ IMAGE RULES (CRITICAL - IMAGES MUST LOAD):
  * PRIMARY SOURCE: Picsum Photos (100% reliable, always works)
  * Hero sections: https://picsum.photos/1920/1080
  * Feature cards: https://picsum.photos/800/600
  * Team photos: https://picsum.photos/400/400
  * Product images: https://picsum.photos/600/600
  * Thumbnails: https://picsum.photos/300/300
  * Background images: https://picsum.photos/1600/900
  
- IMPORTANT: 
  * Use DIFFERENT image IDs by adding "?random=1", "?random=2", etc.
  * Example: <img src="https://picsum.photos/800/600?random=1" alt="Feature 1">
  * Example: <img src="https://picsum.photos/800/600?random=2" alt="Feature 2">
  * This ensures variety - each image will be DIFFERENT
  * Picsum Photos provides high-quality professional photos
  * Images load instantly with no rate limits or API keys needed
- Include realistic placeholder text and content
- Professional color scheme matching the description
- Proper semantic HTML5 tags
- Accessibility features (alt tags, ARIA labels)
Return ONLY the complete HTML code. No explanations, no markdown, no code blocks - just the raw HTML starting with <!DOCTYPE html>`;

      setLastPrompt(prompt);
      
      // ✅ FIXED: Get auth token with more lenient session handling
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Log for debugging
      console.log('🔍 Session check:', { 
        hasSession: !!session, 
        hasError: !!sessionError,
        sessionDetails: session ? 'valid' : 'null'
      });

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        toast({
          title: "Session Error",
          description: "Please try again or log in.",
          variant: "destructive",
        });
        return;
      }

      if (!session) {
        console.warn('⚠️ No session found, refreshing...');
        // Try to refresh the session once
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        
        if (!refreshedSession) {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }
        
        session = refreshedSession;
      }

      const token = session.access_token;
      console.log('✅ Session valid, token obtained');

      // ✅ CORRECTED: SECURE API CALL - Remove user_tier from request
      const response = await fetch('https://original-lbxv.onrender.com/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          user_id: user?.id  // ✅ Only send user_id, server determines tier
        }),
        signal: abortControllerRef.current?.signal
      });

      // ✅ CORRECTED: ENHANCED ERROR HANDLING
      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429) {
          if (errorData.limit_reached) {
            toast({
              title: "Monthly Limit Reached",
              description: errorData.upgrade_required 
                ? "Upgrade your plan to generate more websites."
                : "Your monthly generation limit has been reached.",
              variant: "destructive"
            });
          } else if (errorData.retry_after) {
            toast({
              title: "Rate Limit Exceeded",
              description: `Please wait ${errorData.retry_after} seconds.`,
              variant: "destructive"
            });
          }
        } else if (response.status === 403) {
          toast({
            title: "Premium Feature",
            description: errorData.upgrade_required 
              ? "This feature requires a plan upgrade."
              : "Access denied.",
            variant: "destructive"
          });
        } else if (response.status === 400) {
          toast({
            title: "Invalid Request",
            description: errorData.error || "Please check your input.",
            variant: "destructive"
          });
        } else if (response.status === 401) {
          if (errorData.code === 'TOKEN_EXPIRED') {
            toast({
              title: "Session Expired",
              description: "Your session has expired. Logging you out...",
              variant: "destructive",
            });
            await signOut();
            navigate('/auth');
          } else {
            toast({
              title: "Authentication Error",
              description: "Please log in again to continue.",
              variant: "destructive",
            });
            navigate('/auth');
          }
        } else {
          toast({
            title: "Generation Failed",
            description: "An unexpected error occurred.",
            variant: "destructive"
          });
        }
        
        setIsGenerating(false);
        setProgress(0);
        setProgressStage("");
        return;
      }

      const data = await response.json();

      // Check if this request is still valid
      if (generateRequestId.current !== requestId) {
        console.log('⚠️ Request superseded, ignoring result');
        return;
      }

      let htmlCode = data.htmlCode;
      
      // ✅ FIX #8: Sanitize generated code before storing
const sanitizedCode = DOMPurifyIsomorphic.sanitize(htmlCode, {
  ALLOWED_TAGS: ['html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'style', 'script', 'meta', 'title', 'link', 'section', 'article', 'header', 'footer', 'nav', 'button', 'input', 'form', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'style', 'type', 'rel', 'charset', 'name', 'content', 'viewport', 'http-equiv', 'target', 'placeholder'],
  ALLOW_DATA_ATTR: true,
  ADD_TAGS: ['script', 'style'],
  KEEP_CONTENT: true,
  WHOLE_DOCUMENT: true,
  FORCE_BODY: false
});

      htmlCode = sanitizedCode;

      // ✅ Server already incremented counter atomically - no client-side increment needed

      // ✅ ADD #14: Save generation to history
      

      // Save to history WITH userId
      const newWebsite = {
        id: data.websiteId || Date.now().toString(),
        name: `Website ${websiteHistory.length + 1}`,
        prompt: input,  // ✅ FIXED - use input instead of prompt
        html: htmlCode,
        timestamp: Date.now(),
        tags: [],
        isFavorite: false,
        notes: "",
        thumbnail: "",
        userId: userId || user?.id,
        deployment_url: null,
        deployment_id: null,
        deployment_status: 'draft'
      };
      const updatedHistory = [newWebsite, ...websiteHistory];
      setWebsiteHistory(updatedHistory);
      localStorage.setItem('websiteHistory', JSON.stringify(updatedHistory));

      setProgress(100);
      setProgressStage("✅ Complete! Your website is ready.");

      // ✅ FIXED: SUCCESS HANDLER - Show banner AFTER website displays
if (data.success) {
  // Show success state for 2 seconds
  setShowSuccess(true);
  
  setTimeout(async () => {
    // 1. Display the website FIRST
    setGeneratedCode(htmlCode);
    await saveWebsite(htmlCode);
    
    // 2. Update state
    setIsGenerating(false);
    setShowSuccess(false);
    setProgress(0);
    setProgressStage("");
    
    // 3. THEN refresh usage data
    await refreshLimits();
    notifyUsageUpdate();
    
    // 4. FINALLY show the usage banner (after website is visible)
    setTimeout(() => {
      setShowUsageBanner(true);
    }, 500); // Small delay to ensure website renders first
    
    toast({
      title: "Success! 🎉",
      description: `🎉 Your professional website is ready!`,
    });
  }, 2000);
}
    } catch (error) {
      // Cleanup intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (progressInterval2Ref.current) {
        clearInterval(progressInterval2Ref.current);
        progressInterval2Ref.current = null;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "❌ Generation Cancelled",
          description: "You stopped the website generation process.",
        });
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "🌐 Network Error",
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else if (error instanceof Error && error.message.includes('timeout')) {
        toast({
          title: "⏱️ Request Timeout",
          description: "The generation took too long. Please try again with a shorter description.",
          variant: "destructive",
        });
      } else {
        console.error('Generation error:', error);
        toast({
          title: "❌ Generation Failed",
          description: error instanceof Error ? `Error: ${error.message}` : "Something went wrong. Please try again or contact support.",
          variant: "destructive",
        });
      }
      
      setIsGenerating(false);
      setProgress(0);
      setProgressStage("");
      setShowSuccess(false);
    } finally {
      // Only clear if this is still the active request
      if (generateRequestId.current === requestId) {
        setIsGenerating(false);
        generateRequestId.current = null;
      }
    }
  };

  const handleRegenerate = async () => {
    // ✅ ADD #13: Rate limiting check
    const now = Date.now();
    const timeSinceLastGen = now - lastGenerationTime;
    
    if (timeSinceLastGen < GENERATION_COOLDOWN) {
      toast({
        title: "Please wait",
        description: `You can generate again in ${Math.ceil((GENERATION_COOLDOWN - timeSinceLastGen) / 1000)} seconds.`,
        variant: "destructive"
      });
      return;
    }
    
    setLastGenerationTime(now);

    // Prevent concurrent requests
    if (isGenerating) {
      toast({
        title: "Already Generating",
        description: "Please wait for the current generation to complete.",
      });
      return;
    }

    if (!lastPrompt) {
      toast({
        title: "No prompt to regenerate",
        description: "Please generate a website first.",
        variant: "destructive",
      });
      return;
    }

    // ✅ FIX #3: Validate lastPrompt
    const sanitizedPrompt = sanitizeInput(lastPrompt);

    // Frontend UX check only
    if (!canGenerateMore) {
      setShowUpgradeModal(true);
      return;
    }

    // Create unique request ID
    const requestId = `regen_${Date.now()}_${Math.random()}`;
    generateRequestId.current = requestId;

    setIsGenerating(true);
setProgress(0);
setGeneratedCode(null);
setShowSuccess(false);
setShowUsageBanner(false); // ✅ ADD THIS
    
    abortControllerRef.current = new AbortController();
    
    simulateProgress();
    
    if (progressInterval2Ref.current) {
      clearInterval(progressInterval2Ref.current);
    }
    
    progressInterval2Ref.current = setInterval(() => {
      setProgress((p) => {
        const newProgress = Math.min(p + 0.5, 95);
        return newProgress;
      });
    }, 150);

    try {
      // ✅ FIXED: Get auth token with more lenient session handling
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Log for debugging
      console.log('🔍 Session check:', { 
        hasSession: !!session, 
        hasError: !!sessionError,
        sessionDetails: session ? 'valid' : 'null'
      });

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        toast({
          title: "Session Error",
          description: "Please try again or log in.",
          variant: "destructive",
        });
        return;
      }

      if (!session) {
        console.warn('⚠️ No session found, refreshing...');
        // Try to refresh the session once
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        
        if (!refreshedSession) {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }
        
        session = refreshedSession;
      }

      const token = session.access_token;
      console.log('✅ Session valid, token obtained');

      // ✅ CORRECTED: SECURE API CALL - Remove user_tier from request
      const response = await fetch('https://original-lbxv.onrender.com/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          prompt: lastPrompt.trim(),
          user_id: user?.id  // ✅ Only send user_id
        }),
        signal: abortControllerRef.current?.signal
      });

      // ✅ CORRECTED: ENHANCED ERROR HANDLING
      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429) {
          if (errorData.limit_reached) {
            toast({
              title: "Monthly Limit Reached",
              description: errorData.upgrade_required 
                ? "Upgrade your plan to generate more websites."
                : "Your monthly generation limit has been reached.",
              variant: "destructive"
            });
          } else if (errorData.retry_after) {
            toast({
              title: "Rate Limit Exceeded",
              description: `Please wait ${errorData.retry_after} seconds.`,
              variant: "destructive"
            });
          }
        } else if (response.status === 403) {
          toast({
            title: "Premium Feature",
            description: errorData.upgrade_required 
              ? "This feature requires a plan upgrade."
              : "Access denied.",
            variant: "destructive"
          });
        } else if (response.status === 400) {
          toast({
            title: "Invalid Request",
            description: errorData.error || "Please check your input.",
            variant: "destructive"
          });
        } else if (response.status === 401) {
          if (errorData.code === 'TOKEN_EXPIRED') {
            toast({
              title: "Session Expired",
              description: "Your session has expired. Logging you out...",
              variant: "destructive",
            });
            await signOut();
            navigate('/auth');
          } else {
            toast({
              title: "Authentication Error",
              description: "Please log in again to continue.",
              variant: "destructive",
            });
            navigate('/auth');
          }
        } else {
          toast({
            title: "Generation Failed",
            description: "An unexpected error occurred.",
            variant: "destructive"
          });
        }
        
        setIsGenerating(false);
        setProgress(0);
        setProgressStage("");
        return;
      }

      const data = await response.json();

      if (generateRequestId.current !== requestId) {
        console.log('⚠️ Request superseded, ignoring result');
        return;
      }

      let htmlCode = data.htmlCode;
      
      // ✅ FIX #8: Sanitize generated code before storing
const sanitizedCode = DOMPurifyIsomorphic.sanitize(htmlCode, {
  ALLOWED_TAGS: ['html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'style', 'script', 'meta', 'title', 'link', 'section', 'article', 'header', 'footer', 'nav', 'button', 'input', 'form', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'style', 'type', 'rel', 'charset', 'name', 'content', 'viewport', 'http-equiv', 'target', 'placeholder'],
  ALLOW_DATA_ATTR: true,
  ADD_TAGS: ['script', 'style'],
  KEEP_CONTENT: true,
  WHOLE_DOCUMENT: true,
  FORCE_BODY: false
});

      htmlCode = sanitizedCode;

      // ✅ Server already incremented counter atomically - no client-side increment needed

      // ✅ ADD #14: Save generation to history
     

      const newWebsite = {
        id: data.websiteId || Date.now().toString(),
        name: `Website ${websiteHistory.length + 1}`,
        prompt: lastPrompt,  // ✅ FIXED - use lastPrompt for regenerate
        html: htmlCode,
        timestamp: Date.now(),
        tags: [],
        isFavorite: false,
        notes: "",
        thumbnail: "",
        userId: userId || user?.id,
        deployment_url: null,
        deployment_id: null,
        deployment_status: 'draft'
      };
      // Merge with ALL history (including other users), then save
const allHistory = JSON.parse(localStorage.getItem('websiteHistory') || '[]');
const updatedAllHistory = [newWebsite, ...allHistory];
localStorage.setItem('websiteHistory', JSON.stringify(updatedAllHistory));

// But only show current user's history
const currentUserHistory = [newWebsite, ...websiteHistory];
setWebsiteHistory(currentUserHistory);
      setProgress(100);
      setProgressStage("✅ Complete! Your website is ready.");

      // ✅ CORRECTED: SUCCESS HANDLER - Refresh usage data from server
      if (data.success) {
        // Refresh usage data from server
      await refreshLimits();

      // ✅ FIX: Also refresh limits from useFeatureGate
if (typeof refreshLimits === 'function') {
  await refreshLimits();
}

// Notify other tabs of usage update
notifyUsageUpdate();

        
        setShowSuccess(true);
        setTimeout(async () => {
          setGeneratedCode(htmlCode);
          await saveWebsite(htmlCode);
          
          // ✅ FIX: Refresh usage after regenerate too
        await refreshLimits();
        
        if (typeof refreshLimits === 'function') {
            await refreshLimits();
          }
          
          notifyUsageUpdate();
          
          setIsGenerating(false);
          setShowSuccess(false);
          setProgress(0);
          setProgressStage("");
          toast({
            title: "Regenerated! 🎉",
            description: `✨ Fresh version generated! Usage count updated.`,
          });
        }, 2000);
      }
    } catch (error) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (progressInterval2Ref.current) {
        clearInterval(progressInterval2Ref.current);
        progressInterval2Ref.current = null;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "❌ Regeneration Cancelled",
          description: "You stopped the website regeneration process.",
        });
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "🌐 Network Error",
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else if (error instanceof Error && error.message.includes('timeout')) {
        toast({
          title: "⏱️ Request Timeout",
          description: "The regeneration took too long. Please try again with a shorter description.",
          variant: "destructive",
        });
      } else {
        console.error('Regeneration error:', error);
        toast({
          title: "❌ Regeneration Failed",
          description: error instanceof Error ? `Error: ${error.message}` : "Something went wrong. Please try again or contact support.",
          variant: "destructive",
        });
      }
      
      setIsGenerating(false);
      setProgress(0);
      setProgressStage("");
      setShowSuccess(false);
    } finally {
      if (generateRequestId.current === requestId) {
        setIsGenerating(false);
        generateRequestId.current = null;
      }
    }
  };

  const handleDelete = (id: string) => {
  // Remove from ALL history
  const allHistory = JSON.parse(localStorage.getItem('websiteHistory') || '[]');
  const updatedAllHistory = allHistory.filter((site: any) => site.id !== id);
  localStorage.setItem('websiteHistory', JSON.stringify(updatedAllHistory));
  
  // Update current user's view
  const updatedUserHistory = websiteHistory.filter(site => site.id !== id);
  setWebsiteHistory(updatedUserHistory);
};
  const handleLoadWebsite = (html: string) => {
    setGeneratedCode(html);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleDownload = async () => {
    if (!generatedCode) return;
    
    // ✅ FIX #9: Apply watermark for free users
    const codeWithWatermark = addWatermarkToCode(generatedCode, tier);
    
    const zip = new JSZip();
    const styleMatch = codeWithWatermark.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : '';
    const scriptMatch = codeWithWatermark.match(/<script>([\s\S]*?)<\/script>/);
    const scripts = scriptMatch ? scriptMatch[1] : '';
    
    let cleanHtml = codeWithWatermark
      .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="styles.css">')
      .replace(/<script>[\s\S]*?<\/script>/, '<script src="script.js"></script>');
    
    zip.file("index.html", cleanHtml);
    zip.file("styles.css", styles);
    zip.file("script.js", scripts);
    zip.file("README.md", `# Your AI-Generated Website
## 📁 Files Included:
- index.html - Main HTML file
- styles.css - All styling
- script.js - JavaScript functionality
## 🚀 How to Use:
1. Extract this ZIP file
2. Open index.html in your browser
3. Edit files as needed
4. Host on any web server
## 📝 Notes:
- All files are linked and ready to use
- Modify styles.css to change design
- Edit script.js for functionality changes
Generated with AI Website Builder
${new Date().toLocaleDateString()}
`);
    
    const content = await zip.generateAsync({ type: "blob" });
    
    // ✅ FIX #12: Use mobile-friendly download
    downloadForMobile(content, `website-${Date.now()}.zip`);
    
    // ✅ FIX #7: Track download count
    await trackDownload();
    
    toast({
      title: "Downloaded!",
      description: "Your website ZIP has been saved",
    });
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    
    // ✅ FIX #9: Apply watermark for free users when copying
    const codeWithWatermark = addWatermarkToCode(generatedCode, tier);
    
    await navigator.clipboard.writeText(codeWithWatermark);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard! Paste it into any code editor or StackBlitz.",
    });
  };
  // ✅ Fetch websites from Supabase
const fetchWebsites = async () => {
  if (!userId) return;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://original-lbxv.onrender.com'}/api/websites`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch websites');
      return;
    }
    
    const data = await response.json();
    
    if (data.success && data.websites) {
      setWebsiteHistory(data.websites);
      // Also save to localStorage as cache
      localStorage.setItem('websiteHistory', JSON.stringify(data.websites));
    }
  } catch (error) {
    console.error('Fetch websites error:', error);
  }
};
  // Publish website to Vercel
  const handlePublish = async (websiteId: string) => {
    setPublishingId(websiteId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to publish",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/publish/${websiteId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success! 🚀",
          description: `Your page is live at: ${data.url}`,
        });
        
// Refresh websites list from Supabase
      await fetchWebsites();
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to publish page',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        title: "Error",
        description: 'Failed to publish page',
        variant: "destructive"
      });
    } finally {
      setPublishingId(null);
    }
  };

  // Unpublish website
  const handleUnpublish = async (websiteId: string) => {
    setUnpublishingId(websiteId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to unpublish",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/publish/${websiteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Page unpublished successfully",
        });
        
        await fetchWebsites();
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to unpublish page',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Unpublish error:', error);
      toast({
        title: "Error",
        description: 'Failed to unpublish page',
        variant: "destructive"
      });
    } finally {
      setUnpublishingId(null);
    }
  };

  // Form Submissions Functions
  const fetchFormSubmissions = async (websiteId: string) => {
    setLoadingSubmissions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to view submissions",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/forms/${websiteId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setFormSubmissions(data.submissions || []);
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to fetch submissions',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Fetch submissions error:', error);
      toast({
        title: "Error",
        description: 'Failed to fetch form submissions',
        variant: "destructive"
      });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Fetch analytics from server
  const fetchAnalytics = async (websiteId: string) => {
    try {
      const token = await supabase.auth.getSession();
      const accessToken = token.data.session?.access_token;

      const response = await fetch(`/api/analytics/${websiteId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      return data.analytics;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/forms/${submissionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Deleted",
          description: "Submission deleted successfully"
        });
        // Refresh submissions
        if (selectedWebsiteForForms) {
          await fetchFormSubmissions(selectedWebsiteForForms);
        }
      }
    } catch (error) {
      console.error('Delete submission error:', error);
    }
  };

  const handleMarkAsRead = async (submissionId: string, isRead: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/forms/${submissionId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isRead })
      });

      const data = await response.json();

      if (data.success && selectedWebsiteForForms) {
        await fetchFormSubmissions(selectedWebsiteForForms);
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const openFormSubmissions = async (websiteId: string) => {
    setSelectedWebsiteForForms(websiteId);
    setShowFormSubmissionsModal(true);
    await fetchFormSubmissions(websiteId);
  };

  const handleNewWebsite = () => {
    setGeneratedCode(null);
    setInput("");
    setProgress(0);
    setStatus("");
    setIndustry("custom");
  };

  const handleShare = async () => {
    const link = generateShareLink();
    if (link) {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied!",
        description: "Share this link with others",
      });
    }
  };

  const handleExampleClick = (exampleText: string, exampleIndustry: string) => {
    setInput(exampleText);
    setIndustry(exampleIndustry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ FIX 3: Fixed Template Click Handler
  const handleTemplateClick = (prompt: string) => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setInput(prompt);
  // Auto-fill input and scroll to top for user review
  toast({
    title: "Template Loaded!",
    description: "Review the prompt and click 'Generate Website' when ready.",
  });
};
  const getAspectRatio = () => {
    switch (viewMode) {
      case "tablet":
        return "aspect-[3/4]";
      case "mobile":
        return "aspect-[9/16]";
      default:
        return "aspect-video";
    }
  };

  const handleOpenFullScreen = () => {
    if (!generatedCode) return;
    
    // ✅ FIX #9: Apply watermark for free users
    const codeWithWatermark = addWatermarkToCode(generatedCode, tier);
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(codeWithWatermark);
      newWindow.document.close();
    }
  };

  // ✅ FIX #2: Use tier-based character limits
  const tierLimitsConfig = {
    free: 1000,
    basic: 2000,
    pro: 5000,
    business: 10000
  };
  const characterLimit = tierLimitsConfig[tier] || 1000;
  const characterCount = input.length;

  const examples = [
    {
      title: "Restaurant Website",
      description: "Modern dining experience",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
      prompt: INDUSTRY_TEMPLATES.restaurant,
      industry: "restaurant"
    },
    {
      title: "Portfolio Website",
      description: "Showcase your creative work",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
      prompt: INDUSTRY_TEMPLATES.portfolio,
      industry: "portfolio"
    },
    {
      title: "Gym Website",
      description: "Energize your fitness brand",
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop",
      prompt: INDUSTRY_TEMPLATES.gym,
      industry: "gym"
    },
    {
      title: "E-commerce Store",
      description: "Boost your online sales",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
      prompt: INDUSTRY_TEMPLATES.ecommerce,
      industry: "ecommerce"
    },
    {
      title: "Agency Website",
      description: "Creative agency showcase",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop",
      prompt: INDUSTRY_TEMPLATES.agency,
      industry: "agency"
    }
  ];

  const dynamicTextClass = `transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`;
  const dynamicMutedClass = `transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;
  const dynamicSubtleClass = `transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`;
  const dynamicCardClass = isDarkMode
    ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
    : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-lg';
  const dynamicGlassClass = isDarkMode
    ? 'bg-white/5 backdrop-blur-sm border border-white/10'
    : 'bg-white border border-gray-200 shadow-xl';

  // Show loading screen on initial page load
  if (isPageLoading) {
    return <LoadingScreen />;
  }

  // Show profile loading skeleton
  if (isLoadingProfile) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50'} relative overflow-hidden`}>
        <div className="pt-20">
          <div className="max-w-5xl mx-auto px-4">
            <div className={`glass-card-enhanced rounded-2xl p-8 ${dynamicGlassClass}`}>
              <div className="animate-pulse space-y-6">
                <div className={`h-8 rounded ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} style={{ width: '60%' }}></div>
                <div className={`h-4 rounded ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} style={{ width: '80%' }}></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-32 rounded ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50'} relative overflow-hidden`}>
      {/* Analytics Dashboard Modal */}
      <Suspense fallback={<div />}>
        <AnalyticsModal
          open={showAnalytics}
          onOpenChange={setShowAnalytics}
          fetchAnalytics={fetchAnalytics}
          selectedWebsite={editingProject}
        />
      </Suspense>

      {/* AI Chat Assistant Panel */}
      <Suspense fallback={<div />}>
        <ChatModal
          open={showChat}
          onOpenChange={setShowChat}
          websiteCode={generatedCode || ""}
          onCodeUpdate={(newCode) => setGeneratedCode(newCode)}
        />
      </Suspense>

      {/* Project Save/Edit Modal */}
      <Suspense fallback={<div />}>
        <ProjectModal
          open={showProjectModal}
          onOpenChange={setShowProjectModal}
          projects={websiteHistory.map(site => ({
            id: site.id,
            name: site.name,
            date: new Date(site.timestamp).toLocaleDateString(),
            preview: site.html || ""
          }))}
          onProjectSelect={(project) => {
            setGeneratedCode(project.preview);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onProjectDelete={handleDelete}
        />
      </Suspense>

      {/* Enhanced Upgrade Modal */}
      <EnhancedUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentTier={tier}
        generationsUsed={generationsToday}
        generationsLimit={tierLimits.monthlyGenerations}
      />

      {/* Feature Lock Modal */}
      <FeatureLockModal
        isOpen={featureLockModal.isOpen}
        onClose={() => setFeatureLockModal({ ...featureLockModal, isOpen: false })}
        feature={featureLockModal.feature}
        currentTier={tier}
      />

      {/* Enhanced Animated Background Gradient */}
<div
  className={`fixed inset-0 transition-colors duration-300 pointer-events-none ${
    isDarkMode
      ? 'bg-gradient-to-br from-purple-900/30 via-gray-900 to-indigo-900/30'
      : 'bg-gradient-to-br from-blue-900/20 via-gray-50 to-purple-900/20'
  }`}
>
  <div
    className={`absolute inset-0 ${
      isDarkMode
        ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent animate-pulse'
        : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent animate-pulse'
    }`}
  ></div>

  <div
    className={`absolute inset-0 ${
      isDarkMode
        ? 'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-600/15 via-transparent to-transparent'
        : 'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-400/15 via-transparent to-transparent'
    }`}
    style={{ animationDelay: '1s' }}
  ></div>

  <div
    className={`absolute top-20 left-20 w-72 h-72 ${
      isDarkMode ? 'bg-purple-500/10' : 'bg-blue-400/10'
    } rounded-full blur-3xl animate-float-slow`}
  ></div>

  <div
    className={`absolute bottom-20 right-20 w-96 h-96 ${
      isDarkMode ? 'bg-blue-500/10' : 'bg-purple-400/10'
    } rounded-full blur-3xl animate-float-slower`}
  ></div>
</div>


      {/* Navigation */}
      <nav className={`glass-nav fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isDarkMode ? 'bg-black/40 backdrop-blur-md border-b-white/10' : 'bg-white/80 backdrop-blur-md border-b-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/app')}>
              <Sparkles className={`w-5 h-5 sm:w-6 sm:h-6 ${isDarkMode ? 'text-primary' : 'text-purple-600'}`} />
              <span className={`text-lg sm:text-xl font-bold tracking-tight ${dynamicTextClass}`}>Sento</span>
            </div>
            {/* Desktop: My Websites Button */}
            <Button
              variant="ghost"
              onClick={() => navigate('/my-websites')}
              className="hidden md:flex items-center gap-2 hover:bg-white/10"
            >
              <FolderOpen className={`w-4 h-4 ${dynamicSubtleClass}`} />
              <span className={dynamicSubtleClass}>My Websites</span>
            </Button>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`px-4 py-2 rounded-full transition-all duration-300 font-semibold relative ${
                isDarkMode
                  ? 'bg-white/10 hover:bg-white/20 text-blue-300'
                  : 'bg-gray-800/10 hover:bg-gray-800/20 text-blue-600'
              }`}
              title="AI Chat Assistant"
            >
              <span className="text-xl mr-2">💬</span>
              AI Help
            </button>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-4 py-2 rounded-full transition-all duration-300 font-semibold ${
                isDarkMode
                  ? 'bg-white/10 hover:bg-white/20 text-purple-300'
                  : 'bg-gray-800/10 hover:bg-gray-800/20 text-purple-600'
              }`}
              title="View Analytics Dashboard"
            >
              <span className="text-xl mr-2">📊</span>
              Analytics
            </button>
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-yellow-300' : 'bg-gray-800/10 hover:bg-gray-800/20 text-gray-800'}`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="text-2xl">{isDarkMode ? '☀️' : '🌙'}</span>
            </button>
            <div className={`glass-card px-4 py-2 flex items-center gap-3 transition-colors duration-300 ${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-200'}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-semibold">
                <User className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-xs ${dynamicSubtleClass}`} key={`gen-${generationsToday}-${Date.now()}`}>
  {generationsToday}/{tierLimits.monthlyGenerations} {tier === 'free' ? 'lifetime' : 'this month'}
</div>
                <UpgradeButton tier={tier} size="sm" />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className={`flex items-center gap-2 ${isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Mobile: Theme Toggle + Hamburger Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${isDarkMode ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100'}`}
            >
              <span className="text-xl">{isDarkMode ? '☀️' : '🌙'}</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-lg ${isDarkMode ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100'}`}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className={`lg:hidden border-t ${isDarkMode ? 'border-white/10 bg-black/90' : 'border-gray-200 bg-white/95'} backdrop-blur-md`}>
            <div className="px-4 py-4 space-y-3">
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/my-websites');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                My Websites
              </Button>
              <button
                onClick={() => {
                  setShowChat(!showChat);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg ${
                  isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl mr-2">💬</span>
                AI Chat Assistant
              </button>
              <button
                onClick={() => {
                  setShowAnalytics(!showAnalytics);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg ${
                  isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl mr-2">📊</span>
                Analytics
              </button>
              <div className={`px-4 py-3 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm">
                    <div className={dynamicTextClass}>Free Plan</div>
                    <div className={`text-xs ${dynamicSubtleClass}`}>
                      {isPro ? "Unlimited Generations" : `${generationsToday}/${tierLimits.monthlyGenerations} this month`}
                    </div>
                  </div>
                </div>
                <UpgradeButton tier={tier} size="sm" />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  signOut();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Upgrade Banner - Shows AFTER website is displayed */}
{showUsageBanner && (
  <UpgradeBanner 
    generationsUsed={generationsToday} 
    generationsLimit={tierLimits.monthlyGenerations}
    tier={tier}
  />
)}
      {/* Main Content */}
      <main className="relative pt-20 sm:pt-24 pb-8 sm:pb-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {!generatedCode && !isGenerating && (
            <>
              {/* Hero Section */}
              <div className="text-center mb-12 sm:mb-16 space-y-6 sm:space-y-8">
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 -z-10">
                      <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
                      <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
                      <div className="absolute top-60 left-1/3 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
                    </div>
                   
                    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight animate-fade-in-up">
                      <span className={dynamicTextClass}>Create Stunning Websites</span>
                      <br />
                      <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}>
                        with AI
                      </span>
                    </h1>
                  </div>
                  <p className={`text-lg sm:text-2xl md:text-3xl max-w-3xl mx-auto font-light ${dynamicMutedClass}`}>
                    Describe your vision. Watch AI build it in seconds.
                  </p>
                </div>
                <div className={`inline-flex items-center gap-2 glass-card rounded-full px-6 py-2 transition-colors duration-300 ${dynamicGlassClass} mt-4`}>
                  <span className="text-lg">⌨️</span>
                  <span className={`text-sm ${dynamicMutedClass}`}>
                    Powered by Groq & Llama 3.3
                  </span>
                </div>

                {/* INPUT SECTION */}
                <div className={`glass-card-enhanced rounded-2xl p-8 shadow-card animate-fade-in-up space-y-6 transition-colors duration-300 max-w-4xl mx-auto mt-12 ${dynamicGlassClass}`} style={{ animationDelay: '0.2s' }}>
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-2xl blur-xl animate-pulse-glow"></div>
                  
                  <TemplateSelector
  onSelectTemplate={(prompt) => {
    setInput(prompt);
    // Let user review the prompt before generating
  }}
  userTier={tier}
  isDarkMode={isDarkMode}
/>

                  {/* Style Selector */}
                  <div className="space-y-3">
                    <label className={`text-sm font-semibold ${dynamicTextClass}`}>
                      🎨 Design Style
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { id: 'modern', label: 'Modern', icon: '✨', color: 'from-blue-500 to-purple-500' },
                        { id: 'minimal', label: 'Minimal', icon: '⚪', color: 'from-gray-400 to-gray-600' },
                        { id: 'bold', label: 'Bold', icon: '🔥', color: 'from-red-500 to-orange-500' },
                        { id: 'elegant', label: 'Elegant', icon: '💎', color: 'from-purple-500 to-pink-500' },
                        { id: 'playful', label: 'Playful', icon: '🎈', color: 'from-green-400 to-blue-400' },
                        { id: 'professional', label: 'Professional', icon: '💼', color: 'from-blue-600 to-indigo-600' }
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-300 transform ${
                            selectedStyle === style.id
                              ? `border-transparent bg-gradient-to-r ${style.color} text-white shadow-lg scale-105 shadow-glow`
                              : isDarkMode
                              ? 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:scale-105 hover:shadow-md'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-lg'
                          }`}
                        >
                          <div className="text-2xl mb-1">{style.icon}</div>
                          <div className="font-semibold text-sm">{style.label}</div>
                          {selectedStyle === style.id && (
                            <div className="absolute top-2 right-2 text-white">✓</div>
                          )}
                        </button>
                      ))}
                    </div>
                    {selectedStyle && (
                      <p className={`text-xs ${dynamicSubtleClass}`}>
                        {STYLE_DESCRIPTIONS[selectedStyle]}
                      </p>
                    )}
                  </div>

                  {/* Smart Textarea with Glow */}
                  <div className="relative">
                    <Textarea
                      placeholder="✨ Describe your dream website... e.g., 'A modern portfolio for a graphic designer with dark theme, project gallery, and contact form'"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className={`min-h-[140px] input-glow transition-all duration-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${isDarkMode ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:bg-white/15' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-gray-50'}`}
                      rows={5}
                    />
                    {/* ✅ CORRECTED: CharacterCounter - userTier prop removed */}
                    <CharacterCounter 
                      currentLength={input.length}
                    />
                  </div>

                  {/* Live Suggestions */}
                  {input.length > 10 && input.length < 50 && (
                    <div className="flex flex-wrap gap-2 animate-fade-in-up">
                      <div className={`text-sm ${dynamicMutedClass} mb-2`}>💡 Quick suggestions:</div>
                      {['Add "with dark theme"', 'Add "mobile responsive"', 'Add "modern design"'].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(input + ' ' + suggestion.replace('Add ', ''))}
                          className="suggestion-chip"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Generate Button */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={() => handleGenerate()}
                      disabled={isGenerating || input.length < 50 || input.length > characterLimit}
                      className="group flex-1 relative bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white font-bold h-14 rounded-xl shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] animate-gradient-shift overflow-hidden"
                      style={{ backgroundSize: '200% 200%' }}
                      title="Ctrl+Enter to generate"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generating... {elapsedTime}s
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                            Generate Website
                          </>
                        )}
                      </span>
                    </Button>
                  </div>

                  <div className={`inline-flex items-center gap-2 glass-card rounded-full px-6 py-2 transition-colors duration-300 ${dynamicGlassClass} mt-4`}>
                    <span className="text-lg">⌨️</span>
                    <span className={`text-sm ${dynamicMutedClass}`}>
                      <kbd className={`px-2 py-1 rounded ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>Ctrl</kbd> +
                      <kbd className={`px-2 py-1 rounded mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>Enter</kbd> to generate •
                      <kbd className={`px-2 py-1 rounded mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>Ctrl</kbd> +
                      <kbd className={`px-2 py-1 rounded mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>/</kbd> to toggle theme
                    </span>
                  </div>
                </div>
              </div>

              {/* Template Gallery */}
              <div className="mt-16">
                <div className="text-center mb-8">
                  <h2 className={`text-3xl font-bold mb-3 ${dynamicTextClass}`}>✨ Start with a Template</h2>
                  <p className={dynamicMutedClass}>Click any template to instantly generate a professional website</p>
                </div>
                {isPageLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <SkeletonTemplate key={i} isDarkMode={isDarkMode} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {QUICK_START_TEMPLATES.map((template, index) => (
                      <button
                        key={template.id}
                        style={{ animationDelay: `${index * 0.1}s` }}
                        onClick={() => handleTemplateClick(template.prompt)}
                        disabled={isGenerating}
                        className={`group relative template-card-enhanced ${dynamicCardClass} backdrop-blur-sm rounded-xl p-6 text-left transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed animate-fade-in-up hover:scale-105 hover:shadow-2xl transform`}
                      >
                        <div className="absolute inset-0 -z-10 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        {/* ✅ FIX: Add premium badge */}
                        {template.isPremium && (
                          <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            PRO
                          </div>
                        )}
                        
                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                          {template.icon}
                        </div>
                        <h3 className={`text-xl font-bold mb-2 transition-colors ${dynamicTextClass}`}>
                          {template.name}
                        </h3>
                        <p className={`text-sm ${dynamicMutedClass}`}>
                          {template.description}
                        </p>
                        
                        {/* ✅ FIX: Add category tag */}
                        <div className="mt-3">
                          <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                            isDarkMode 
                              ? 'bg-purple-500/20 text-purple-300' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {template.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Examples Gallery */}
              <div className="mt-16">
                <h2 className={`text-3xl font-bold mb-8 text-center ${dynamicTextClass}`}>Quick Start Examples</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {examples.map((example, index) => (
                    <div key={index} className={`group relative overflow-hidden rounded-2xl ${dynamicGlassClass} shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer`} onClick={() => handleExampleClick(example.prompt, example.industry)}>
                      <div className="relative h-48 w-full overflow-hidden rounded-t-2xl">
                        <img
                          src={example.image}
                          alt={example.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className={`text-xl font-bold mb-1 ${dynamicTextClass}`}>{example.title}</h3>
                          <p className={`text-sm ${dynamicMutedClass}`}>{example.description}</p>
                        </div>
                      </div>
                      <div className="p-6">
                        <Button variant="outline" size="sm" className={`w-full justify-between ${isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                          <span>Try This Template</span>
                          <Zap className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Generating State */}
          {isGenerating && (
            <div className="text-center space-y-8 animate-fade-in-up">
              <div className="flex justify-center items-center gap-6 mb-8">
                <div className={`step-circle ${progress >= 25 ? 'active' : ''} ${progress >= 50 ? 'complete' : ''}`}>
                  🧠
                </div>
                <div className={`h-1 w-16 rounded-full transition-all duration-500 ${progress >= 50 ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'}`}></div>
                <div className={`step-circle ${progress >= 50 ? 'active' : ''} ${progress >= 75 ? 'complete' : ''}`}>
                  🎨
                </div>
                <div className={`h-1 w-16 rounded-full transition-all duration-500 ${progress >= 75 ? 'bg-gradient-to-r from-pink-500 to-blue-500' : 'bg-white/20'}`}></div>
                <div className={`step-circle ${progress >= 75 ? 'active' : ''} ${progress >= 95 ? 'complete' : ''}`}>
                  ⚡
                </div>
                <div className={`h-1 w-16 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-gradient-to-r from-blue-500 to-green-500' : 'bg-white/20'}`}></div>
                <div className={`step-circle ${progress >= 95 ? 'active' : ''} ${progress === 100 ? 'complete' : ''}`}>
                  ✅
                </div>
              </div>
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-2xl mb-4">
                  <Loader2 className={`w-8 h-8 animate-spin ${dynamicTextClass}`} />
                  <span className={dynamicTextClass}>Creating your website...</span>
                </div>
                <div className={`w-full bg-white/10 rounded-full h-3 relative overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <div
                    className="h-full bg-gradient-primary rounded-full transition-all duration-300 ease-out absolute left-0 top-0 animate-gradient"
                    style={{ width: `${progress}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
                <p className={`text-lg font-medium ${dynamicMutedClass}`}>{progressStage}</p>
                <p className={`text-sm ${dynamicSubtleClass}`}>
                  {getStatusForProgress(progress)} ({Math.round(progress)}%)
                </p>
              </div>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleCancelGeneration}
                  className={`px-6 py-2 ${isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Generation
                </Button>
              </div>
            </div>
          )}

          {/* Generated Preview */}
          {generatedCode && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <PartyPopper className="w-6 h-6 text-green-500" />
                  <div>
                    <h2 className={`text-2xl font-bold ${dynamicTextClass}`}>Your Generated Website</h2>
                    <p className={dynamicMutedClass}>Live preview - edit and download ready</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex bg-white/10 rounded-full p-1 backdrop-blur-md border ${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-200'}`}>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className={`px-4 py-2 rounded-full transition-all font-semibold ${!isEditMode ? 'bg-gradient-primary text-white shadow-glow transform scale-105' : `${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}`}
                    >
                      👁️ Preview
                    </button>
                    <button
                      onClick={() => {
                        setIsEditMode(true);
                        setEditedCode(generatedCode);
                      }}
                      className={`px-4 py-2 rounded-full transition-all font-semibold ${isEditMode ? 'bg-gradient-primary text-white shadow-glow transform scale-105' : `${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}`}
                    >
                      ✏️ Edit Code
                    </button>
                  </div>
                  {!isEditMode && (
                    <div className={`flex bg-white/10 rounded-full p-1 backdrop-blur-md border ${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-200'}`}>
                      {[
                        { icon: Monitor, mode: 'desktop' as const, label: 'Desktop' }, 
                        { icon: Tablet, mode: 'tablet' as const, label: 'Tablet' }, 
                        { icon: Smartphone, mode: 'mobile' as const, label: 'Mobile' }
                      ].map(({ icon: Icon, mode, label }) => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className={`p-3 px-4 rounded-full transition-all duration-300 flex items-center gap-2 ${viewMode === mode ? 'bg-gradient-primary text-white shadow-glow transform scale-105' : `${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'} hover:scale-105`}`}
                          title={label}
                        >
                          <Icon className="w-5 h-5" />
                          {viewMode === mode && <span className="text-sm font-semibold">{label}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerate}
                      className={`${isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNewWebsite}
                      className={`${isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Website
                    </Button>
                  </div>
                </div>
              </div>

              {isEditMode ? (
                <div className="space-y-4">
                  <div className={`relative rounded-2xl overflow-hidden border-2 ${isDarkMode ? 'border-white/20 bg-gray-900' : 'border-gray-300 bg-white'}`}>
                    <div className={`flex items-center justify-between px-4 py-2 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <span className={`text-sm font-semibold ${dynamicTextClass}`}>📝 HTML Editor</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGeneratedCode(editedCode);
                            setIsEditMode(false);
                          }}
                          className={`${isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                          💾 Save & Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditedCode(generatedCode);
                            setIsEditMode(false);
                          }}
                          className={`${isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                          ❌ Cancel
                        </Button>
                      </div>
                    </div>
                    <textarea
                      value={editedCode}
                      onChange={(e) => setEditedCode(e.target.value)}
                      className={`w-full h-[600px] p-4 font-mono text-sm resize-none focus:outline-none ${
                        isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
                      }`}
                      spellCheck={false}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* ✅ FIXED: Single preview iframe - no split */}
<div className="mb-4 border rounded-lg overflow-hidden">
  <div className="bg-gray-100 px-4 py-2 font-semibold">Preview:</div>
  <iframe
    srcDoc={sanitizedCode}
    className="w-full border-0"
    sandbox="allow-scripts allow-same-origin"
    style={{
      width: '100%',
      height: '100vh',
      minHeight: '800px',
      border: 'none',
      display: 'block',
      colorScheme: 'light',
      backgroundColor: 'white'
    }}
    title="Website Preview"
  />
  <div className="flex justify-center gap-3 mt-6">
    <button className="zoom-control group" title="Zoom Out">
      <ZoomOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
    </button>
    <button className="zoom-control group" title="Reset Zoom">
      <span className="text-sm font-bold group-hover:scale-110 transition-transform">100%</span>
    </button>
    <button className="zoom-control group" title="Zoom In">
      <ZoomIn className="w-5 h-5 group-hover:scale-110 transition-transform" />
    </button>
    <button className="zoom-control group" onClick={handleOpenFullScreen} title="Full Screen">
      <Maximize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
    </button>
  </div>
</div>
                </>
              )}

              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={handleCopy} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 transition-all shadow-lg hover:shadow-xl">
                  <Copy className="w-4 h-4" />
                  Copy Code
                </Button>
                <Button onClick={handleOpenFullScreen} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 transition-all shadow-lg hover:shadow-xl">
                  <Maximize2 className="w-4 h-4" />
                  Open Full Screen
                </Button>
                <DownloadButton 
                  generatedCode={generatedCode}
                  userTier={tier}
                  onUpgrade={() => setFeatureLockModal({ isOpen: true, feature: 'download' })}
                  isDarkMode={isDarkMode}
                />
                <Button onClick={() => setShowShareMenu(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 transition-all shadow-lg hover:shadow-xl">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button onClick={handleOpenInCodeSandbox} variant="outline" className="px-4">
                  Open in CodeSandbox
                </Button>
                <Button onClick={handleOpenInStackBlitz} variant="outline" className="px-4">
                  Open in StackBlitz
                </Button>
              </div>

              {showShareMenu && (
                <div className="relative animate-fade-in">
                  <div className={`absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border transform origin-top-right animate-scale-in ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} z-50`}>
                    <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h3 className={`font-semibold ${dynamicTextClass}`}>Share Your Website</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={dynamicMutedClass}>Link</span>
                        <Button size="sm" variant="ghost" onClick={handleCopyLink}>
                          {linkCopied ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className={`w-full px-3 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={handleShareTwitter} className="w-full">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          Twitter
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleShareLinkedIn} className="w-full">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          LinkedIn
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleShareFacebook} className="w-full">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          Facebook
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleShareEmail} className="w-full">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M0 4v8l8-4 8 4V4l-8 4-8-4zM0 20v-8l8 4 8-4v8l-8-4-8 4z"/></svg>
                          Email
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showSuccess && (
                <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40 animate-fadeIn backdrop-blur-sm">
                  <div className={`p-8 rounded-2xl text-center shadow-2xl transform animate-bounce-in ${isDarkMode ? 'bg-gradient-to-br from-green-900/90 to-emerald-900/90 text-green-100 border-green-400/50' : 'bg-gradient-to-br from-green-50 to-emerald-50 text-green-800 border-green-300'} border-2 animate-pulse-glow backdrop-blur-md`}>
                    <div className="relative">
                      <PartyPopper className="w-20 h-20 mx-auto mb-4 text-green-400 animate-spin-slow" />
                      <div className="absolute inset-0 animate-ping opacity-75">
                        <PartyPopper className="w-20 h-20 mx-auto text-green-300" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold mb-2 animate-fade-in-up">Website Generated!</h3>
                    <p className="text-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Your site is being prepared for preview...</p>
                    <div className="mt-4 flex justify-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
                      ))}
                    </div>
                </div>
              </div>
            )}
          </div>
        )}
      

      {websiteHistory.length > 0 && (
          <div className="mt-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  📂 My Projects ({getFilteredProjects().length})
                </h2>
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects..."
                      className={`pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 ${
                        isDarkMode
                          ? 'bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:border-purple-500'
                          : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-purple-500'
                      }`}
                    />
                    <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 cursor-pointer ${
                      isDarkMode
                        ? 'bg-gray-800 text-white border border-gray-700 hover:border-purple-500 focus:border-purple-500'
                        : 'bg-white text-gray-900 border border-gray-300 hover:border-purple-500 focus:border-purple-500'
                    }`}
                  >
                    <option value="all">🏷️ All Tags</option>
                    {getAllTags().map(tag => (
                      <option key={tag} value={tag}>🏷️ {tag}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                      showFavoritesOnly
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg scale-105'
                        : isDarkMode
                        ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    <span className={showFavoritesOnly ? 'animate-pulse' : ''}>⭐</span>
                    Favorites
                    {showFavoritesOnly && (
                      <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                        {getFilteredProjects().length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              {getFilteredProjects().length === 0 ? (
                <div className={`text-center py-12 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-lg">No projects found matching your filters</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterTag("all");
                      setShowFavoritesOnly(false);
                    }}
                    className={`mt-4 px-6 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : usageLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonCard key={i} isDarkMode={isDarkMode} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredProjects().map((site) => (
                    <div
                      key={site.id}
                      className={`backdrop-blur-sm rounded-xl p-6 transition-all duration-500 relative card-hover-enhanced group ${
                        isDarkMode
                          ? 'bg-white/5 border border-white/10 hover:bg-white/15 hover:border-white/30'
                          : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-purple-300 shadow-lg hover:shadow-2xl'
                      }`}
                    >
                      <button
                        onClick={() => toggleFavorite(site.id)}
                        className="absolute top-4 right-4 text-3xl transition-all duration-300 hover:scale-125 hover:rotate-12 z-10"
                        title={site.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <span className={`${site.isFavorite ? 'animate-pulse-glow' : ''}`}>
                          {site.isFavorite ? '⭐' : '☆'}
                        </span>
                      </button>
                      <div className="mb-4">
                        <h3 className={`text-xl font-bold mb-2 pr-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {site.name}
                        </h3>
                        {site.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {site.tags.map((tag, index) => (
                              <span
                                key={index}
                                className={`px-2 py-1 rounded-full text-xs tag-badge ${
                                  isDarkMode
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className={`text-sm mb-2 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {site.prompt}
                        </p>
                        {site.notes && (
                          <p className={`text-xs italic mb-2 line-clamp-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            📝 {site.notes}
                          </p>
                        )}
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Created: {new Date(site.timestamp).toLocaleDateString()} at{' '}
                          {new Date(site.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                     <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setGeneratedCode(site.html || "");
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                            isDarkMode
                              ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 hover:shadow-lg'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md'
                          }`}
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => openEditProject(site)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                            isDarkMode
                              ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 hover:shadow-lg'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md'
                          }`}
                        >
                          ✏️ Edit
                        </button>
                        
                        {/* 📧 FORM SUBMISSIONS BUTTON - Show only for published sites */}
                        {(site as any).deployment_status === 'live' && (
                          <button
                            onClick={() => openFormSubmissions(site.id)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                              isDarkMode
                                ? 'bg-green-500/20 text-green-300 hover:bg-green-500/40 hover:shadow-lg'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-md'
                            }`}
                          >
                            <Mail className="w-4 h-4 inline mr-1" />
                            Forms
                          </button>
                        )}
                        
                        {/* 🚀 PUBLISH BUTTON - NEW */}
                        {(site as any).deployment_status === 'live' ? (
                          <div className="flex-1 flex flex-col gap-1">
                            <a 
                              href={(site as any).deployment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                isDarkMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-700'
                              }`}
                            >
                              ✅ Live: {((site as any).deployment_url || '').replace('https://', '').substring(0, 20)}...
                            </a>
                            <button
                              onClick={() => handleUnpublish(site.id)}
                              disabled={unpublishingId === site.id}
                              className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                isDarkMode
                                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/40'
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                              }`}
                            >
                              {unpublishingId === site.id ? '⏳ Unpublishing...' : '❌ Unpublish'}
                            </button>
                          </div>
                        ) : (site as any).deployment_status === 'deploying' ? (
                          <button disabled className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-gray-500/20 text-gray-400">
                            ⏳ Publishing...
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePublish(site.id)}
                            disabled={publishingId === site.id}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                              isDarkMode
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
                                : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-md'
                            }`}
                          >
                            {publishingId === site.id ? '⏳ Publishing...' : '🚀 Publish Live'}
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(site.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-110 hover:rotate-6 ${
                            isDarkMode
                              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/40 hover:shadow-lg'
                              : 'bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-md'
                          }`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 📧 FORM SUBMISSIONS MODAL */}
      {showFormSubmissionsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-2xl font-bold flex items-center gap-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    <Mail className="w-6 h-6" />
                    Form Submissions
                  </h2>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {formSubmissions.length} total submission{formSubmissions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowFormSubmissionsModal(false);
                    setSelectedWebsiteForForms(null);
                    setFormSubmissions([]);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingSubmissions ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Loading submissions...
                  </p>
                </div>
              ) : formSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className={`w-16 h-16 mx-auto mb-4 ${
                    isDarkMode ? 'text-gray-700' : 'text-gray-300'
                  }`} />
                  <p className={`text-lg font-semibold mb-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No form submissions yet
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    When someone fills out a form on your published page, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className={`p-4 rounded-lg border transition-all ${
                        submission.is_read
                          ? isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                          : isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {!submission.is_read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                            <span className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {new Date(submission.created_at).toLocaleDateString()} at{' '}
                              {new Date(submission.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          {/* Form Data */}
                          <div className="space-y-2 mt-3">
                            {Object.entries(submission.form_data || {})
                              .filter(([key]) => key !== 'website_id')
                              .map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className={`text-sm font-semibold capitalize ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    {key}:
                                  </span>
                                  <span className={`text-sm ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleMarkAsRead(submission.id, !submission.is_read)}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                              isDarkMode
                                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {submission.is_read ? '✉️ Unread' : '✅ Read'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this submission?')) {
                                handleDeleteSubmission(submission.id);
                              }
                            }}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                              isDarkMode
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed bottom-8 right-8 p-4 rounded-full shadow-2xl transition-all duration-300 z-[60] hover:scale-110 ${
            isDarkMode
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
          }`}
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .hover-scale { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-scale:hover { transform: scale(1.05); box-shadow: 0 10px 40px rgba(168, 85, 247, 0.4); }
        .hover-scale:active { transform: scale(0.98); }
        .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-hover:hover { transform: translateY(-8px); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2); }
        @keyframes gradient-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-gradient { background-size: 200% 200%; animation: gradient-shift 3s ease infinite; }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); } 50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.8); } }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out; }
        .input-glow { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
        .char-counter-red { color: #ef4444; }
        .char-counter-yellow { color: #eab308; }
        .char-counter-green { color: #22c55e; }
        .suggestion-chip { padding: 4px 8px; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px; color: #a855f7; font-size: 12px; cursor: pointer; transition: all 0.2s; }
        .suggestion-chip:hover { background: rgba(168, 85, 247, 0.3); transform: scale(1.05); }
        .step-circle { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 3px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.1); transition: all 0.3s ease; }
        .step-circle.active { border-color: #a855f7; background: rgba(168, 85, 247, 0.2); transform: scale(1.1); }
        .step-circle.complete { border-color: #22c55e; background: rgba(34, 197, 94, 0.2); animation: pulse 1s infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .device-frame-desktop { border-radius: 20px; border: 20px solid #000; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
        .device-frame-desktop iframe { border-radius: 0; }
        .device-frame-tablet { border-radius: 30px; border: 15px solid #000; max-width: 768px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
        .device-frame-tablet iframe { border-radius: 0; }
        .device-frame-mobile { border-radius: 40px; border: 10px solid #000; max-width: 375px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
        .device-frame-mobile iframe { border-radius: 0; }
        .zoom-control { width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; color: white; transition: all 0.2s; cursor: pointer; }
        .zoom-control:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.1); }
        @keyframes float-slow { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -30px); } }
        @keyframes float-slower { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-40px, 40px); } }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-slower { animation: float-slower 10s ease-in-out infinite; }
        .glass-card-enhanced { position: relative; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); }
        .shadow-glow { box-shadow: 0 0 30px rgba(168, 85, 247, 0.3); }
        .input-glow:focus { 
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.5); 
          transform: scale(1.01);
        }
        @keyframes button-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.4); }
          50% { box-shadow: 0 0 50px rgba(168, 85, 247, 0.8); }
        }
        .shadow-glow:hover { 
          animation: button-pulse 1.5s ease-in-out infinite; 
        }
        .template-card-enhanced:hover {
          box-shadow: 0 20px 60px rgba(168, 85, 247, 0.3);
        }
        .device-frame-3d {
          box-shadow: 
            0 30px 90px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 0 40px rgba(255, 255, 255, 0.05);
          transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .device-frame-3d:hover {
          box-shadow: 
            0 40px 120px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.2),
            inset 0 0 60px rgba(255, 255, 255, 0.08);
        }

        @keyframes scale-in {
          from { 
            opacity: 0; 
            transform: scale(0.9) translateY(-10px); 
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes bounce-in {
          0% { 
            opacity: 0; 
            transform: scale(0.3); 
          }
          50% { 
            opacity: 1; 
            transform: scale(1.05); 
          }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 1s linear;
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }

        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        .zoom-control {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .zoom-control:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.15);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        .zoom-control:active {
          transform: scale(0.95);
        }
        .card-hover-enhanced {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .card-hover-enhanced::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s;
        }

        .card-hover-enhanced:hover::before {
          left: 100%;
        }

        .card-hover-enhanced:hover {
          transform: translateY(-8px) scale(1.02);
        }

        @keyframes tag-pop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .card-hover-enhanced:hover .tag-badge {
          animation: tag-pop 0.3s ease-in-out;
        }

        input:focus, select:focus {
          transform: scale(1.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

                        @keyframes favorite-bounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.2) rotate(-10deg); }
          75% { transform: scale(1.2) rotate(10deg); }
        }

        button:active [class*="animate-pulse-glow"] {
          animation: favorite-bounce 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Index;
