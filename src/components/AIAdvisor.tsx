import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function AIAdvisor() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `You are an expert AEC (Architecture, Engineering, Construction) Automation Consultant. 
            The user wants to automate a workflow. Provide a detailed strategy including:
            1. Recommended tools (Revit API, Dynamo, Grasshopper, Python, etc.)
            2. High-level logic steps.
            3. Estimated difficulty and ROI.
            
            User request: ${userMessage}` }]
          }
        ],
        config: {
          systemInstruction: "You are a specialized AI for AEC automation. Be technical, precise, and helpful. Focus on BIM standards and industry-standard tools.",
        }
      });

      const assistantMessage = response.text || "I couldn't generate a response. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error connecting to the automation brain." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] glass-panel overflow-hidden">
      <div className="p-4 border-b border-aec-border flex items-center gap-2 bg-aec-card/80">
        <Bot className="w-5 h-5 text-aec-accent" />
        <h2 className="font-semibold text-slate-100">Automation Advisor</h2>
        <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
          <Sparkles className="w-3 h-3" />
          Powered by Gemini
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Ask me how to automate a specific BIM or AEC task.</p>
            <p className="text-sm italic mt-2">"How can I automate wall-to-floor join cleanup in Revit?"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex gap-3 max-w-[85%]",
            msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-aec-accent/20" : "bg-slate-700"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-aec-accent" /> : <Bot className="w-4 h-4 text-slate-300" />}
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' ? "bg-aec-accent text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none border border-aec-border"
            )}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 mr-auto">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-aec-accent animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 text-sm italic">
              Analyzing workflow...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-aec-card/80 border-t border-aec-border">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe a workflow to automate..."
            className="w-full bg-slate-900 border border-aec-border rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-aec-accent/50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-aec-accent hover:bg-aec-accent/10 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
