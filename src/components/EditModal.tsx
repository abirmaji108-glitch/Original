// components/EditModal.tsx
// Full-screen AI editing interface with live preview

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  const backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const borderColor = isDarkMode ? '#333333' : '#e5e7eb';

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setPreviewHTML('');
      setEditHistory([]);
      setEditInstruction('');
    }
  }, [isOpen]);

  const generatePreview = async () => {
    if (!editInstruction.trim() || editInstruction.length < 10) {
      toast({
        title: "Instruction too short",
        description: "Please provide at least 10 characters describing your edit",
        variant: "destructive"
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

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/edit/${websiteId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          editedHTML: previewHTML,
          editInstruction: lastEdit.instruction
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
              srcDoc={previewHTML || currentHTML}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>

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
