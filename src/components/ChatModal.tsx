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
          prompt: `You are Sento AI, a super-friendly chat buddy for website creation. ALWAYS check the user's intent FIRST before responding.

Context: User has this current website code (use ONLY if modifying):
\`\`\`
${websiteCode}
\`\`\`

User's exact message: "${userMessage}"

STRICT RULES - Follow EXACTLY or your response will be rejected:
1. **CHAT MODE (90% of cases)**: If the message is a greeting (e.g., "Hi", "Hello"), question (e.g., "How are you?", "What can you do?"), casual talk, or non-code request, respond ONLY with plain, fun, short TEXT. NO HTML, NO CODE, NO MARKDOWN. Examples:
   - "Hi" → "Hey there! I'm Sento—your AI sidekick for epic sites. What's your dream website vibe?"
   - "How are you?" → "Pumped and ready to code! Tell me how to jazz up your page."
   - Suggest ideas: End with "Try asking: 'Add a blue hero section' for magic!"
   Keep under 100 words. Be witty, helpful.

2. **CODE MODE (ONLY if explicit mod request)**: If the message clearly asks to change/add/remove code (keywords: add, change, make, remove, update, modify, etc., e.g., "Add a red header", "Make it responsive"), respond with EXACTLY ONE THING: The FULL modified HTML document starting with <!DOCTYPE html>. NOTHING ELSE—no intro, no explanation, no markdown, no "Here's your code". Make it:
   - Complete, valid HTML.
   - Self-contained: INLINE all CSS (no <link> to CDNs like Tailwind or Google Fonts—CSP blocks them). Use plain <style> tags with simple rules.
   - Based on current code, apply ONLY the requested change.

Output NOW based on rules. If chat: Plain text. If code: Pure HTML.`
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
    <Dialog open={open} onOpenChange={onOpenChange} aria-describedby="chat-description">
      <DialogContent id="chat-description" className="max-w-2xl max-h-[80vh] flex flex-col">
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
