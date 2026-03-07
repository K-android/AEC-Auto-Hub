import React from 'react';
import { 
  Settings, 
  Database, 
  Bot, 
  Bell, 
  Shield, 
  Trash2, 
  Download,
  Moon,
  Sun,
  Globe
} from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-aec-border bg-aec-card/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-aec-accent" />
            AI Configuration
          </h3>
          <p className="text-sm text-slate-400 mt-1">Customize how the AI Advisor and Generator behave.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-200">Daily AI Generation</div>
              <div className="text-xs text-slate-500">Automatically brainstorm new workflows every 24 hours.</div>
            </div>
            <div className="w-12 h-6 bg-aec-accent rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Advisor Persona</label>
            <select className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-aec-accent outline-none">
              <option>Expert BIM Manager</option>
              <option>Computational Designer</option>
              <option>Construction Technologist</option>
              <option>Software Engineer (AEC Focus)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-aec-border bg-aec-card/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Data Management
          </h3>
          <p className="text-sm text-slate-400 mt-1">Manage your local workflow database and exports.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-aec-border rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-aec-border rounded-lg text-sm font-medium transition-colors">
              <Globe className="w-4 h-4" />
              Sync to Cloud
            </button>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
            Clear All Workflows
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-aec-border bg-aec-card/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            System Preferences
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-slate-400" />
              <div className="text-sm text-slate-200">Dark Mode (Forced)</div>
            </div>
            <div className="text-[10px] font-mono text-aec-accent bg-aec-accent/10 px-2 py-0.5 rounded">ACTIVE</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-400" />
              <div className="text-sm text-slate-200">Notifications</div>
            </div>
            <div className="w-12 h-6 bg-slate-700 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full shadow-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-600 font-mono uppercase tracking-widest">
        AEC Workflow Automator v1.2.0 • Build 2026.03.07
      </div>
    </div>
  );
}
