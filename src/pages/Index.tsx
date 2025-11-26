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
  const [status, setStatus] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [industry, setIndustry] = useState("custom");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

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
    // Smooth progress animation
    const progressInterval = setInterval(() => {
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
      // Show success state for 2 seconds
      setShowSuccess(true);
 
      setTimeout(() => {
        setGeneratedCode(htmlCode);
        saveWebsite(htmlCode);
        setIsGenerating(false);
        setShowSuccess(false);
   
        toast({
          title: "Success! 🎉",
          description: "Your website has been generated successfully",
        });
      }, 2000);
 
    } catch (error) {
      clearInterval(progressInterval);
 
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
    // Smooth progress animation
    const progressInterval = setInterval(() => {
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
      // Show success state for 2 seconds
      setShowSuccess(true);
 
      setTimeout(() => {
        setGeneratedCode(htmlCode);
        saveWebsite(htmlCode);
        setIsGenerating(false);
        setShowSuccess(false);
   
        toast({
          title: "Regenerated! 🎉",
          description: "A fresh version of your website has been generated",
        });
      }, 2000);
 
    } catch (error) {
      clearInterval(progressInterval);
 
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
      setShowSuccess(false);
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleDownload = () => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sento-website-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded!",
      description: "Your website has been saved as an HTML file",
    });
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
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
    if (!generatedCode) return;
    const shareUrl = window.location.href;
    await navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied!",
      description: "Share this link with others",
    });
  };

  const handleExampleClick = (exampleText: string, exampleIndustry: string) => {
    setInput(exampleText);
    setIndustry(exampleIndustry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-background to-indigo-900/20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-600/10 via-transparent to-transparent animate-pulse"></div>
      </div>
      {/* Navigation */}
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold tracking-tight">Sento</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/my-websites')}
              className="flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              My Websites
            </Button>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-semibold">
              <User className="w-4 h-4" />
            </div>
            <div className="text-sm">
              <div className="font-medium">Free Plan</div>
              <div className="text-xs text-muted-foreground">
                Credits: 1/1{" "}
                <a href="#" className="text-primary hover:underline">
                  Upgrade
                </a>
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
                  <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight">
                    Create Stunning Websites{" "}
                    <span className="gradient-text animate-glow">with AI</span>
                  </h1>
                  <p className="text-2xl md:text-3xl text-muted-foreground max-w-3xl mx-auto font-light">
                    Describe your vision. Watch AI build it in seconds.
                  </p>
                </div>
                {/* Demo Video Placeholder */}
                <div className="max-w-4xl mx-auto mt-12">
                  <div className="glass-card rounded-2xl p-2 shadow-glow">
                    <div className="relative aspect-video bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-xl flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1547658719-da2b51169166?w=1200&h=675&fit=crop')] bg-cover bg-center opacity-30"></div>
                      <div className="relative z-10 text-center space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center shadow-glow hover-scale cursor-pointer">
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                        <p className="text-lg font-medium">Watch How It Works</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 glass-card rounded-full px-6 py-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground font-medium">
                    Powered by Groq & Llama 3.3
                  </span>
                </div>
              </div>
              {/* Input Card */}
              <div className="glass-card rounded-2xl p-8 shadow-card animate-slide-up space-y-6">
                {/* Industry Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Choose Your Industry
                  </label>
                  <Select value={industry} onValueChange={handleIndustryChange}>
                    <SelectTrigger className="w-full bg-black/40 border-white/20">
                      <SelectValue placeholder="Select your industry..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="gym">Gym/Fitness</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Description Input */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <label className="text-sm font-medium">
                      Describe Your Website
                    </label>
                  </div>
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      industry === "custom"
                        ? "Describe your dream website in detail..."
                        : "Edit the template above or describe your dream website in detail..."
                    }
                    className="w-full h-56 bg-black/40 border-white/20 rounded-xl p-4 text-foreground placeholder:text-muted-foreground/60 text-sm focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 resize-none"
                    maxLength={characterLimit + 100}
                  />
                  {/* Dynamic Character Counter with Validation Feedback */}
                  <div className="mt-3 space-y-2">
                    {/* Empty State Helper */}
                    {characterCount === 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                        <Lightbulb className="w-4 h-4" />
                        <span>Not sure what to write? Pick an industry template above!</span>
                      </div>
                    )}
               
                    {/* Character Count with Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {characterCount < 50 && characterCount > 0 && (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-red-500">
                              Add more detail for better results
                            </span>
                          </>
                        )}
                        {characterCount >= 50 && characterCount <= characterLimit && (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-green-500">
                              Perfect amount of detail!
                            </span>
                          </>
                        )}
                        {characterCount > characterLimit && (
                          <>
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-500">
                              Too long - Maximum 3000 characters allowed
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 text-right flex items-center gap-2">
                        <span className={characterCount > 2800 ? "text-yellow-500" : ""}>
                          {characterCount}/3000
                        </span>
                        {characterCount > 1000 && (
                          <span className="text-xs text-purple-400">
                            ⚡ Auto-optimizing prompt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Pro Tips Panel */}
                <div className="glass-card rounded-xl p-5 bg-primary/5 border-primary/20">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Lightbulb className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="font-bold text-base">💡 Pro Tips for Amazing Websites:</h3>
                    </div>
                    <div className="grid gap-2 ml-10">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>Include your business name and type</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>Specify 2-3 color preferences</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>List must-have features (menu, gallery, contact, etc.)</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>Mention your target audience if relevant</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Smart Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={input.length < 50}
                  className="w-full h-16 text-lg font-bold gradient-button hover-scale shadow-glow rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all group"
                >
                  {input.length < 50 ? (
                    <>
                      <Lock className="w-6 h-6 mr-2" />
                      Need at least 50 characters to generate
                    </>
                  ) : (
                    <>
                      <Unlock className="w-6 h-6 mr-2 group-hover:rotate-12 transition-transform" />
                      Generate Website ✨
                    </>
                  )}
                </Button>
              </div>
              {/* Examples Section */}
              <div className="mt-20 space-y-8">
                <div className="text-center space-y-3">
                  <h2 className="text-3xl md:text-4xl font-bold">
                    Get Inspired by <span className="gradient-text">Examples</span>
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    Click any example to use its prompt
                  </p>
                </div>
                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {examples.map((example, index) => (
                    <div
                      key={index}
                      onClick={() => handleExampleClick(example.prompt, example.industry)}
                      className="glass-card rounded-xl overflow-hidden hover-scale cursor-pointer group"
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={example.image}
                          alt={example.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                          <div>
                            <h3 className="font-bold text-lg">{example.title}</h3>
                            <p className="text-sm text-muted-foreground">{example.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-primary/5 border-t border-primary/10">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {example.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {/* Loading State */}
          {isGenerating && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-900 rounded-2xl p-8 max-w-md mx-4 border border-purple-500/20 shadow-2xl">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
                    <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                  </div>
                 
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-white">
                      {input.length > 1000 ? '⚡ Optimizing Your Prompt...' : '🎨 Generating Your Website...'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {input.length > 1000
                        ? 'Compressing your detailed request for best results...'
                        : 'Creating a stunning website with AI...'}
                    </p>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full animate-pulse"
                         style={{ width: '70%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    This may take 30-60 seconds for complex websites
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Preview Section */}
          {generatedCode && (
            <div className="space-y-8 animate-slide-up">
              {/* Success Header */}
              <div className="flex items-center justify-center gap-3">
                <PartyPopper className="w-10 h-10 text-primary animate-bounce" />
                <h2 className="text-4xl font-bold">Your Website is Ready!</h2>
              </div>
              {/* Preview Card */}
              <div className="glass-card rounded-2xl overflow-hidden shadow-card">
                {/* Toolbar */}
                <div className="bg-black/40 border-b border-white/10 px-6 py-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("desktop")}
                      className={`gap-2 ${
                        viewMode === "desktop"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      <span className="hidden sm:inline">Desktop</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("tablet")}
                      className={`gap-2 ${
                        viewMode === "tablet"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Tablet className="w-4 h-4" />
                      <span className="hidden sm:inline">Tablet</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("mobile")}
                      className={`gap-2 ${
                        viewMode === "mobile"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span className="hidden sm:inline">Mobile</span>
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="text-muted-foreground"
                      title="Zoom out (coming soon)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="text-muted-foreground"
                      title="Fullscreen (coming soon)"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="text-muted-foreground"
                      title="Zoom in (coming soon)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {/* Iframe Container */}
                <div className="bg-white p-4 flex items-center justify-center">
                  <div className={`w-full ${getAspectRatio()} transition-all duration-300`}>
                    <iframe
                      srcDoc={generatedCode}
                      className="w-full h-full border-0 rounded-lg shadow-lg"
                      title="Generated Website Preview"
                      sandbox="allow-scripts"
                    />
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="grid sm:grid-cols-4 gap-4">
                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  className="h-14 text-base font-semibold border-white/20 bg-white/5 hover:bg-white/10"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleDownload}
                  className="h-14 text-base font-semibold gradient-button hover-scale shadow-glow"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="h-14 text-base font-semibold border-white/20 bg-white/5 hover:bg-white/10"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  Copy Code
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="h-14 text-base font-semibold border-white/20 bg-white/5 hover:bg-white/10"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share
                </Button>
                <Button
                  onClick={handleNewWebsite}
                  variant="ghost"
                  className="h-14 text-base font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
