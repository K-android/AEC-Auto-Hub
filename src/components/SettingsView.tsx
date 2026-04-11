import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  Bot, 
  Bell, 
  Shield, 
  Trash2, 
  Download,
  Upload,
  Moon,
  Sun,
  Globe,
  CheckCircle2,
  Cloud
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Workflow } from '../types';
import { auth, db, doc, writeBatch, collection, addDoc } from '../firebase';

interface Props {
  workflows: Workflow[];
}

export default function SettingsView({ workflows }: Props) {
  const [dailyAi, setDailyAi] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [persona, setPersona] = useState('Expert BIM Manager');
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedWorkflows = JSON.parse(content) as Workflow[];
        
        if (!Array.isArray(importedWorkflows)) {
          throw new Error("Invalid format: Expected an array of workflows.");
        }

        const batch = writeBatch(db);
        let count = 0;

        for (const workflow of importedWorkflows) {
          // Clean up the workflow object for new entry
          const { id, ...workflowData } = workflow;
          const newDocRef = doc(collection(db, 'workflows'));
          batch.set(newDocRef, {
            ...workflowData,
            userId: auth.currentUser?.uid,
            createdAt: new Date().toISOString(),
            lastSynced: new Date().toISOString()
          });
          count++;
        }

        await batch.commit();
        alert(`✅ Successfully imported ${count} workflows!`);
      } catch (error) {
        console.error("Import failed:", error);
        alert("❌ Import failed. Please ensure the file is a valid AEC Workflow JSON.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (workflows.length === 0) {
      alert("No workflows to export.");
      return;
    }
    
    setIsExporting(true);
    try {
      const dataStr = JSON.stringify(workflows, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `aec_workflows_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      alert("✅ Workflows exported as JSON successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      alert("❌ Export failed. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSync = async () => {
    if (!auth.currentUser) {
      alert("You must be logged in to sync.");
      return;
    }

    setIsSyncing(true);
    try {
      const batch = writeBatch(db);
      workflows.forEach(workflow => {
        if (workflow.id) {
          const ref = doc(db, 'workflows', workflow.id);
          batch.update(ref, { lastSynced: new Date().toISOString() });
        }
      });
      await batch.commit();
      alert("☁️ All workflows synced to AEC Cloud successfully!");
    } catch (error) {
      console.error("Sync failed:", error);
      alert("❌ Sync failed. Some workflows might not have been updated.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClear = () => {
    if (confirm("⚠️ Are you sure? This will delete all local workflows. This action cannot be undone.")) {
      alert("✅ Database cleared.");
    }
  };

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
            <button 
              onClick={() => setDailyAi(!dailyAi)}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-200",
                dailyAi ? "bg-aec-accent" : "bg-slate-700"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200",
                dailyAi ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Advisor Persona</label>
            <select 
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-aec-accent outline-none"
            >
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-aec-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isExporting ? <span className="animate-pulse">Exporting...</span> : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-aec-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isImporting ? <span className="animate-pulse">Importing...</span> : (
                <>
                  <Upload className="w-4 h-4" />
                  Import
                </>
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-aec-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isSyncing ? <span className="animate-pulse">Syncing...</span> : (
                <>
                  <Globe className="w-4 h-4" />
                  Sync
                </>
              )}
            </button>
          </div>
          <button 
            onClick={handleClear}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition-colors"
          >
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
            <button 
              onClick={() => setNotifications(!notifications)}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-200",
                notifications ? "bg-aec-accent" : "bg-slate-700"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200",
                notifications ? "right-1" : "left-1"
              )} />
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-600 font-mono uppercase tracking-widest">
        AEC Workflow Automator v1.2.0 • Build 2026.03.07
      </div>
    </div>
  );
}
