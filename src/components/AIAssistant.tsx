import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, AlertCircle, Bot, User, HelpCircle, Loader2 } from "lucide-react";
import { useAuth } from "../AuthContext";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export default function AIAssistant() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello! I am the **DermShield AI Assistant**. 🩺✨ 

I am here to answer your questions about skin cancer types, prevention guidelines (like sunscreen and UV protection), the **ABCDE warning signs**, or how our explainable AI (**CNN + Vision Transformer** pipeline and **Grad-CAM** heatmaps) works.

How can I assist you with your skin health education today?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const quickQuestions = [
    "What is skin cancer?",
    "Explain the ABCDE rule.",
    "What is Grad-CAM?",
    "Can AI replace doctors?",
    "How does DermShield work?",
    "How to track a lesion?"
  ];

  const formatMessageText = (text: string) => {
    return text.split("\n").map((line, i) => {
      let content = line;
      const isBullet = line.trim().startsWith("- ");
      if (isBullet) {
        content = line.trim().substring(2);
      }

      // Replace **bold** with <strong>bold</strong>
      const parts: React.ReactNode[] = [];
      let currentText = content;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;
      let keyCounter = 0;

      while ((match = boldRegex.exec(currentText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(currentText.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={`bold-${keyCounter++}`} className="font-extrabold text-slate-900">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < currentText.length) {
        parts.push(currentText.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={`line-${i}`} className="ml-5 list-disc text-slate-700 my-1 text-xs">
            {parts.length > 0 ? parts : content}
          </li>
        );
      }
      return (
        <p key={`line-${i}`} className="text-xs text-slate-700 my-1.5 leading-relaxed">
          {parts.length > 0 ? parts : content}
        </p>
      );
    });
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessageText = textToSend;
    setInput("");
    setError(null);

    // Add user message to state
    const userMsg: Message = {
      id: "u-" + Math.random().toString(36).substring(2, 9),
      sender: "user",
      text: userMessageText,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build conversation payload to send to backend with chat history
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageText,
          history: messages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text
          })),
          userId: currentUser?.id || "anonymous",
          userRole: currentUser?.role || "guest",
          userName: currentUser?.name || "Guest"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to contact DermShield AI Assistant.");
      }

      const data = await response.json();

      const aiMsg: Message = {
        id: "ai-" + Math.random().toString(36).substring(2, 9),
        sender: "ai",
        text: data.reply,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <div className="fixed bottom-5 right-5 z-[100]" id="floating-chat-trigger">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-3 bg-gradient-to-r ${
            isOpen ? "from-rose-600 to-red-500 hover:from-rose-700" : "from-cyan-600 to-teal-500 hover:from-cyan-700"
          } text-white font-bold text-xs rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer select-none group border border-white/20`}
        >
          {isOpen ? (
            <>
              <X className="h-4.5 w-4.5 animate-spin-once" />
              <span>Close Assistant</span>
            </>
          ) : (
            <>
              <div className="relative">
                <MessageSquare className="h-4.5 w-4.5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-400 rounded-full animate-pulse border border-white" />
              </div>
              <span>Ask DermShield AI</span>
              <Sparkles className="h-3.5 w-3.5 text-cyan-200 group-hover:animate-bounce" />
            </>
          )}
        </button>
      </div>

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-5 w-[360px] sm:w-[420px] h-[550px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-[100] flex flex-col overflow-hidden animate-slide-up"
          id="floating-chat-card"
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 bg-gradient-to-tr from-cyan-500 to-teal-400 rounded-lg flex items-center justify-center text-slate-900 font-extrabold shadow-inner">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wide uppercase leading-none">DermShield AI</h3>
                <span className="text-[9px] text-cyan-400 font-mono tracking-wider flex items-center gap-1 mt-0.5 font-bold">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
                  Clinical Support Assistant
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" id="chat-messages-container">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                    msg.sender === "user"
                      ? "bg-slate-200 border-slate-300 text-slate-700"
                      : "bg-teal-50 border-teal-100 text-teal-700"
                  }`}
                >
                  {msg.sender === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                {/* Bubble bubble wrapper */}
                <div className="space-y-1 max-w-[80%]">
                  <div
                    className={`p-3 rounded-2xl text-slate-800 shadow-sm border ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-slate-100 to-slate-50 border-slate-200/80 rounded-tr-none"
                        : "bg-white border-slate-200/80 rounded-tl-none"
                    }`}
                  >
                    {formatMessageText(msg.text)}
                  </div>
                  <div
                    className={`text-[8px] font-mono text-slate-400 uppercase tracking-widest ${
                      msg.sender === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {/* AI thinking skeleton loader */}
            {loading && (
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-full bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0 shadow-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="space-y-1 max-w-[80%]">
                  <div className="bg-white border border-slate-200/80 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {/* Error badge */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <span className="font-bold">Assistant Error:</span> {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="px-4 py-2 border-t border-slate-100 bg-white/90 flex flex-wrap gap-1.5 justify-center">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSend(q)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full transition-all cursor-pointer border border-slate-200 hover:border-slate-300 disabled:opacity-50 select-none flex items-center gap-1"
              >
                <HelpCircle className="h-3 w-3 text-cyan-600" />
                <span>{q}</span>
              </button>
            ))}
          </div>

          {/* Text input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a skin health or platform question..."
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-teal-500 text-slate-800 shadow-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none flex items-center justify-center shrink-0 border border-white/10"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
