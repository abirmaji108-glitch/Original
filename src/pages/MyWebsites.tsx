import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Download, ExternalLink, Trash2, RefreshCw, Sparkles, X,
  Monitor, Tablet, Smartphone, Copy, Check, Zap, Clock
} from "lucide-react";
import { SavedWebsite, STORAGE_KEY, MAX_WEBSITES } from "@/types/website";

type ViewMode = "desktop" | "tablet" | "mobile";

const MyWebsites = () => {
  const [websites, setWebsites] = useState<SavedWebsite[]>([]);
  const [previewWebsite, setPreviewWebsite] = useState<SavedWebsite | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<SavedWebsite | "all" | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadWebsites();
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const loadWebsites = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setWebsites(parsed.sort((a: SavedWebsite, b: SavedWebsite) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.error("Error loading websites:", error);
      showNotification("Failed to load saved websites");
    }
  };

  const downloadWebsite = (website: SavedWebsite) => {
    const blob = new Blob([website.htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${website.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Website HTML file has been downloaded");
  };

  const openPreview = (website: SavedWebsite) => {
    setPreviewWebsite(website);
    setViewMode("desktop");
  };

  const closePreview = () => setPreviewWebsite(null);

  const handleCopyCode = async () => {
    if (!previewWebsite) return;
    await navigator.clipboard.writeText(previewWebsite.htmlCode);
    showNotification("HTML code copied to clipboard");
  };

  const openDeleteModal = (website: SavedWebsite | "all") => {
    setWebsiteToDelete(website);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setWebsiteToDelete(null);
  };

  const confirmDelete = () => {
    if (websiteToDelete === "all") {
      clearAll();
    } else if (websiteToDelete) {
      deleteWebsite((websiteToDelete as SavedWebsite).id);
    }
    closeDeleteModal();
  };

  const getIframeWidth = () => {
    switch (viewMode) {
      case "tablet": return "768px";
      case "mobile": return "375px";
      default: return "100%";
    }
  };

  const deleteWebsite = (id: string) => {
    try {
      const updated = websites.filter(w => w.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setWebsites(updated);
      if (previewWebsite?.id === id) closePreview();
      showNotification("Website deleted successfully");
    } catch (error) {
      console.error("Error deleting website:", error);
      showNotification("Failed to delete website");
    }
  };

  const clearAll = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setWebsites([]);
      showNotification("All websites removed");
    } catch (error) {
      console.error("Error clearing websites:", error);
      showNotification("Failed to clear websites");
    }
  };

  const regenerate = (website: SavedWebsite) => {
    navigate('/app', { state: { description: website.prompt, industry: website.industry } });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0118] via-[#1A0B2E] to-[#2D1B4E] relative overflow-hidden">
      {/* Animated gradient orbs (Lovable-style) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Hero Section - Lovable-inspired */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">Your Workspace</span>
          </div>
         
          <h1 className="text-6xl font-bold tracking-tight">
            <span className="text-white">Your next great website</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              starts here.
            </span>
          </h1>
         
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {websites.length === 0
              ? "Begin your journey by creating your first stunning website"
              : `You've created ${websites.length} amazing ${websites.length === 1 ? 'website' : 'websites'}. Keep building!`
            }
          </p>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate('/app')}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Create New Website
            </Button>
           
            {websites.length > 0 && (
              <Button
                onClick={() => openDeleteModal("all")}
                variant="outline"
                size="lg"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All ({websites.length})
              </Button>
            )}
          </div>
        </div>

        {/* Websites Grid or Empty State */}
        {websites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {/* Large animated icon */}
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm animate-pulse-slow">
                <Sparkles className="w-16 h-16 text-purple-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-2xl animate-pulse"></div>
            </div>
           
            <h2 className="text-3xl font-bold mb-3 text-white">Ready to create something amazing?</h2>
            <p className="text-gray-400 mb-8 text-lg max-w-md">
              Describe your vision and watch our AI bring it to life in seconds
            </p>
           
            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Lightning fast</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">AI-powered</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                <Monitor className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">Fully responsive</span>
              </div>
            </div>
           
            <Button
              onClick={() => navigate('/app')}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Create Your First Website
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((website, index) => (
              <Card
                key={website.id}
                className="group bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="line-clamp-1 text-white group-hover:text-purple-300 transition-colors">
                      {website.name}
                    </CardTitle>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Active"></div>
                  </div>
                  <CardDescription className="text-gray-400 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {formatDate(website.timestamp)}
                    </div>
                    {website.industry && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                        {website.industry}
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-gray-300 line-clamp-3">
                    {website.prompt}
                  </p>
                </CardContent>

                <CardFooter className="flex flex-wrap gap-2 pt-4">
                  <Button
                    onClick={() => openPreview(website)}
                    size="sm"
                    className="flex-1 bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 hover:border-purple-500/50 transition-all"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Preview
                  </Button>
                  <Button
                    onClick={() => downloadWebsite(website)}
                    size="sm"
                    className="flex-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 hover:border-blue-500/50 transition-all"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                  <Button
                    onClick={() => regenerate(website)}
                    size="sm"
                    className="bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30 hover:border-green-500/50 transition-all"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => openDeleteModal(website)}
                    size="sm"
                    className="bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30 hover:border-red-500/50 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewWebsite} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0 bg-gray-900/95 backdrop-blur-xl border-white/10">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30">
              <h2 className="text-lg font-semibold truncate flex-1 mr-4 text-white">
                {previewWebsite?.name}
              </h2>
              <Button variant="ghost" size="icon" onClick={closePreview} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10 bg-white/5">
              <Button variant={viewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setViewMode("desktop")} className="gap-2">
                <Monitor className="h-4 w-4" /> Desktop
              </Button>
              <Button variant={viewMode === "tablet" ? "default" : "outline"} size="sm" onClick={() => setViewMode("tablet")} className="gap-2">
                <Tablet className="h-4 w-4" /> Tablet
              </Button>
              <Button variant={viewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setViewMode("mobile")} className="gap-2">
                <Smartphone className="h-4 w-4" /> Mobile
              </Button>
            </div>

            <div className="flex-1 p-6 bg-gray-900/50 overflow-auto">
              <div className="h-full flex items-center justify-center">
                <div
                  className="bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
                  style={{ width: getIframeWidth(), height: "100%", maxWidth: "100%" }}
                >
                  {previewWebsite && (
                    <iframe
                      srcDoc={previewWebsite.htmlCode}
                      className="w-full h-full border-0"
                      title="Website Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-white/10 bg-black/30">
              <Button onClick={() => previewWebsite && downloadWebsite(previewWebsite)} variant="outline" className="gap-2 text-gray-300 border-white/20">
                <Download className="h-4 w-4" /> Download HTML
              </Button>
              <Button onClick={handleCopyCode} variant="outline" className="gap-2 text-gray-300 border-white/20">
                <Copy className="h-4 w-4" /> Copy Code
              </Button>
              <Button onClick={() => previewWebsite && openDeleteModal(previewWebsite)} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 shadow-2xl max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">Warning</div>
              <h2 className="text-xl font-bold text-white mb-2">
                {websiteToDelete === "all"
                  ? `Delete all ${websites.length} websites?`
                  : `Delete ${(websiteToDelete as SavedWebsite)?.name || 'website'}?`
                }
              </h2>
              <p className="text-gray-400">
                {websiteToDelete === "all"
                  ? "This will permanently remove ALL your websites. This cannot be undone."
                  : "This website will be permanently removed. This action cannot be undone."
                }
              </p>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={closeDeleteModal} className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-300 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-sm border border-green-500/20">
            <Check className="h-5 w-5" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyWebsites;
