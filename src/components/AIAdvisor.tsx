import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Send, Bot, User, Loader2, Sparkles, PlusCircle, Copy, Check, FileText, Layers, ListChecks, Code2, AlertTriangle, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import { jsPDF } from "jspdf";
import { cn } from '../lib/utils';
import { Workflow } from '../types';
import { auth, db, collection, addDoc } from '../firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Props {
  externalTrigger?: {
    workflow: Workflow;
    timestamp: number;
  } | null;
  embedded?: boolean;
}

export default function AIAdvisor({ externalTrigger, embedded }: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSuggestedWorkflow, setLastSuggestedWorkflow] = useState<Partial<Workflow> | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPlanAsPDF = (content: string, title: string) => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(content, 180);
    doc.setFontSize(16);
    doc.text(`Automation Plan: ${title}`, 10, 20);
    doc.setFontSize(10);
    doc.text(splitText, 10, 30);
    doc.save(`${title.replace(/\s+/g, '_')}_Automation_Plan.pdf`);
    alert("📄 PDF Exported Successfully!");
  };

  useEffect(() => {
    if (externalTrigger) {
      const { workflow } = externalTrigger;
      const prompt = `PLAN_REQUEST: Generate a structured automation plan for the following AEC workflow:
      Title: ${workflow.title}
      Category: ${workflow.category}
      Description: ${workflow.description}
      Pain Point: ${workflow.painPoint}
      Tech Stack (Tools): ${workflow.tools.join(', ')}
      
      CRITICAL: You MUST prioritize using the tools listed in the Tech Stack for this plan.
      
      Structure your response as follows:
      1. **Executive Summary**: Brief overview of the automation goal.
      2. **Technical Architecture**: How the listed tools (${workflow.tools.join(', ')}) will interact.
      3. **Step-by-Step Implementation**: Detailed phases from setup to deployment.
      4. **Code Snippets/Logic**: Provide pseudocode or specific API examples for ${workflow.tools[0] || 'the primary tool'}.
      5. **Roadblocks & Mitigation**: Potential AEC-specific challenges.`;
      
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
      const isPlanRequest = userMessage.startsWith('PLAN_REQUEST:');
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `You are an expert AEC (Architecture, Engineering, Construction) Automation Consultant. 
            
            ${isPlanRequest ? 'The user is requesting a detailed automation plan for an EXISTING workflow. Focus on technical implementation.' : 'If the user describes a new workflow they want to add to their dashboard, you MUST return a JSON object with the workflow details. Set "isPublic" to false by default unless they explicitly ask to share it with the community. BE STRICT: Only suggest adding a workflow if it is a legitimate AEC-related task. If the request is nonsensical or unrelated to AEC, respond with a polite CHAT message explaining your purpose.'}
            If the user is just asking a general question, return a text response.
            
            User request: ${userMessage}` }]
          }
        ],
        config: {
          systemInstruction: `You are a specialized AI for AEC automation. 
          
          Intents:
          - "ADD_WORKFLOW": Use this if the user describes a NEW task they want to track/automate.
          - "PLAN": Use this if the user is asking for a technical implementation plan for a workflow. You MUST use the provided tech stack and follow a structured Markdown format with clear headings.
          - "CHAT": Use this for general questions or conversation.

          If the intent is ADD_WORKFLOW, provide the details in JSON format. 
          The JSON should have:
          - "intent": "ADD_WORKFLOW", "PLAN", or "CHAT"
          - "message": A helpful text response to the user. For "PLAN", this MUST be a highly structured technical guide in Markdown, strictly utilizing the tools mentioned in the user's request or the provided tech stack.
          - "workflow": (Only if intent is ADD_WORKFLOW) An object with:
            - "title": string
            - "category": "Architecture" | "BIM" | "Structural" | "MEP" | "Construction"
            - "description": A professional, contextually relevant description of exactly one or two sentences. Focus on how this workflow automates processes and improves efficiency in the AEC industry.
            - "painPoint": string
            - "automationPotential": number (0-100)
            - "complexity": "Low" | "Medium" | "High"
            - "tools": string[]
            - "roi": string
            - "priority": "P0" | "P1" | "P2" | "P3"
            - "estimatedEffort": string
            - "isPublic": boolean
            - "workflowId": string (if applicable)
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
                  isPublic: { type: Type.BOOLEAN },
                  successMetrics: { type: Type.STRING }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const assistantMessage = data.message || "I've analyzed your request.";
      
      // Only suggest adding if it's explicitly a NEW workflow suggestion
      if (data.intent === 'ADD_WORKFLOW' && data.workflow && !isPlanRequest) {
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
    <div id="ai-advisor" className={cn(
      "flex flex-col h-full overflow-hidden",
      !embedded && "glass-panel"
    )}>
      {!embedded && (
        <div className="p-4 border-b border-aec-border flex items-center gap-2 bg-aec-card/80">
          <Bot className="w-5 h-5 text-aec-accent" />
          <h2 className="font-semibold text-slate-100">Automation Advisor</h2>
          <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            <Sparkles className="w-3 h-3" />
            Powered by Gemini
          </div>
        </div>
      )}

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Ask me how to automate a specific BIM or AEC task.</p>
            <p className="text-sm italic mt-2">"How can I automate wall-to-floor join cleanup in Revit?"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex gap-3",
            msg.role === 'user' ? "ml-auto flex-row-reverse max-w-[85%]" : "mr-auto max-w-[95%]"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-aec-accent/20" : "bg-slate-700"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-aec-accent" /> : <Bot className="w-4 h-4 text-slate-300" />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
              msg.role === 'user' ? "bg-aec-accent text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none border border-aec-border"
            )}>
              <div className="markdown-body">
                <Markdown
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-bold text-aec-accent mb-4 mt-2 flex items-center gap-2 border-b border-aec-border pb-2">{children}</h1>,
                    h2: ({ children }) => {
                      const text = String(children).toLowerCase();
                      let Icon = FileText;
                      if (text.includes('architecture')) Icon = Layers;
                      if (text.includes('step') || text.includes('implementation')) Icon = ListChecks;
                      if (text.includes('code') || text.includes('logic')) Icon = Code2;
                      if (text.includes('roadblock') || text.includes('mitigation')) Icon = AlertTriangle;
                      
                      return (
                        <h2 className="text-md font-bold text-slate-100 mb-3 mt-6 flex items-center gap-2">
                          <div className="p-1.5 bg-slate-700/50 rounded-lg border border-aec-border">
                            <Icon className="w-4 h-4 text-aec-accent" />
                          </div>
                          {children}
                        </h2>
                      );
                    },
                    p: ({ children }) => <p className="text-slate-300 mb-4 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="space-y-2 mb-4 ml-4">{children}</ul>,
                    li: ({ children }) => (
                      <li className="flex gap-2 text-slate-300">
                        <span className="text-aec-accent mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-aec-accent" />
                        <span>{children}</span>
                      </li>
                    ),
                    code: ({ children }) => (
                      <code className="bg-slate-950 px-1.5 py-0.5 rounded text-aec-accent font-mono text-[11px] border border-aec-border/50">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <div className="relative group/code my-4">
                        <pre className="bg-slate-950 p-4 rounded-xl border border-aec-border overflow-x-auto font-mono text-[12px] text-emerald-400 leading-relaxed shadow-inner">
                          {children}
                        </pre>
                        <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              const code = (children as any)?.props?.children;
                              if (code) copyToClipboard(String(code));
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-aec-border text-slate-400 transition-all"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )
                  }}
                >
                  {msg.content}
                </Markdown>
              </div>

              {msg.role === 'assistant' && msg.content.includes('Executive Summary') && (
                <div className="mt-6 pt-4 border-t border-aec-border flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Technical Document</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyToClipboard(msg.content)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all border border-aec-border"
                    >
                      {copied ? <Check className="w-3 h-3 text-aec-accent" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy Plan'}
                    </button>
                    <button 
                      onClick={() => downloadPlanAsPDF(msg.content, externalTrigger?.workflow.title || 'AEC')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-aec-accent/10 hover:bg-aec-accent/20 text-aec-accent rounded-lg text-[10px] font-bold transition-all border border-aec-accent/20"
                    >
                      <Download className="w-3 h-3" />
                      Export PDF
                    </button>
                  </div>
                </div>
              )}
              
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
