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

type ViewMode = "desktop" | "tablet" | "mobile";

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
    prompt: string;
    html: string;
    timestamp: number;
  }>>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('websiteHistory');
    if (saved) {
      setWebsiteHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

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

  const saveWebsite = (htmlCode: string) => {
    try {
      const websites: SavedWebsite[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      // Extract title from description or use default
      const name = input.split('\n')[0].slice(0, 50) || 'Untitled Website';
      const newWebsite: SavedWebsite = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description: input,
        htmlCode,
        timestamp: Date.now(),
        industry: industry || undefined,
      };
      // Add to beginning of array
      websites.unshift(newWebsite);
      // Keep only MAX_WEBSITES
      if (websites.length > MAX_WEBSITES) {
        websites.splice(MAX_WEBSITES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(websites));
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

  const handleGenerate = async () => {
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
      const prompt = `Generate a complete, production-ready, single-file HTML website based on this description:
${input}
REQUIREMENTS:
- Complete HTML5 document starting with <!DOCTYPE html>
- Use Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
- Inline all CSS in <style> tags if needed beyond Tailwind
- Inline all JavaScript in <script> tags
- Mobile-first responsive design
- Modern, professional design with smooth animations
- Use placeholder images from https://source.unsplash.com/random/800x600?{relevant-keyword}
- Include realistic placeholder text and content
- Professional color scheme matching the description
- Proper semantic HTML5 tags
- Accessibility features (alt tags, ARIA labels)
Return ONLY the complete HTML code. No explanations, no markdown, no code blocks - just the raw HTML starting with <!DOCTYPE html>`;
      setLastPrompt(prompt);
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt }),
        signal: abortControllerRef.current?.signal
      });
      clearInterval(progressInterval);
      clearInterval(progressInterval2);
      if (!response.ok) {
        let errorMessage = 'Generation failed. Please try again.';
        let errorDetails = '';
        if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment.';
        } else if (response.status === 401) {
          errorMessage = 'API authentication failed.';
        }
        try {
          const errorData = await response.json().catch(() => ({}));
          errorDetails = errorData.error || '';
        } catch {
          errorDetails = await response.text();
        }
        console.error('Generation Error:', response.status, errorDetails);
        throw new Error(errorMessage);
      }
      const data = await response.json();
      let htmlCode = data.htmlCode;
      // Save to history
      const newWebsite = {
        id: Date.now().toString(),
        prompt: prompt,
        html: htmlCode,
        timestamp: Date.now()
      };
      const updatedHistory = [newWebsite, ...websiteHistory];
      setWebsiteHistory(updatedHistory);
      localStorage.setItem('websiteHistory', JSON.stringify(updatedHistory));
      // Clear progress interval
      clearInterval(progressInterval);
      setProgress(100);
      setProgressStage("✅ Complete! Your website is ready.");
      // Show success state for 2 seconds
      setShowSuccess(true);
      setTimeout(() => {
        setGeneratedCode(htmlCode);
        saveWebsite(htmlCode);
        setIsGenerating(false);
        setShowSuccess(false);
        setProgress(0);
        setProgressStage("");
        toast({
          title: "Success! 🎉",
          description: "Your website has been generated successfully",
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
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: lastPrompt }),
        signal: abortControllerRef.current?.signal
      });
      clearInterval(progressInterval);
      clearInterval(progressInterval2);
      if (!response.ok) {
        let errorMessage = 'Regeneration failed. Please try again.';
        let errorDetails = '';
        if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment.';
        } else if (response.status === 401) {
          errorMessage = 'API authentication failed.';
        }
        try {
          const errorData = await response.json().catch(() => ({}));
          errorDetails = errorData.error || '';
        } catch {
          errorDetails = await response.text();
        }
        console.error('Regeneration Error:', response.status, errorDetails);
        throw new Error(errorMessage);
      }
      const data = await response.json();
      let htmlCode = data.htmlCode;
      // Save to history
      const newWebsite = {
        id: Date.now().toString(),
        prompt: lastPrompt,
        html: htmlCode,
        timestamp: Date.now()
      };
      const updatedHistory = [newWebsite, ...websiteHistory];
      setWebsiteHistory(updatedHistory);
      localStorage.setItem('websiteHistory', JSON.stringify(updatedHistory));
      // Clear progress interval
      clearInterval(progressInterval);
      setProgress(100);
      setProgressStage("✅ Complete! Your website is ready.");
      // Show success state for 2 seconds
      setShowSuccess(true);
      setTimeout(() => {
        setGeneratedCode(htmlCode);
        saveWebsite(htmlCode);
        setIsGenerating(false);
        setShowSuccess(false);
        setProgress(0);
        setProgressStage("");
        toast({
          title: "Regenerated! 🎉",
          description: "A fresh version of your website has been generated",
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50'} relative overflow-hidden`}>
      {/* Animated Background Gradient */}
      <div className={`fixed inset-0 transition-colors duration-300 pointer-events-none ${isDarkMode ? 'bg-gradient-to-br from-purple-900/20 via-gray-900 to-indigo-900/20' : 'bg-gradient-to-br from-blue-900/10 via-gray-50 to-purple-900/10'}`}>
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-600/10 via-transparent to-transparent animate-pulse' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/10 via-transparent to-transparent animate-pulse'}`}></div>
      </div>
      {/* Navigation */}
      <nav className={`glass-nav fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isDarkMode ? 'bg-black/40 backdrop-blur-md border-b-white/10' : 'bg-white/80 backdrop-blur-md border-b-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
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
                  Credits: 1/1{" "}
                  <a href="#" className={`hover:underline ${isDarkMode ? 'text-primary' : 'text-purple-600'}`}>
                    Upgrade
                  </a>
                </div>
              </div>
            </div>
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
                        <h3 className={`text-xl font-bold mb-2 transition-colors
