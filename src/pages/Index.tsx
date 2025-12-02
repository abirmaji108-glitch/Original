import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  MessageSquare,
  Lightbulb,
  Zap,
  Loader2,
  Download,
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
import { useUsageTracking } from '@/hooks/use-usage-tracking';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/ui/spinner';
const TEMPLATES = [
  {
    id: "portfolio",
    icon: "🎨",
    title: "Portfolio Website",
    description: "Showcase your work and skills",
    prompt: "Create a modern portfolio website with a hero section, about me section, skills grid with icons, project gallery with 6 projects showing images and descriptions, contact form, and smooth scrolling navigation. Use a gradient background from purple to blue. Make it clean and professional."
  },
  {
    id: "ecommerce",
    icon: "🏪",
    title: "E-commerce Store",
    description: "Online shopping experience",
    prompt: "Build an e-commerce website with a header with shopping cart icon, featured products grid showing 8 products with images, prices, and 'Add to Cart' buttons, product categories sidebar, promotional banner, customer testimonials section, and footer with social links. Use a modern, trustworthy design with green accents."
  },
  {
    id: "blog",
    icon: "📰",
    title: "Blog/News Site",
    description: "Content-focused publishing platform",
    prompt: "Design a blog website with a clean header, featured article hero section with large image, grid of 6 blog post cards showing thumbnails, titles, excerpts, and dates, sidebar with popular posts and categories, author bio section, and newsletter signup form. Use a minimal, readable design with plenty of white space."
  },
  {
    id: "restaurant",
    icon: "🍕",
    title: "Restaurant Menu",
    description: "Delicious food showcase",
    prompt: "Create a restaurant website with a hero section showing food imagery, about the restaurant section, interactive menu with categories (Appetizers, Main Courses, Desserts, Drinks) showing dish names, descriptions, and prices, gallery of food photos, reservation form, location map, and opening hours. Use warm colors like orange and red."
  },
  {
    id: "business",
    icon: "💼",
    title: "Business Landing",
    description: "Professional company page",
    prompt: "Build a business landing page with a bold hero section with call-to-action button, services section with 4 service cards with icons, company statistics (clients, projects, awards), team members grid with photos and roles, client logos section, pricing tables with 3 tiers, and contact form. Use a corporate blue and white color scheme."
  },
  {
    id: "gaming",
    icon: "🎮",
    title: "Gaming Community",
    description: "Gamers unite platform",
    prompt: "Design a gaming community website with an energetic hero section, featured games carousel, leaderboard table showing top 10 players, upcoming tournaments section with dates and prizes, gaming news cards, live stream section, join community form, and Discord integration button. Use dark theme with neon purple and cyan accents."
  }
];
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
const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
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
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('websiteHistory');
    if (saved) {
      const history = JSON.parse(saved);
      setWebsiteHistory(history);
      calculateAnalytics();
    }
  }, []);
  useEffect(() => {
    calculateAnalytics();
  }, [websiteHistory]);
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);
  // Get authenticated user ID
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);
  // Check if there's a shared website in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCode = params.get('shared');
    if (sharedCode && !generatedCode) {
      try {
        const decodedCode = decodeURIComponent(atob(sharedCode));
        setGeneratedCode(decodedCode);
        // Scroll to preview
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
  }, []);
  const { usage, loading: usageLoading, incrementUsage } = useUsageTracking(userId);
  const calculateAnalytics = () => {
    const history = websiteHistory;
    // Total generated
    const totalGenerated = history.length;
    // Average generation time (simulate based on complexity)
    const avgTime = history.length > 0
      ? Math.floor((history.reduce((sum, site) => sum + site.prompt.length, 0) / history.length) / 10)
      : 0;
    // Template usage tracking
    const templateUsage: Record<string, number> = {};
    TEMPLATES.forEach(template => {
      const count = history.filter(site =>
        site.prompt.toLowerCase().includes(template.title.toLowerCase().split(' ')[0])
      ).length;
      if (count > 0) {
        templateUsage[template.title] = count;
      }
    });
    // Generation dates for chart
    const generationDates = history.map(site =>
      new Date(site.timestamp).toLocaleDateString()
    );
    // Calculate storage used
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
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    // Add user message to chat
    const newMessages = [...chatMessages, { role: 'user' as const, content: userMessage }];
    setChatMessages(newMessages);
    setIsChatLoading(true);
    try {
      // Call Backend API
      const response = await fetch("https://original-lbxv.onrender.com/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: userMessage
        })
      });
      const data = await response.json();
      // Extract text from response (assuming backend returns response in htmlCode field for chat)
      const assistantMessage = data.htmlCode || "I'm here to help! Could you please rephrase your question?";
      // Add assistant response to chat
      setChatMessages([...newMessages, {
        role: 'assistant' as const,
        content: assistantMessage
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages([...newMessages, {
        role: 'assistant' as const,
        content: "Sorry, I encountered an error. Please try again!"
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };
  const clearChat = () => {
    setChatMessages([]);
    setChatInput("");
  };
  const startNewChat = () => {
    clearChat();
    setShowChat(true);
  };
  // Auto-fill textarea when industry changes
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
    // Encode HTML to base64 for URL
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
    // Extract CSS and JS from HTML
    const styleMatch = generatedCode.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : '';
    const scriptMatch = generatedCode.match(/<script>([\s\S]*?)<\/script>/);
    const scripts = scriptMatch ? scriptMatch[1] : '';
    // Create clean HTML
    let cleanHtml = generatedCode
      .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="./styles.css">')
      .replace(/<script>[\s\S]*?<\/script>/, '<script src="./script.js"></script>');
    // Create CodeSandbox parameters
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
    // Compress and encode
    const compressed = JSON.stringify(parameters);
    const encoded = btoa(unescape(encodeURIComponent(compressed)));
    // Open in new tab
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
    // Extract CSS and JS from HTML
    const styleMatch = generatedCode.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : '';
    const scriptMatch = generatedCode.match(/<script>([\s\S]*?)<\/script>/);
    const scripts = scriptMatch ? scriptMatch[1] : '';
    // Create clean HTML
    let cleanHtml = generatedCode
      .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="styles.css">')
      .replace(/<script>[\s\S]*?<\/script>/, '<script src="script.js"></script>');
    // Create project structure
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
    // Create StackBlitz URL with encoded project
    const projectString = JSON.stringify(project);
    const encoded = btoa(encodeURIComponent(projectString));
    // Open StackBlitz
    window.open(`https://stackblitz.com/edit/html-${Date.now()}?project=${encoded}`, '_blank');
  };
  const getStatusForProgress = (progress: number): string => {
    if (progress < 20) return "🤖 AI analyzing your requirements...";
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
      // Extract title from description or use default
      const name = input.split('\n')[0].slice(0, 50) || 'Untitled Website';
      // Save to Supabase database
      const { data, error } = await supabase
        .from('websites')
        .insert({
          user_id: userId,
          name: name,
          prompt: input,
          html_code: htmlCode,
        })
        .select()
        .single();
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
      // Also save to localStorage as backup
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
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setProgressStage(stages[currentStage].message);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 8000); // Change stage every 8 seconds
    return interval;
  };
  const saveProjectDetails = () => {
    if (!editingProject) return;
    const updatedHistory = websiteHistory.map(site =>
      site.id === editingProject
        ? {
            ...site,
            name: projectName.trim() || `Website ${websiteHistory.length}`,
            tags: projectTags,
            notes: projectNotes
          }
        : site
    );
    setWebsiteHistory(updatedHistory);
    localStorage.setItem('websiteHistory', JSON.stringify(updatedHistory));
    setShowProjectModal(false);
    setEditingProject(null);
    setProjectName("");
    setProjectTags([]);
    setProjectNotes("");
  };
  const toggleFavorite = (id: string) => {
    const updatedHistory = websiteHistory.map(site =>
      site.id === id ? { ...site, isFavorite: !site.isFavorite } : site
    );
    setWebsiteHistory(updatedHistory);
    localStorage.setItem('websiteHistory', JSON.stringify(updatedHistory));
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
    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(site =>
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    // Tag filter
    if (filterTag !== "all") {
      filtered = filtered.filter(site => site.tags.includes(filterTag));
    }
    // Favorites filter
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
  const handleGenerate = async () => {
    // Check usage limit FIRST
    if (!usage.canGenerate) {
      toast({
        title: "Generation Limit Reached",
        description: `You've reached your ${usage.generationsLimit} free generations for this month. Upgrade to Pro for unlimited website generation! 🚀`,
        variant: "destructive",
      });
      return;
    }
    if (input.trim().length === 0 || input.length > 3000) {
      toast({
        title: "Invalid Prompt Length",
        description: input.length > 3000 ? "Maximum 3000 characters allowed. Please shorten your description." : "Please enter a description.",
        variant: "destructive",
      });
      return;
    }
    if (input.length < 50) {
      toast({
        title: "Description too short",
        description: "Please describe your website with at least 50 characters",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    setProgress(0);
    setGeneratedCode(null);
    setShowSuccess(false);
    // Create abort controller
    abortControllerRef.current = new AbortController();
    // Start progress simulation
    const progressInterval = simulateProgress();
    // Smooth progress animation
    const progressInterval2 = setInterval(() => {
      setProgress((p) => {
        const newProgress = Math.min(p + 0.5, 95);
        return newProgress;
      });
    }, 150);
    try {
      const styleInstruction = STYLE_DESCRIPTIONS[selectedStyle] || STYLE_DESCRIPTIONS.modern;
      const prompt = `Generate a complete, production-ready, single-file HTML website based on this description:
${input}
DESIGN STYLE: ${selectedStyle.toUpperCase()}
${styleInstruction}
Apply this design style consistently throughout the website.
REQUIREMENTS:
- Complete HTML5 document starting with <!DOCTYPE html>
- Use Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
- Inline all CSS in <style> tags if needed beyond Tailwind
- Inline all JavaScript in <script> tags
- Mobile-first responsive design
- Modern, professional design with smooth animations
- Use SPECIFIC placeholder images from Unsplash based on the website content:
  * For hero sections: https://source.unsplash.com/1920x1080?{main-topic}
  * For team/people: https://source.unsplash.com/800x800?portrait,professional
  * For products: https://source.unsplash.com/800x600?{product-type}
  * For backgrounds: https://source.unsplash.com/1920x1080?{theme},abstract
  * Replace {keywords} with SPECIFIC terms from the description (e.g., "fitness" for gym, "food" for restaurant)
- IMPORTANT: Use different, relevant Unsplash keywords for each image based on its context
- Include realistic placeholder text and content
- Professional color scheme matching the description
- Proper semantic HTML5 tags
- Accessibility features (alt tags, ARIA labels)
Return ONLY the complete HTML code. No explanations, no markdown, no code blocks - just the raw HTML starting with <!DOCTYPE html>`;
      setLastPrompt(prompt);
      const response = await fetch('https://original-lbxv.onrender.com/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt }),
        signal: abortControllerRef.current?.signal
      });
      // Clear intervals after fetch
      clearInterval(progressInterval);
      clearInterval(progressInterval2);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      let htmlCode = data.htmlCode;
      // Save to history
      const newWebsite = {
        id: Date.now().toString(),
        name: `Website ${websiteHistory.length + 1}`,
        prompt: prompt,
        html: htmlCode,
        timestamp: Date.now(),
        tags: [],
        isFavorite: false,
        notes: "",
        thumbnail: ""
      };
      const updatedHistory = [newWebsite, ...websiteHistory];
      setWebsiteHistory(updatedHistory);
      localStorage.setItem('websiteHistory', JSON.stringify(updatedHistory));
      // Show save project modal after generation
      setTimeout(() => {
        setEditingProject(newWebsite.id);
        setProjectName(newWebsite.name);
        setProjectTags([]);
        setProjectNotes("");
        setShowProjectModal(true);
      }, 1000);
      setProgress(100);
      setProgressStage("✅ Complete! Your website is ready.");
      // Increment usage counter
      await incrementUsage();
      // Show success state for 2 seconds
      setShowSuccess(true);
      setTimeout(async () => {
        setGeneratedCode(htmlCode);
        await saveWebsite(htmlCode);
        setIsGenerating(false);
        setShowSuccess(false);
        setProgress(0);
        setProgressStage("");
        toast({
          title: "Success! 🎉",
          description: "🎉 Your professional website is ready! Preview it below or download the files.",
        });
      }, 2000);
    } catch (error) {
      clearInterval(progressInterval);
      clearInterval(progressInterval2);
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Generation cancelled",
          description: "Website generation was cancelled",
        });
      } else {
        console.error('Generation error:', error);
        toast({
          title: "Generation failed",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
      setIsGenerating(false);
      setProgress(0);
      setProgressStage("");
      setShowSuccess(false);
    }
  };
  const handleRegenerate = async () => {
    if (!lastPrompt) {
      toast({
        title: "No prompt to regenerate",
        description: "Please generate a website first.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    setProgress(0);
    setGeneratedCode(null);
    setShowSuccess(false);
    // Create abort controller
    abortControllerRef.current = new AbortController();
    // Start progress simulation
    const progressInterval = simulateProgress();
    // Smooth progress animation
    const progressInterval2 = setInterval(() => {
      setProgress((p) => {
        const newProgress = Math.min(p + 0.5, 95);
        return newProgress;
      });
    }, 150);
    try {
      const response = await fetch('https://original-lbxv.onrender.com/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: lastPrompt }),
        signal: abortControllerRef.current?.signal
      });
      // Clear intervals after fetch
      clearInterval(progressInterval);
      clearInterval(progressInterval2);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      let htmlCode = data.htmlCode;
      // Save to history
      const newWebsite = {
        id: Date.now().toString(),
        name: `Website ${websiteHistory.length + 1}`,
        prompt: lastPrompt,
        html: htmlCode,
        timestamp: Date.now(),
        tags: [],
        isFavorite: false,
        notes: "",
        thumbnail: ""
      };
      const updatedHistory = [newWebsite, ...websiteHistory];
      setWebsiteHistory(updatedHistory);
      localStorage.setItem('websiteHistory', JSON.stringify(updatedHistory));
      // Show save project modal after generation
      setTimeout(() => {
        setEditingProject(newWebsite.id);
        setProjectName(newWebsite.name);
        setProjectTags([]);
        setProjectNotes("");
        setShowProjectModal(true);
      }, 1000);
      setProgress(100);
      setProgressStage("✅ Complete! Your website is ready.");
      // Show success state for 2 seconds
      setShowSuccess(true);
      setTimeout(async () => {
        setGeneratedCode(htmlCode);
        await saveWebsite(htmlCode);
        setIsGenerating(false);
        setShowSuccess(false);
        setProgress(0);
        setProgressStage("");
        toast({
          title: "Regenerated! 🎉",
          description: "✨ Fresh version generated! Your website has been regenerated with a new design.",
        });
      }, 2000);
    } catch (error) {
      clearInterval(progressInterval);
      clearInterval(progressInterval2);
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Regeneration cancelled",
          description: "Website regeneration was cancelled",
        });
      } else {
        console.error('Regeneration error:', error);
        toast({
          title: "Regeneration failed",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
      setIsGenerating(false);
      setProgress(0);
      setProgressStage("");
      setShowSuccess(false);
    }
  };
  const handleDelete = (id: string) => {
    const updatedHistory = websiteHistory.filter(site => site.id !== id);
    setWebsiteHistory(updatedHistory);
    localStorage.setItem('websiteHistory', JSON.stringify(updatedHistory));
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
    const zip = new JSZip();
    // Extract CSS from HTML
    const styleMatch = generatedCode.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : '';
    // Extract JS from HTML
    const scriptMatch = generatedCode.match(/<script>([\s\S]*?)<\/script>/);
    const scripts = scriptMatch ? scriptMatch[1] : '';
    // Create clean HTML without inline styles/scripts
    let cleanHtml = generatedCode
      .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="styles.css">')
      .replace(/<script>[\s\S]*?<\/script>/, '<script src="script.js"></script>');
    // Add files to ZIP
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
    // Generate and download ZIP
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `website-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded!",
      description: "Your website ZIP has been saved",
    });
  };
  const handleCopy = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard! Paste it into any code editor or StackBlitz.",
    });
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
  const handleTemplateClick = (prompt: string) => {
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Auto-generate with template prompt
    setInput(prompt);
    handleGenerate();
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
  const characterLimit = 3000;
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
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50'} relative overflow-hidden`}>
      {/* Analytics Dashboard Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header */}
            <div className={`sticky top-0 p-6 border-b backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-3xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    📊 Analytics Dashboard
                  </h2>
                  <p className={`text-sm mt-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Track your website generation stats and insights
                  </p>
                </div>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Generated */}
                <div className={`p-4 rounded-xl border ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30'
                    : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
                }`}>
                  <div className="text-3xl mb-2">🎨</div>
                  <div className={`text-3xl font-bold mb-1 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {analytics.totalGenerated}
                  </div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Websites Generated
                  </div>
                </div>
                {/* Average Time */}
                <div className={`p-4 rounded-xl border ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30'
                    : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                }`}>
                  <div className="text-3xl mb-2">⏱️</div>
                  <div className={`text-3xl font-bold mb-1 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {analytics.averageTime}s
                  </div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Avg Generation Time
                  </div>
                </div>
                {/* Storage Used */}
                <div className={`p-4 rounded-xl border ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30'
                    : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'
                }`}>
                  <div className="text-3xl mb-2">💾</div>
                  <div className={`text-3xl font-bold mb-1 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {analytics.totalStorageKB}KB
                  </div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Storage Used
                  </div>
                </div>
                {/* Templates Used */}
                <div className={`p-4 rounded-xl border ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30'
                    : 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200'
                }`}>
                  <div className="text-3xl mb-2">📋</div>
                  <div className={`text-3xl font-bold mb-1 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {Object.keys(analytics.templateUsage).length}
                  </div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Templates Used
                  </div>
                </div>
              </div>
              {/* Template Usage Chart */}
              {Object.keys(analytics.templateUsage).length > 0 && (
                <div className={`p-6 rounded-xl border ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <h3 className={`text-xl font-bold mb-4 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    🎨 Popular Templates
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.templateUsage)
                      .sort(([, a], [, b]) => b - a)
                      .map(([template, count]) => (
                        <div key={template}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {template}
                            </span>
                            <span className={`text-sm font-bold ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {count}
                            </span>
                          </div>
                          <div className={`h-2 rounded-full overflow-hidden ${
                            isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                          }`}>
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                              style={{ width: `${(count / analytics.totalGenerated) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {/* Recent Activity */}
              <div className={`p-6 rounded-xl border ${
                isDarkMode
                  ? 'bg-white/5 border-white/10'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`text-xl font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🔥 Recent Activity
                </h3>
                {websiteHistory.length === 0 ? (
                  <p className={`text-center py-8 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No websites generated yet. Start creating to see your activity!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {websiteHistory.slice(0, 5).map((site, index) => (
                      <div
                        key={site.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isDarkMode ? 'bg-gray-800/50' : 'bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {site.prompt.substring(0, 50)}...
                          </p>
                          <p className={`text-xs ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {new Date(site.timestamp).toLocaleDateString()} at{' '}
                            {new Date(site.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <span className="text-xl">✅</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Generation Frequency */}
              <div className={`p-6 rounded-xl border ${
                isDarkMode
                  ? 'bg-white/5 border-white/10'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`text-xl font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  📈 Generation Frequency
                </h3>
                <div className="space-y-2">
                  {Object.entries(getGenerationsPerDay())
                    .slice(-7)
                    .map(([date, count]) => (
                      <div key={date} className="flex items-center gap-3">
                        <span className={`text-sm w-24 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {date}
                        </span>
                        <div className="flex-1 flex items-center gap-1">
                          {Array.from({ length: count }).map((_, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500"
                            />
                          ))}
                        </div>
                        <span className={`text-sm font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* AI Chat Assistant Panel */}
      {showChat && (
        <div className="fixed bottom-4 right-4 z-50 animate-slideUp">
          <div className={`w-96 h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
            isDarkMode
              ? 'bg-gray-900 border border-gray-700'
              : 'bg-white border border-gray-200'
          }`}>
            {/* Chat Header */}
            <div className={`p-4 border-b ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl">
                    🤖
                  </div>
                  <div>
                    <h3 className={`font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      AI Assistant
                    </h3>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {isChatLoading ? 'Typing...' : 'Online'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {chatMessages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'hover:bg-gray-700 text-gray-400'
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                      title="Clear chat"
                    >
                      <span className="text-lg">🗑️</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowChat(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? 'hover:bg-gray-700 text-gray-400'
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="text-lg">✕</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="text-6xl mb-4">💬</div>
                  <h4 className={`text-lg font-bold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Hi! I'm your AI assistant
                  </h4>
                  <p className={`text-sm mb-6 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Ask me anything about creating websites!
                  </p>
                  {/* Quick Suggestions */}
                  <div className="space-y-2 w-full">
                    <p className={`text-xs font-semibold mb-2 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      Try asking:
                    </p>
                    {[
                      "What makes a great portfolio website?",
                      "How do I improve my website prompt?",
                      "Suggest colors for a restaurant site",
                      "What features should an e-commerce site have?"
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setChatInput(suggestion);
                          setTimeout(() => sendChatMessage(), 100);
                        }}
                        className={`w-full text-left p-3 rounded-lg text-sm transition-all hover:scale-105 ${
                          isDarkMode
                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        💡 {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                            : isDarkMode
                            ? 'bg-gray-800 text-gray-200'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className={`rounded-2xl px-4 py-3 ${
                        isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                      }`}>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Chat Input */}
            <div className={`p-4 border-t ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  placeholder="Ask me anything..."
                  disabled={isChatLoading}
                  className={`flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-white placeholder-gray-400'
                      : 'bg-white text-gray-900 placeholder-gray-500 border border-gray-300'
                  } disabled:opacity-50`}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                    chatInput.trim() && !isChatLoading
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                      : isDarkMode
                      ? 'bg-gray-700 text-gray-500'
                      : 'bg-gray-200 text-gray-400'
                  } disabled:cursor-not-allowed`}
                >
                  {isChatLoading ? '⏳' : '🚀'}
                </button>
              </div>
              <p className={`text-xs mt-2 text-center ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Project Save/Edit Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className={`max-w-2xl w-full rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Modal Header */}
            <div className={`p-6 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  💾 Save Project Details
                </h2>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode
                      ? 'hover:bg-gray-800 text-gray-400'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>
            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Project Name */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., My Portfolio Website"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode
                      ? 'bg-gray-800 text-white placeholder-gray-500 border border-gray-700'
                      : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300'
                  }`}
                />
              </div>
              {/* Tags */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Tags (Press Enter to add)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {projectTags.map((tag, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
                        isDarkMode
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add tags (Portfolio, Business, E-commerce...)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode
                      ? 'bg-gray-800 text-white placeholder-gray-500 border border-gray-700'
                      : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300'
                  }`}
                />
                {/* Quick Tag Buttons */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Portfolio', 'Business', 'E-commerce', 'Blog', 'Restaurant', 'Landing Page'].map(quickTag => (
                    <button
                      key={quickTag}
                      onClick={() => addTag(quickTag)}
                      disabled={projectTags.includes(quickTag)}
                      className={`px-3 py-1 rounded-full text-xs transition-all ${
                        projectTags.includes(quickTag)
                          ? isDarkMode
                            ? 'bg-gray-800 text-gray-600'
                            : 'bg-gray-200 text-gray-400'
                          : isDarkMode
                          ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } disabled:cursor-not-allowed`}
                    >
                      + {quickTag}
                    </button>
                  ))}
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Notes (Optional)
                </label>
                <textarea
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  placeholder="Add any notes about this project..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    isDarkMode
                      ? 'bg-gray-800 text-white placeholder-gray-500 border border-gray-700'
                      : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300'
                  }`}
                />
              </div>
            </div>
            {/* Modal Footer */}
            <div className={`p-6 border-t flex justify-end gap-3 ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setShowProjectModal(false)}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={saveProjectDetails}
                className="px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all"
              >
                💾 Save Project
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Animated Background Gradient */}
      <div className={`fixed inset-0 transition-colors duration-300 pointer-events-none ${isDarkMode ? 'bg-gradient-to-br from-purple-900/20 via-gray-900 to-indigo-900/20' : 'bg-gradient-to-br from-blue-900/10 via-gray-50 to-purple-900/10'}`}>
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-600/10 via-transparent to-transparent animate-pulse' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/10 via-transparent to-transparent animate-pulse'}`}></div>
      </div>
      {/* Navigation */}
      <nav className={`glass-nav fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isDarkMode ? 'bg-black/40 backdrop-blur-md border-b-white/10' : 'bg-white/80 backdrop-blur-md border-b-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/app')}>
              <Sparkles className={`w-6 h-6 ${isDarkMode ? 'text-primary' : 'text-purple-600'}`} />
              <span className={`text-xl font-bold tracking-tight ${dynamicTextClass}`}>Sento</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/my-websites')}
              className="flex items-center gap-2 hover:bg-white/10"
            >
              <FolderOpen className={`w-4 h-4 ${dynamicSubtleClass}`} />
              <span className={dynamicSubtleClass}>My Websites</span>
            </Button>
          </div>
          <div className="flex items-center gap-3">
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
              {chatMessages.length > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {chatMessages.length}
                </span>
              )}
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
              <div className="text-sm">
                <div className={dynamicTextClass}>Free Plan</div>
                <div className={`text-xs ${dynamicSubtleClass}`}>
                  Credits: {usage.generationsUsed}/{usage.generationsLimit}{" "}
                  <a href="#" className={`hover:underline ${isDarkMode ? 'text-primary' : 'text-purple-600'}`}>
                    Upgrade
                  </a>
                </div>
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
        </div>
      </nav>
      {/* Main Content */}
      <main className="relative pt-24 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          {!generatedCode && !isGenerating && (
            <>
              {/* Hero Section */}
              <div className="text-center mb-16 space-y-8">
                <div className="space-y-6">
                  <h1 className={`text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight ${dynamicTextClass}`}>
                    Create Stunning Websites{" "}
                    <span className="gradient-text animate-glow">with AI</span>
                  </h1>
                  <p className={`text-2xl md:text-3xl max-w-3xl mx-auto font-light ${dynamicMutedClass}`}>
                    Describe your vision. Watch AI build it in seconds.
                  </p>
                </div>
                {/* Demo Video Placeholder */}
                <div className="max-w-4xl mx-auto mt-12">
                  <div className={`glass-card rounded-2xl p-2 shadow-glow transition-colors duration-300 ${dynamicGlassClass}`}>
                    <div className={`relative aspect-video rounded-xl flex items-center justify-center overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-purple-900/40 to-indigo-900/40' : 'bg-gradient-to-br from-blue-900/20 to-purple-900/20'}`}>
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1547658719-da2b51169166?w=1200&h=675&fit=crop')] bg-cover bg-center opacity-30"></div>
                      <div className="relative z-10 text-center space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center shadow-glow hover-scale cursor-pointer">
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                        <p className={`text-lg font-medium ${dynamicTextClass}`}>Watch How It Works</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-2 glass-card rounded-full px-6 py-2 transition-colors duration-300 ${dynamicGlassClass}`}>
                  <Sparkles className={`w-5 h-5 ${isDarkMode ? 'text-primary' : 'text-purple-600'}`} />
                  <span className={dynamicMutedClass}>
                    Powered by Groq & Llama 3.3
                  </span>
                </div>
              </div>
              {/* Input Card */}
              <div className={`glass-card rounded-2xl p-8 shadow-card animate-slide-up space-y-6 transition-colors duration-300 ${dynamicGlassClass}`}>
                {/* Template Gallery */}
                <div className="mb-12">
                  <div className="text-center mb-8">
                    <h2 className={`text-3xl font-bold mb-3 ${dynamicTextClass}`}>✨ Start with a Template</h2>
                    <p className={dynamicMutedClass}>Click any template to instantly generate a professional website</p>
                  </div>
                  {isPageLoading ? (
  // Skeleton Loading State for Templates
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <SkeletonTemplate key={i} isDarkMode={isDarkMode} />
    ))}
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateClick(template.prompt)}
                        disabled={isGenerating}
                        className={`group relative ${dynamicCardClass} backdrop-blur-sm rounded-xl p-6 text-left hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                      >
                        {/* Template Icon */}
                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                          {template.icon}
                        </div>
                        {/* Template Title */}
                        <h3 className={`text-xl font-bold mb-2 transition-colors ${dynamicTextClass}`}>
                          {template.title}
                        </h3>
                        <p className={`text-sm ${dynamicMutedClass}`}>
                          {template.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                </div>
                {/* Industry Select */}
                <div className="flex items-center gap-4">
                  <Select value={industry} onValueChange={handleIndustryChange}>
                    <SelectTrigger className={`flex-1 ${isDarkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                      <SelectValue placeholder="Select industry template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Description</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="gym">Gym/Fitness</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                      { id: 'elegant', label: 'Elegant', icon: '👑', color: 'from-purple-500 to-pink-500' },
                      { id: 'playful', label: 'Playful', icon: '🎈', color: 'from-green-400 to-blue-400' },
                      { id: 'professional', label: 'Professional', icon: '💼', color: 'from-blue-600 to-indigo-600' }
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          selectedStyle === style.id
                            ? `border-transparent bg-gradient-to-r ${style.color} text-white shadow-lg scale-105`
                            : isDarkMode
                            ? 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
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
                {/* Textarea */}
                <Textarea
                  placeholder="Describe your dream website... e.g., 'A modern portfolio for a graphic designer with dark theme, project gallery, and contact form'"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className={`min-h-[120px] ${isDarkMode ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'}`}
                  rows={4}
                />
                {/* Character Count */}
                <div className="flex justify-between items-center text-xs">
                  <span className={dynamicSubtleClass}>{characterCount}/{characterLimit} characters</span>
                  <span className={dynamicSubtleClass}>Min 50 chars for best results</span>
                </div>
                {/* Generate Button */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || input.length < 50 || input.length > 3000}
                    className="flex-1 bg-gradient-primary hover:bg-gradient-primary/90 text-white font-semibold h-12 rounded-xl shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Ctrl+Enter to generate"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating... {elapsedTime}s
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Website
                      </>
                    )}
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
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-2xl mb-4">
                  <Loader2 className={`w-8 h-8 animate-spin ${dynamicTextClass}`} />
                  <span className={dynamicTextClass}>Creating your website...</span>
                </div>
                <div className={`w-full bg-white/10 rounded-full h-3 relative overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <div
                    className="h-full bg-gradient-primary rounded-full transition-all duration-300 ease-out absolute left-0 top-0"
                    style={{ width: `${progress}%` }}
                  />
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
              {/* Preview Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <PartyPopper className="w-6 h-6 text-green-500" />
                  <div>
                    <h2 className={`text-2xl font-bold ${dynamicTextClass}`}>Your Generated Website</h2>
                    <p className={dynamicMutedClass}>Live preview - edit and download ready</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Edit/Preview Toggle */}
                  <div className={`flex bg-white/10 rounded-full p-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className={`px-4 py-2 rounded-full transition-all font-semibold ${!isEditMode ? 'bg-gradient-primary text-white shadow-glow transform scale-105' : `${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}`}
                    >
                      👁️ Preview
                    </button>
                    <button
                      onClick={() => {
                        setIsEditMode(true);
                        setEditedCode(generatedCode);
                      }}
                      className={`px-4 py-2 rounded-full transition-all font-semibold ${isEditMode ? 'bg-gradient-primary text-white shadow-glow transform scale-105' : `${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}`}
                    >
                      ✏️ Edit Code
                    </button>
                  </div>
                  {/* View Mode Toggle (only in preview mode) */}
                  {!isEditMode && (
                    <div className={`flex bg-white/10 rounded-full p-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                      {[{ icon: Monitor, mode: 'desktop' as const }, { icon: Tablet, mode: 'tablet' as const }, { icon: Smartphone, mode: 'mobile' as const }].map(({ icon: Icon, mode }) => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className={`p-2 rounded-full transition-all ${viewMode === mode ? 'bg-gradient-primary text-white shadow-glow transform scale-105' : `${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} hover:scale-105`}`}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Action Buttons */}
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
              {/* Preview/Edit Container */}
              {isEditMode ? (
                <div className="space-y-4">
                  {/* Code Editor */}
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
                <div className={`relative ${getAspectRatio()} mx-auto max-w-4xl rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 ${isDarkMode ? 'bg-black/20' : 'bg-white/50'}`}>
                  <iframe
                    srcDoc={generatedCode}
                    className="w-full h-full border-0"
                    title="Generated Website Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              )}
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={handleCopy}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Copy className="w-4 h-4" />
                  Copy Code
                </Button>
                <Button
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4" />
                  Download ZIP
                </Button>
                <Button
                  onClick={() => setShowShareMenu(true)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  onClick={handleOpenInCodeSandbox}
                  variant="outline"
                  className="px-4"
                >
                  Open in CodeSandbox
                </Button>
                <Button
                  onClick={handleOpenInStackBlitz}
                  variant="outline"
                  className="px-4"
                >
                  Open in StackBlitz
                </Button>
              </div>
              {/* Share Menu */}
              {showShareMenu && (
                <div className="relative">
                  <div className={`absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} z-50`}>
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
              {/* Success Animation */}
              {showSuccess && (
                <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
                  <div className={`p-8 rounded-2xl text-center shadow-2xl transform animate-bounce ${isDarkMode ? 'bg-green-900/20 text-green-300 border-green-500/30' : 'bg-green-50 text-green-800 border-green-200'}`}>
                    <PartyPopper className="w-16 h-16 mx-auto mb-4 text-green-500 animate-pulse" />
                    <h3 className="text-2xl font-bold mb-2">Website Generated!</h3>
                    <p className="text-lg">Your site is being prepared for preview...</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* My Projects Section */}
          {websiteHistory.length > 0 && (
            <div className="mt-12">
              {/* Section Header with Filters */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h2 className={`text-2xl font-bold transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  📂 My Projects ({getFilteredProjects().length})
                </h2>
                {/* Search and Filters */}
                <div className="flex flex-wrap gap-3">
                  {/* Search */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search projects..."
                    className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode
                        ? 'bg-gray-800 text-white placeholder-gray-500 border border-gray-700'
                        : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300'
                    }`}
                  />
                  {/* Tag Filter */}
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode
                        ? 'bg-gray-800 text-white border border-gray-700'
                        : 'bg-white text-gray-900 border border-gray-300'
                    }`}
                  >
                    <option value="all">All Tags</option>
                    {getAllTags().map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  {/* Favorites Toggle */}
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      showFavoritesOnly
                        ? 'bg-yellow-500 text-white'
                        : isDarkMode
                        ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ⭐ Favorites
                  </button>
                </div>
              </div>
              {/* Project Grid */}
              {getFilteredProjects().length === 0 ? (
                <div className={`text-center py-12 rounded-xl border ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-gray-400'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}>
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-lg">No projects found matching your filters</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterTag("all");
                      setShowFavoritesOnly(false);
                    }}
                    className={`mt-4 px-6 py-2 rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : usageLoading ? (
  // Skeleton Loading State for Projects
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
                    className={`backdrop-blur-sm rounded-xl p-6 transition-all hover:scale-105 relative ${
                      isDarkMode
                        ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                        : 'bg-white border border-gray-200 hover:bg-gray-50 shadow-lg'
                    }`}
                  >
                    {/* Favorite Star */}
                    <button
                      onClick={() => toggleFavorite(site.id)}
                      className="absolute top-4 right-4 text-2xl transition-transform hover:scale-125"
                    >
                      {site.isFavorite ? '⭐' : '☆'}
                    </button>
    
                    {/* Project Info */}
                    <div className="mb-4">
                      <h3 className={`text-xl font-bold mb-2 pr-8 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {site.name}
                      </h3>
    
                      {/* Tags */}
                      {site.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {site.tags.map((tag, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded-full text-xs ${
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
    
                      <p className={`text-sm mb-2 line-clamp-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {site.prompt}
                      </p>
    
                      {site.notes && (
                        <p className={`text-xs italic mb-2 line-clamp-2 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          📝 {site.notes}
                        </p>
                      )}
    
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        Created: {new Date(site.timestamp).toLocaleDateString()} at{' '}
                        {new Date(site.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setGeneratedCode(site.html || "");
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          isDarkMode
                            ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        👁️ View
                      </button>
    
                      <button
                        onClick={() => openEditProject(site)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          isDarkMode
                            ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                      >
                        ✏️ Edit
                      </button>
    
                      <button
                        onClick={() => handleDelete(site.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          isDarkMode
                            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
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
      {/* Scroll to Top Button */}
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
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
export default Index;
