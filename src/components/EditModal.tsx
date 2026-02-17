// components/EditModal.tsx
// Full-screen AI editing interface with live preview + Phase 3 Image Picker

import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Undo, AlertCircle, CheckCircle2, History, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface EditModalProps {
  websiteId: string;
  websiteName: string;
  currentHTML: string;
  isOpen: boolean;
  onClose: () => void;
  onEditApplied: () => void;
  isDarkMode: boolean;
}

interface EditHistoryItem {
  instruction: string;
  timestamp: Date;
  preview: string;
}

export function EditModal({
  websiteId,
  websiteName,
  currentHTML,
  isOpen,
  onClose,
  onEditApplied,
  isDarkMode
}: EditModalProps) {
  const [editInstruction, setEditInstruction] = useState('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  // ── Phase 3: Image Picker State ──
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerImages, setPickerImages] = useState<any[]>([]);
  const [clickedImageSrc, setClickedImageSrc] = useState('');
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  // ────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  const backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const borderColor = isDarkMode ? '#333333' : '#e5e7eb';

  // ── Phase 3: Listen for pencil icon clicks from inside iframe ──
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'IMAGE_CLICK') {
        const src = event.data.src;
        const rawAlt = (event.data.alt || '').trim();
        setClickedImageSrc(src);
        setShowImagePicker(true);
        setIsSearchingImages(true);
        setPickerImages([]);

        // Build a smart search query
        // If alt looks like a person's name (1-3 words, no spaces like "professional") → use portrait query
        // If alt is empty → use generic business
        // Otherwise use the alt text as-is but append "photo" for better results
        let query = 'professional business';
if (!rawAlt) {
  query = 'professional business';
} else {
  // Use alt text directly — most context-aware option
  // Only override for empty/icon alts
  query = rawAlt.replace(/[^a-zA-Z0-9 ]/g, ' ').trim() || 'professional business';
}
        setImageSearchQuery(query);

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/images/search?query=${encodeURIComponent(query)}`,
            { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
          );
          const data = await response.json();
          if (data.success) setPickerImages(data.images);
        } catch (e) {
          console.error('Image search failed:', e);
        } finally {
          setIsSearchingImages(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [websiteId]);
  // ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setPreviewHTML('');
      setEditHistory([]);
      setEditInstruction('');
    }
  }, [isOpen]);

  // ── Phase 3: Inject pencil overlay into iframe HTML ──
  const injectPencilOverlay = (html: string): string => {
    const script = `
<script>
(function() {
  function addPencilOverlays() {
    document.querySelectorAll('img').forEach(function(img) {
      if (img.dataset.pencilAdded) return;
      img.dataset.pencilAdded = 'true';

      var parent = img.parentNode;
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;display:inline-block;width:100%;';
      parent.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      var btn = document.createElement('button');
      btn.innerHTML = '&#9998;';
      btn.title = 'Change image';
      btn.style.cssText = [
        'position:absolute',
        'top:8px',
        'right:8px',
        'width:36px',
        'height:36px',
        'border-radius:50%',
        'background:rgba(0,0,0,0.65)',
        'border:2px solid rgba(255,255,255,0.8)',
        'cursor:pointer',
        'font-size:16px',
        'display:none',
        'align-items:center',
        'justify-content:center',
        'z-index:9999',
        'color:white',
        'transition:transform 0.15s'
      ].join(';');
      wrapper.appendChild(btn);

      wrapper.addEventListener('mouseenter', function() {
        btn.style.display = 'flex';
      });
      wrapper.addEventListener('mouseleave', function() {
        btn.style.display = 'none';
      });
      btn.addEventListener('mouseenter', function() {
        btn.style.transform = 'scale(1.1)';
      });
      btn.addEventListener('mouseleave', function() {
        btn.style.transform = 'scale(1)';
      });

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.parent.postMessage({
          type: 'IMAGE_CLICK',
          src: img.src,
          alt: img.alt || ''
        }, '*');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addPencilOverlays);
  } else {
    addPencilOverlays();
  }
})();
</script>`;

    if (html.includes('</body>')) {
      return html.replace('</body>', script + '</body>');
    }
    return html + script;
  };
  // ────────────────────────────────────────────────────

  const generatePreview = async () => {
    if (!editInstruction.trim() || editInstruction.length < 10) {
      toast({
        title: "Instruction too short",
        description: "Please provide at least 10 characters describing your edit",
        variant: "destructive"
      });
      return;
    }

    // Detect if user is trying to change an image via text
    const imageKeywords = ['change image', 'replace image', 'swap image', 'change photo', 'replace photo', 'change picture', 'replace picture', 'change the image', 'change the photo', 'change the picture', 'different image', 'different photo', 'new image', 'new photo'];
    const lowerInstruction = editInstruction.toLowerCase();
    if (imageKeywords.some(kw => lowerInstruction.includes(kw))) {
      toast({
        title: "💡 Use the image picker instead",
        description: "Hover over any image in the preview and click the ✏️ pencil icon to replace it — it's free and instant!",
        duration: 6000,
      });
      return;
    }

    setIsGeneratingPreview(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/edit/${websiteId}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          editInstruction: editInstruction.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate preview');
      }

      const data = await response.json();

      setPreviewHTML(data.preview);
      
      // Add to history
      setEditHistory(prev => [...prev, {
        instruction: editInstruction,
        timestamp: new Date(),
        preview: data.preview
      }]);

      toast({
        title: "✅ Preview generated",
        description: data.validation.warnings.length > 0 
          ? `Preview ready (${data.validation.warnings.length} warning${data.validation.warnings.length > 1 ? 's' : ''})`
          : "Review the changes in the preview pane",
      });

      setEditInstruction(''); // Clear input for next edit

    } catch (error: any) {
      console.error('Preview error:', error);
      toast({
        title: "❌ Preview failed",
        description: error.message || 'Could not generate preview',
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const applyEdit = async () => {
    if (!previewHTML) {
      toast({
        title: "No preview",
        description: "Generate a preview first",
        variant: "destructive"
      });
      return;
    }

    setIsApplying(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const lastEdit = editHistory[editHistory.length - 1];
      // Guard: image-only changes have no text edit history
      const instruction = lastEdit?.instruction || 'Image replacement';

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/edit/${websiteId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          editedHTML: previewHTML,
          editInstruction: instruction
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply edit');
      }

      const data = await response.json();

      toast({
        title: "✅ Edit applied",
        description: data.deployment 
          ? `Version ${data.version} deployed live`
          : `Saved as version ${data.version}`,
      });

      onEditApplied();
      onClose();

    } catch (error: any) {
      console.error('Apply error:', error);
      toast({
        title: "❌ Apply failed",
        description: error.message || 'Could not apply edit',
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  const loadVersionHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/edit/${websiteId}/versions`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
        setShowVersions(true);
      }
    } catch (error) {
      console.error('Version history error:', error);
    }
  };

  const revertToVersion = async (versionNumber: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/edit/${websiteId}/revert/${versionNumber}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (response.ok) {
        toast({
          title: "✅ Version restored",
          description: `Reverted to version ${versionNumber}`,
        });
        onEditApplied();
        onClose();
      }
    } catch (error) {
      console.error('Revert error:', error);
      toast({
        title: "❌ Revert failed",
        description: "Could not revert to version",
        variant: "destructive"
      });
    }
  };

  const undoLastEdit = () => {
    if (editHistory.length > 1) {
      const newHistory = editHistory.slice(0, -1);
      setEditHistory(newHistory);
      setPreviewHTML(newHistory[newHistory.length - 1].preview);
      toast({
        title: "⏪ Undone",
        description: "Reverted to previous edit",
      });
    } else if (editHistory.length === 1) {
      setEditHistory([]);
      setPreviewHTML('');
      toast({
        title: "⏪ Cleared",
        description: "Removed all edits",
      });
    }
  };

  // ── Phase 3: Search images helper (used by search bar Enter key) ──
  const searchImages = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingImages(true);
    setPickerImages([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/images/search?query=${encodeURIComponent(query)}`,
        { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
      );
      const data = await response.json();
      if (data.success) setPickerImages(data.images);
    } catch (e) {
      console.error('Image search failed:', e);
    } finally {
      setIsSearchingImages(false);
    }
  };
  // ────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* Left Panel: Chat Interface */}
      <div 
        className="w-1/3 border-r flex flex-col"
        style={{ 
          backgroundColor,
          borderColor 
        }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b flex justify-between items-center"
          style={{ borderColor }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: textColor }}>
              ✏️ Edit: {websiteName}
            </h2>
            <p className="text-sm opacity-60" style={{ color: textColor }}>
              Tell me what you'd like to change
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: textColor }} />
          </button>
        </div>

        {/* Edit History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editHistory.length === 0 && (
            <div className="text-center py-12 opacity-60" style={{ color: textColor }}>
              <Eye className="w-12 h-12 mx-auto mb-4" />
              <p>No edits yet</p>
              <p className="text-sm mt-2">Describe what you want to change below</p>
            </div>
          )}

          {editHistory.map((item, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border"
              style={{ 
                backgroundColor: isDarkMode ? '#2a2a2a' : '#f9fafb',
                borderColor 
              }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: textColor }}>
                    {item.instruction}
                  </p>
                  <p className="text-xs opacity-60 mt-1" style={{ color: textColor }}>
                    {item.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {index === editHistory.length - 1 && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t space-y-3" style={{ borderColor }}>
          {editHistory.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={undoLastEdit}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={editHistory.length === 0}
              >
                <Undo className="w-4 h-4 mr-2" />
                Undo
              </Button>
              <Button
                onClick={loadVersionHistory}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            </div>
          )}

          <Textarea
            value={editInstruction}
            onChange={(e) => setEditInstruction(e.target.value)}
            placeholder="Example: Make the header background blue and increase font size"
            className="min-h-[100px] resize-none"
            disabled={isGeneratingPreview}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                generatePreview();
              }
            }}
          />

          <div className="flex gap-2">
            <Button
              onClick={generatePreview}
              disabled={isGeneratingPreview || editInstruction.length < 10}
              className="flex-1"
            >
              {isGeneratingPreview ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Preview Edit
                </>
              )}
            </Button>

            {previewHTML && (
              <Button
                onClick={applyEdit}
                disabled={isApplying}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Apply Changes
                  </>
                )}
              </Button>
            )}
          </div>

          <p className="text-xs opacity-60 text-center" style={{ color: textColor }}>
            Press Ctrl+Enter to preview • Min 10 characters
          </p>
        </div>
      </div>

      {/* Right Panel: Live Preview */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: '#f3f4f6' }}>
        <div className="p-4 border-b bg-white/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">
              {previewHTML ? '🔄 Live Preview' : '👁️ Current Page'}
            </h3>
            {previewHTML && (
              <span className="text-sm text-green-600 font-medium">
                ✅ Changes ready to apply
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
            <iframe
              ref={iframeRef}
              srcDoc={injectPencilOverlay(previewHTML || currentHTML)}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>

      {/* ── Phase 3: Image Picker Modal ── */}
      {showImagePicker && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col bg-white shadow-2xl">

            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Choose a new image</h3>
                <p className="text-sm text-gray-500 mt-0.5">Click ✏️ on any image • Search below to find specific photos</p>
              </div>
              <button
                onClick={() => setShowImagePicker(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search bar */}
            <div className="p-4 border-b bg-gray-50">
              <input
                type="text"
                value={imageSearchQuery}
                onChange={(e) => setImageSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchImages(imageSearchQuery);
                }}
                placeholder="Search photos and press Enter..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>

            {/* Image grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {isSearchingImages ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  <span className="ml-3 text-gray-500 text-sm">Searching photos...</span>
                </div>
              ) : pickerImages.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {pickerImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={async () => {
                        // Replace in active HTML
                        const activeHTML = previewHTML || currentHTML;
                        const updatedHTML = activeHTML.replace(
                          new RegExp(clickedImageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                          img.url
                        );

                        // Save to server (fire and forget)
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          await fetch(
                            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/edit/${websiteId}/replace-image`,
                            {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session?.access_token}`
                              },
                              body: JSON.stringify({
                                oldSrc: clickedImageSrc,
                                newSrc: img.url,
                                unsplashId: img.id
                              })
                            }
                          );
                        } catch (e) {
                          console.error('Image save failed:', e);
                        }

                        setPreviewHTML(updatedHTML);
                        setShowImagePicker(false);
                        toast({
                          title: "🖼️ Image replaced",
                          description: "Saved automatically",
                        });
                      }}
                      className="group relative rounded-xl overflow-hidden aspect-video bg-gray-100 hover:ring-2 hover:ring-purple-500 transition-all duration-150 shadow-sm hover:shadow-md"
                    >
                      <img
                        src={img.thumb}
                        alt={`Photo by ${img.photographer}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {/* Photographer credit — visible on hover only */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                        <p className="text-white text-xs truncate">📷 {img.photographer}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-5xl mb-4">🔍</p>
                  <p className="font-medium">No photos found</p>
                  <p className="text-sm mt-1">Try a different search term above</p>
                </div>
              )}
            </div>

            {/* Footer — Unsplash attribution (required) */}
            <div className="p-3 border-t bg-gray-50 text-center">
              <p className="text-xs text-gray-400">
                Photos by{' '}
                <a
                  href="https://unsplash.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-600 transition-colors"
                >
                  Unsplash
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ─────────────────────────────── */}

      {/* Version History Modal */}
      {showVersions && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
          <div 
            className="w-full max-w-2xl max-h-[80vh] rounded-xl p-6 overflow-hidden flex flex-col"
            style={{ backgroundColor }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold" style={{ color: textColor }}>
                📜 Version History
              </h3>
              <button onClick={() => setShowVersions(false)} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" style={{ color: textColor }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-4 rounded-lg border flex justify-between items-center"
                  style={{ 
                    backgroundColor: isDarkMode ? '#2a2a2a' : '#f9fafb',
                    borderColor 
                  }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: textColor }}>
                      Version {version.version_number}
                    </p>
                    <p className="text-sm opacity-60" style={{ color: textColor }}>
                      {version.change_description}
                    </p>
                    <p className="text-xs opacity-40 mt-1" style={{ color: textColor }}>
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => revertToVersion(version.version_number)}
                    size="sm"
                    variant="outline"
                  >
                    <Undo className="w-4 h-4 mr-2" />
                    Restore
                  </Button>
                </div>
              ))}

              {versions.length === 0 && (
                <p className="text-center py-8 opacity-60" style={{ color: textColor }}>
                  No version history yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
