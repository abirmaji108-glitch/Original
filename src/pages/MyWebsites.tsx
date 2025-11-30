import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, ExternalLink, Trash2, RefreshCw, Sparkles, X, Monitor, Tablet, Smartphone, Copy, Check } from "lucide-react";
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
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
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
  const closePreview = () => {
    setPreviewWebsite(null);
  };
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
      deleteWebsite(websiteToDelete.id);
    }
    closeDeleteModal();
  };
  const getIframeWidth = () => {
    switch (viewMode) {
      case "tablet":
        return "768px";
      case "mobile":
        return "375px";
      default:
        return "100%";
    }
  };
  const deleteWebsite = (id: string) => {
    try {
      const updated = websites.filter(w => w.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setWebsites(updated);
     
      if (previewWebsite?.id === id) {
        closePreview();
      }
     
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
    navigate('/', { state: { description: website.prompt, industry: website.industry } });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
              My Websites
            </h1>
            <p className="text-muted-foreground">
              {websites.length} {websites.length === 1 ? 'website' : 'websites'} generated
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')} variant="outline">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate New
            </Button>
            {websites.length > 0 && (
              <button
                onClick={() => openDeleteModal("all")}
                className="text-sm text-red-600 hover:underline cursor-pointer"
              >
                Clear All ({websites.length})
              </button>
            )}
          </div>
        </div>
        {/* Websites Grid */}
        {websites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No websites yet</h2>
            <p className="text-muted-foreground mb-6">
              Start creating your first website with AI!
            </p>
            <Button onClick={() => navigate('/')} size="lg">
              <Sparkles className="mr-2 h-5 w-5" />
              Generate Website
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((website) => (
              <Card key={website.id} className="hover:shadow-lg transition-all duration-300 opacity-100 scale-100">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{website.name}</CardTitle>
                  <CardDescription>
                    {formatDate(website.timestamp)}
                    {website.industry && ` • ${website.industry}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {website.prompt}
                  </p>
                </CardContent>
                 <CardFooter className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => openPreview(website)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Preview
                  </Button>
                  <Button
                    onClick={() => downloadWebsite(website)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                  <Button
                    onClick={() => regenerate(website)}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteModal(website)}
                    className="hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
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
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0">
          <div className="flex flex-col h-full">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
              <h2 className="text-lg font-semibold truncate flex-1 mr-4">
                {previewWebsite?.name}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={closePreview}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Device Tabs */}
            <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
              <Button
                variant={viewMode === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("desktop")}
                className="gap-2"
              >
                <Monitor className="h-4 w-4" />
                Desktop
              </Button>
              <Button
                variant={viewMode === "tablet" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("tablet")}
                className="gap-2"
              >
                <Tablet className="h-4 w-4" />
                Tablet
              </Button>
              <Button
                variant={viewMode === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("mobile")}
                className="gap-2"
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </Button>
            </div>
            {/* Preview Area */}
            <div className="flex-1 p-6 bg-muted/20 overflow-auto">
              <div className="h-full flex items-center justify-center">
                <div
                  className="bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
                  style={{
                    width: getIframeWidth(),
                    height: "100%",
                    maxWidth: "100%",
                  }}
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
            {/* Bottom Actions */}
            <div className="flex items-center justify-center gap-3 px-6 py-4 border-t bg-card">
              <Button
                onClick={() => previewWebsite && downloadWebsite(previewWebsite)}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download HTML
              </Button>
              <Button
                onClick={handleCopyCode}
                variant="outline"
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Code
              </Button>
              <Button
                onClick={() => previewWebsite && openDeleteModal(previewWebsite)}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-4xl text-red-500 mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {websiteToDelete === "all"
                  ? `Delete all ${websites.length} websites?`
                  : `Delete ${websiteToDelete && typeof websiteToDelete !== 'string' ? websiteToDelete.name : 'website'}?`
                }
              </h2>
              <p className="text-gray-600">
                {websiteToDelete === "all"
                  ? "This will permanently remove ALL your websites. This cannot be undone."
                  : "This website will be permanently removed. This action cannot be undone."
                }
              </p>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Check className="h-5 w-5" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
export default MyWebsites;
