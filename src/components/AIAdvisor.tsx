import React, { useState, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, PlusCircle, Copy, Check, FileText, Layers, ListChecks, Code2, AlertTriangle, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import { jsPDF } from "jspdf";
import { cn } from '../lib/utils';
import { Workflow } from '../types';
import { auth, db, collection, addDoc } from '../firebase';

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
  const lastProcessedTrigger = React.useRef<number | null>(null);

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
    if (externalTrigger && externalTrigger.timestamp !== lastProcessedTrigger.current) {
      lastProcessedTrigger.current = externalTrigger.timestamp;
      const { workflow } = externalTrigger;
      // Clear previous messages for a fresh plan
      setMessages([]);
      
      const prompt = `PLAN_REQUEST: Generate a COMPREHENSIVE and HIGHLY STRUCTURED automation plan for the following AEC workflow:
      Title: ${workflow.title}
      Category: ${workflow.category}
      Description: ${workflow.description}
      Pain Point: ${workflow.painPoint}
      Tech Stack (Tools): ${workflow.tools.join(', ')}
      
      CRITICAL: You MUST prioritize using the tools listed in the Tech Stack for this plan.
      
      Use the following EXACT Markdown structure:
      # 🚀 Automation Strategy: ${workflow.title}
      
      ## 📊 Overview
      - **Goal**: [One sentence goal]
      - **Primary Tools**: ${workflow.tools.join(', ')}
      - **Complexity**: ${workflow.complexity}
      
      ## 🏗️ Technical Architecture
      [Describe how the tools connect and the data flow.]
      
      ## 🛠️ Implementation Roadmap
      ### Phase 1: Setup & Configuration
      - [Step 1]
      - [Step 2]
      
      ### Phase 2: Development & Logic
      - [Step 1]
      - [Step 2]
      
      ### Phase 3: Validation & Deployment
      - [Step 1]
      - [Step 2]
      
      ## 💻 Code Snippets & Logic
      [Provide a high-quality, commented code snippet or logic flow using the primary tools.]
      
      ## ⚠️ Roadblocks & Mitigation
      - **Challenge**: [Challenge description]
      - **Solution**: [Mitigation strategy]`;
      
      handleSend(prompt);
    }
  }, [externalTrigger]);

  const handleSend = async (overrideInput?: string) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim()) return;

    const userMessage = messageToSend;
    if (!overrideInput) setInput('');
    
    const isPlanRequest = userMessage.startsWith('PLAN_REQUEST:');
    if (!isPlanRequest) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    }
    
    setIsLoading(true);
    setLastSuggestedWorkflow(null);

    try {
      const response = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage,
          isPlanRequest,
        }),
      });

      if (!response.ok) {
        throw new Error("Server-side advisor request failed");
      }

      const data = await response.json();
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
                    h1: ({ children }) => <h1 className="text-xl font-black text-white mb-6 mt-2 flex items-center gap-3 bg-aec-accent/10 p-4 rounded-xl border border-aec-accent/20 shadow-lg shadow-aec-accent/5">{children}</h1>,
                    h2: ({ children }) => {
                      const text = String(children).toLowerCase();
                      let Icon = FileText;
                      if (text.includes('overview') || text.includes('strategy')) Icon = Sparkles;
                      if (text.includes('architecture')) Icon = Layers;
                      if (text.includes('roadmap') || text.includes('implementation')) Icon = ListChecks;
                      if (text.includes('code') || text.includes('logic')) Icon = Code2;
                      if (text.includes('roadblock') || text.includes('mitigation')) Icon = AlertTriangle;
                      
                      return (
                        <h2 className="text-[11px] font-black text-slate-100 mb-4 mt-10 flex items-center gap-3 uppercase tracking-[0.2em] border-b border-aec-border/50 pb-2">
                          <div className="p-1.5 bg-aec-accent/10 rounded-lg border border-aec-accent/20">
                            <Icon className="w-3.5 h-3.5 text-aec-accent" />
                          </div>
                          {children}
                        </h2>
                      );
                    },
                    h3: ({ children }) => <h3 className="text-[10px] font-black text-aec-accent mb-4 mt-8 uppercase tracking-widest flex items-center gap-2 bg-aec-accent/5 py-1 px-3 rounded-md border border-aec-accent/10 w-fit">
                      {children}
                    </h3>,
                    p: ({ children }) => <p className="text-slate-300 mb-5 leading-relaxed text-sm font-medium">{children}</p>,
                    ul: ({ children }) => <ul className="space-y-4 mb-8 ml-1">{children}</ul>,
                    li: ({ children }) => (
                      <li className="flex gap-4 text-slate-300 text-sm group/li items-start">
                        <div className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-slate-700 group-hover/li:bg-aec-accent transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0)] group-hover/li:shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="leading-relaxed">{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => <strong className="text-aec-accent font-bold">{children}</strong>,
                    code: ({ children }) => (
                      <code className="bg-slate-950 px-2 py-0.5 rounded text-emerald-400 font-mono text-[11px] border border-aec-border/50">
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

              {msg.role === 'assistant' && (msg.content.includes('Automation Strategy') || msg.content.includes('Executive Summary')) && (
                <div className="mt-8 pt-6 border-t border-aec-border flex items-center justify-between bg-slate-900/30 -mx-4 -mb-4 p-4 rounded-b-2xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-aec-accent animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">AEC Technical Doc</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => copyToClipboard(msg.content)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-aec-border shadow-sm"
                    >
                      {copied ? <Check className="w-3 h-3 text-aec-accent" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy Plan'}
                    </button>
                    <button 
                      onClick={() => downloadPlanAsPDF(msg.content, externalTrigger?.workflow.title || 'AEC')}
                      className="flex items-center gap-2 px-3 py-2 bg-aec-accent text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-aec-accent/20 hover:bg-emerald-600"
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
          <div className="flex gap-3 mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-aec-accent animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-widest flex items-center gap-3 border border-aec-border">
              <Sparkles className="w-3 h-3 text-aec-accent animate-bounce" />
              Architecting Solution...
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
