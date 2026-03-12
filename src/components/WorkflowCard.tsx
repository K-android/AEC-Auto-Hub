import React from 'react';
import { Workflow } from '../types';
import { Zap, Clock, Wrench, BarChart3, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  workflow: Workflow;
  onClick: (w: Workflow) => void;
}

export default function WorkflowCard({ workflow, onClick }: Props) {
  const getPotentialColor = (p: number) => {
    if (p > 80) return 'text-emerald-400';
    if (p > 50) return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div 
      onClick={() => onClick(workflow)}
      className={cn(
        "glass-panel p-5 hover:bg-aec-card/80 transition-all cursor-pointer group relative overflow-hidden",
        workflow.isAIDiscovery && "border-aec-accent/30 bg-aec-accent/5"
      )}
    >
      {workflow.isAIDiscovery && (
        <div className="absolute -right-6 -top-6 w-16 h-16 bg-aec-accent/10 rotate-45 flex items-end justify-center pb-2">
          <Sparkles className="w-3 h-3 text-aec-accent -rotate-45" />
        </div>
      )}

      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-5 h-5 text-aec-accent" />
      </div>

      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-aec-accent bg-aec-accent/10 px-2 py-0.5 rounded border border-aec-accent/20">
            {workflow.category}
          </span>
          {workflow.isAIDiscovery && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-aec-accent/20 text-aec-accent border-aec-accent/30 flex items-center gap-1">
              <Sparkles className="w-2 h-2" />
              AI Discovery
            </span>
          )}
          {workflow.priority && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded border",
              workflow.priority === 'P0' ? "bg-red-500/10 text-red-400 border-red-500/20" :
              workflow.priority === 'P1' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
              "bg-slate-800 text-slate-400 border-aec-border"
            )}>
              {workflow.priority}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Zap className={cn("w-3 h-3", getPotentialColor(workflow.automationPotential))} />
          <span className={cn("text-xs font-bold", getPotentialColor(workflow.automationPotential))}>
            {workflow.automationPotential}%
          </span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-aec-accent transition-colors">
        {workflow.title}
      </h3>
      
      <p className="text-sm text-slate-400 line-clamp-2 mb-4">
        {workflow.description}
      </p>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-aec-border/50">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className="text-[11px] text-slate-400">Complexity: <span className="text-slate-200">{workflow.complexity}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3 h-3 text-slate-500" />
          <span className="text-[11px] text-slate-400">ROI: <span className="text-slate-200">{workflow.roi}</span></span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {workflow.tools.slice(0, 3).map(tool => (
          <span key={tool} className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-aec-border">
            {tool}
          </span>
        ))}
        {workflow.tools.length > 3 && (
          <span className="text-[9px] text-slate-500">+{workflow.tools.length - 3} more</span>
        )}
      </div>
    </div>
  );
}
