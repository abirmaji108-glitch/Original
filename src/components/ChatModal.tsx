import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteCode: string;
  onCodeUpdate: (newCode: string) => void;
}

export function ChatModal({ open, onOpenChange, websiteCode, onCodeUpdate }: ChatModalProps) {
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || isChatLoading) return;

    const userMessage = chatMessage;
    setChatMessage("");
    setIsChatLoading(true);

    const newChatHistory = [...chatHistory, { role: "user", content: userMessage }];
    setChatHistory(newChatHistory);

    try {
      // Use your backend API instead of calling Anthropic directly
      const response = await fetch("https://original-lbxv.onrender.com/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: `You are Sento AI, a friendly chat assistant for building/modifying websites. Respond conversationally unless the user asks to change the code.

Current website code (for reference if modifying):
${websiteCode}

User message: ${userMessage}

Rules:
- If this is a greeting, question, or non-code request (e.g., "Hi", "What can you do?"), reply helpfully in plain text only. Keep it short, fun, and suggest code ideas.
- If the user requests a code change (e.g., "add red header", "make it mobile-friendly"), provide ONLY the complete modified HTML code. No explanations, no markdown, no extra text—just valid <!DOCTYPE html> full document.
- Always ensure output HTML is self-contained: inline all critical styles (no external CDNs like Tailwind CDN or Google Fonts to avoid CSP blocks). Use simple CSS for everything.

Respond now based on the message.`
        })
      });

      if (!response.ok) throw new Error("Failed to get AI response");

      const data = await response.json();
      const aiResponse = data.htmlCode || "I'm here to help! Could you please rephrase your question?";

      setChatHistory([...newChatHistory, { role: "assistant", content: aiResponse }]);

      // Check if response contains HTML code
      if (aiResponse.includes("<!DOCTYPE html>") || aiResponse.includes("<html")) {
        onCodeUpdate(aiResponse);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory([
        ...newChatHistory,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat with AI Assistant</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-purple-100 ml-8"
                  : "bg-gray-100 mr-8"
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {msg.role === "user" ? "You" : "AI Assistant"}
              </p>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">AI is thinking...</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Ask AI to modify your website..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit();
              }
            }}
          />
          <Button onClick={handleChatSubmit} disabled={isChatLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
