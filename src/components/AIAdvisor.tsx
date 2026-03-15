import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Send, Bot, User, Loader2, Sparkles, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { Workflow } from '../types';
import { auth, db, collection, addDoc } from '../firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Props {
  externalTrigger?: {
    workflow: Workflow;
    timestamp: number;
  } | null;
}

export default function AIAdvisor({ externalTrigger }: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSuggestedWorkflow, setLastSuggestedWorkflow] = useState<Partial<Workflow> | null>(null);

  useEffect(() => {
    if (externalTrigger) {
      const { workflow } = externalTrigger;
      const prompt = `Generate a detailed automation plan for the following AEC workflow:
      Title: ${workflow.title}
      Category: ${workflow.category}
      Description: ${workflow.description}
      Pain Point: ${workflow.painPoint}
      Current Tools: ${workflow.tools.join(', ')}
      
      Please provide a step-by-step implementation guide, specific API/tool recommendations, and potential roadblocks.`;
      
      handleSend(prompt);
    }
  }, [externalTrigger]);

  const handleSend = async (overrideInput?: string) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim()) return;

    const userMessage = messageToSend;
    if (!overrideInput) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setLastSuggestedWorkflow(null);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `You are an expert AEC (Architecture, Engineering, Construction) Automation Consultant. 
            
            If the user describes a new workflow they want to add to their dashboard, you MUST return a JSON object with the workflow details.
            If the user is just asking a general question, return a text response.
            
            User request: ${userMessage}` }]
          }
        ],
        config: {
          systemInstruction: `You are a specialized AI for AEC automation. 
          If the user wants to add a workflow, provide the details in JSON format. 
          The JSON should have:
          - "intent": "ADD_WORKFLOW" or "CHAT"
          - "message": A helpful text response to the user.
          - "workflow": (Only if intent is ADD_WORKFLOW) An object with:
            - "title": string
            - "category": "Architecture" | "BIM" | "Structural" | "MEP" | "Construction"
            - "description": string
            - "painPoint": string
            - "automationPotential": number (0-100)
            - "complexity": "Low" | "Medium" | "High"
            - "tools": string[]
            - "roi": string
            - "priority": "P0" | "P1" | "P2" | "P3"
            - "estimatedEffort": string
            - "successMetrics": string`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING },
              message: { type: Type.STRING },
              workflow: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  painPoint: { type: Type.STRING },
                  automationPotential: { type: Type.NUMBER },
                  complexity: { type: Type.STRING },
                  tools: { type: Type.ARRAY, items: { type: Type.STRING } },
                  roi: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  estimatedEffort: { type: Type.STRING },
                  successMetrics: { type: Type.STRING }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const assistantMessage = data.message || "I've analyzed your request.";
      
      if (data.intent === 'ADD_WORKFLOW' && data.workflow) {
        setLastSuggestedWorkflow(data.workflow);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error connecting to the automation brain." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestedWorkflow = async () => {
    if (!lastSuggestedWorkflow || !auth.currentUser) return;
    
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'workflows'), {
        ...lastSuggestedWorkflow,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        status: 'Pending'
      });
      setMessages(prev => [...prev, { role: 'assistant', content: "✅ I've added that workflow to your dashboard!" }]);
      setLastSuggestedWorkflow(null);
    } catch (error) {
      console.error("Error adding workflow:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Failed to add the workflow. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-advisor" className="flex flex-col h-[600px] glass-panel overflow-hidden">
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
              
              {msg.role === 'assistant' && i === messages.length - 1 && lastSuggestedWorkflow && (
                <div className="mt-4 pt-4 border-t border-aec-border">
                  <p className="text-xs text-slate-400 mb-3">I can add this to your dashboard:</p>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-aec-accent/20 mb-3">
                    <h4 className="font-bold text-aec-accent text-xs">{lastSuggestedWorkflow.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{lastSuggestedWorkflow.description}</p>
                  </div>
                  <button 
                    onClick={handleAddSuggestedWorkflow}
                    className="flex items-center gap-2 px-4 py-2 bg-aec-accent text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors w-full justify-center"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add to Dashboard
                  </button>
                </div>
              )}
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
            onClick={() => handleSend()}
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
