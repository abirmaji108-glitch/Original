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
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string; isHtml?: boolean }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || isChatLoading) return;
    const userMessage = chatMessage;
    setChatMessage("");
    setIsChatLoading(true);
    const newChatHistory = [...chatHistory, { role: "user", content: userMessage }];
    setChatHistory(newChatHistory);
    try {
      // Use your backend API
      const response = await fetch("https://original-lbxv.onrender.com/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: `You are Sento AI, a friendly website assistant. Respond naturally to the user.

Current website code (if any):
${websiteCode ? '(User has generated a website)' : '(No website generated yet)'}

User's message: "${userMessage}"

IMPORTANT RULES:
1. For greetings or questions (like "hi", "hello", "how are you"), respond conversationally in 1-2 sentences.
2. For website help questions, give helpful advice in plain text.
3. ONLY if the user explicitly asks to modify code (e.g., "add a button", "change the color to blue"), then provide the modified HTML.
4. Never generate a full website unless explicitly asked.
5. Keep responses friendly and under 100 words for chat.

Respond now:`
        })
      });
      if (!response.ok) throw new Error("Failed to get AI response");
      const data = await response.json();
      let aiResponse = data.htmlCode || "Oops—try rephrasing! I'm here for site tweaks or quick chats.";
      // Debug: Log raw response
      console.log("Raw backend response:", aiResponse);
      console.log("Is HTML?", aiResponse.includes("<!DOCTYPE html>") || aiResponse.includes("<html>"));
      const isHtml = aiResponse.includes("<!DOCTYPE html>") || aiResponse.includes("<html>");
      if (isHtml) {
        onCodeUpdate(aiResponse);
      }
      setChatHistory([...newChatHistory, { role: "assistant", content: aiResponse, isHtml }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory([
        ...newChatHistory,
        { role: "assistant", content: "Sorry—network hiccup! Try again. (Check console for details.)" },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const renderMessageContent = (content: string, isHtml: boolean) => {
    if (!isHtml) {
      return <p className="text-sm whitespace-pre-wrap">{content}</p>;
    }
    // Format HTML as code block for readability
    return (
      <div className="text-sm">
        <p className="text-xs text-gray-500 mb-1">Updated code applied—preview below! 📄</p>
        <pre className="bg-gray-900 text-green-400 p-2 rounded overflow-x-auto text-xs font-mono max-h-40 overflow-y-auto">
          <code>{content}</code>
        </pre>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed right-4 bottom-4 top-4 w-[400px] max-w-[90vw] h-auto max-h-[600px] flex flex-col p-0 m-0 translate-x-0 translate-y-0"
        style={{ 
          position: 'fixed',
          right: '1rem',
          bottom: '1rem',
          top: 'auto',
          left: 'auto',
          transform: 'none'
        }}
      >
        <DialogHeader>
          <DialogTitle>Chat with Sento AI</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-purple-100 ml-8"
                    : "bg-gray-100 mr-8"
                }`}
              >
                <p className="text-sm font-semibold mb-1 px-2 pt-2">
                  {msg.role === "user" ? "You" : "Sento AI"}
                </p>
                {renderMessageContent(msg.content, msg.isHtml || false)}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start p-3">
              <div className="bg-gray-100 mr-8 p-3 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">Sento is thinking...</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Chat casually or say 'Add a blue button' to modify..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit();
              }
            }}
          />
          <Button onClick={handleChatSubmit} disabled={isChatLoading || !chatMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
