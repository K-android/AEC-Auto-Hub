import React, { useState, useEffect } from 'react';
import { Workflow } from '../types';
import WorkflowCard from './WorkflowCard';
import AIAdvisor from './AIAdvisor';
import WorkflowDiscovery from './WorkflowDiscovery';
import AnalyticsView from './AnalyticsView';
import SettingsView from './SettingsView';
import { 
  LayoutDashboard, 
  Search, 
  Filter, 
  Plus, 
  BarChart, 
  Settings, 
  HardHat,
  Building2,
  Compass,
  Cpu,
  Info,
  X,
  Zap,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'analytics' | 'settings';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newWorkflow, setNewWorkflow] = useState({
    title: '',
    category: 'Architecture',
    description: '',
    painPoint: '',
    automationPotential: 50,
    complexity: 'Medium',
    tools: '',
    roi: 'Medium'
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newWorkflow,
          tools: newWorkflow.tools.split(',').map(t => t.trim()).filter(t => t !== '')
        })
      });
      if (response.ok) {
        setIsAddModalOpen(false);
        setNewWorkflow({
          title: '',
          category: 'Architecture',
          description: '',
          painPoint: '',
          automationPotential: 50,
          complexity: 'Medium',
          tools: '',
          roi: 'Medium'
        });
        fetchWorkflows();
      }
    } catch (error) {
      console.error("Failed to add workflow:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['All', 'Architecture', 'BIM', 'Structural', 'MEP', 'Construction'];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-aec-bg">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-aec-border p-6 bg-aec-card/30">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-aec-accent rounded-xl flex items-center justify-center shadow-lg shadow-aec-accent/20">
            <Cpu className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">AEC Auto</h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">Workflow Hub</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveView('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all font-medium",
              activeView === 'dashboard' ? "bg-aec-accent/10 text-aec-accent" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveView('analytics')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all font-medium",
              activeView === 'analytics' ? "bg-aec-accent/10 text-aec-accent" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <BarChart className="w-4 h-4" />
            Analytics
          </button>
          <button 
            onClick={() => setActiveView('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all font-medium",
              activeView === 'settings' ? "bg-aec-accent/10 text-aec-accent" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>

        <div className="mt-auto p-4 glass-panel bg-aec-accent/5 border-aec-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-3 h-3 text-aec-accent" />
            <span className="text-[10px] uppercase font-bold text-aec-accent">Pro Tip</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Use the AI Advisor to generate custom Dynamo scripts for your specific Revit tasks.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {activeView === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <WorkflowDiscovery 
                workflows={workflows} 
                isLoading={isLoading} 
                onSelectWorkflow={setSelectedWorkflow}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            </div>
            <div className="space-y-6">
              <AIAdvisor />
              <div className="glass-panel p-6 bg-gradient-to-br from-aec-card to-aec-bg">
                <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-aec-accent" />
                  Industry Trends
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Generative Design', trend: '+45%', icon: Building2 },
                    { label: 'Digital Twins', trend: '+30%', icon: HardHat },
                    { label: 'Robotic Fabrication', trend: '+12%', icon: Cpu },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-aec-border/50">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-300">{item.label}</span>
                      </div>
                      <span className="text-xs font-mono text-aec-accent">{item.trend}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <h2 className="text-2xl font-bold text-slate-100">Workflow Analytics</h2>
              <p className="text-slate-400 text-sm">Deep dive into your automation data and sector performance.</p>
            </header>
            <AnalyticsView workflows={workflows} />
          </div>
        )}

        {activeView === 'settings' && (
          <div className="max-w-4xl mx-auto">
            <header className="mb-8">
              <h2 className="text-2xl font-bold text-slate-100">System Settings</h2>
              <p className="text-slate-400 text-sm">Configure your AI preferences and manage your data.</p>
            </header>
            <SettingsView />
          </div>
        )}
      </main>

      {/* Workflow Detail Modal */}
      <AnimatePresence>
        {selectedWorkflow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-2xl bg-aec-bg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-aec-border flex justify-between items-center bg-aec-card/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-aec-accent/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-aec-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100">{selectedWorkflow.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedWorkflow(null)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <section>
                  <h4 className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-widest">Description</h4>
                  <p className="text-slate-300 leading-relaxed">{selectedWorkflow.description}</p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section>
                    <h4 className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-widest">Pain Point</h4>
                    <p className="text-slate-400 text-sm italic border-l-2 border-red-500/30 pl-4">{selectedWorkflow.painPoint}</p>
                  </section>
                  <section>
                    <h4 className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-widest">Tech Stack</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorkflow.tools.map(tool => (
                        <span key={tool} className="px-3 py-1 rounded-full bg-slate-800 border border-aec-border text-xs text-slate-300">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-aec-border text-center">
                    <div className="text-2xl font-bold text-aec-accent mb-1">{selectedWorkflow.automationPotential}%</div>
                    <div className="text-[10px] uppercase text-slate-500 font-bold">Potential</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-aec-border text-center">
                    <div className="text-2xl font-bold text-slate-100 mb-1">{selectedWorkflow.complexity}</div>
                    <div className="text-[10px] uppercase text-slate-500 font-bold">Complexity</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-aec-border text-center">
                    <div className="text-2xl font-bold text-emerald-400 mb-1">{selectedWorkflow.roi}</div>
                    <div className="text-[10px] uppercase text-slate-500 font-bold">ROI</div>
                  </div>
                </div>

                <div className="pt-6 border-t border-aec-border">
                  <button 
                    onClick={() => {
                      // In a real app, this would trigger the AI Advisor with context
                      setSelectedWorkflow(null);
                    }}
                    className="w-full py-3 bg-aec-accent hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-aec-accent/20 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Automation Plan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Workflow Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-xl bg-aec-bg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-aec-border flex justify-between items-center bg-aec-card/50">
                <h3 className="text-xl font-bold text-slate-100">Add New Workflow</h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleAddWorkflow} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                  <input 
                    required
                    type="text"
                    value={newWorkflow.title}
                    onChange={e => setNewWorkflow({...newWorkflow, title: e.target.value})}
                    className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    placeholder="e.g. Automatic Wall Join Cleanup"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                    <select 
                      value={newWorkflow.category}
                      onChange={e => setNewWorkflow({...newWorkflow, category: e.target.value})}
                      className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    >
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Complexity</label>
                    <select 
                      value={newWorkflow.complexity}
                      onChange={e => setNewWorkflow({...newWorkflow, complexity: e.target.value as any})}
                      className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                  <textarea 
                    required
                    value={newWorkflow.description}
                    onChange={e => setNewWorkflow({...newWorkflow, description: e.target.value})}
                    className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none h-24 resize-none"
                    placeholder="Describe the workflow..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pain Point</label>
                  <input 
                    type="text"
                    value={newWorkflow.painPoint}
                    onChange={e => setNewWorkflow({...newWorkflow, painPoint: e.target.value})}
                    className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    placeholder="What is the main problem?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Automation Potential (%)</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={newWorkflow.automationPotential}
                      onChange={e => setNewWorkflow({...newWorkflow, automationPotential: parseInt(e.target.value)})}
                      className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ROI</label>
                    <select 
                      value={newWorkflow.roi}
                      onChange={e => setNewWorkflow({...newWorkflow, roi: e.target.value})}
                      className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Very High">Very High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tools (comma separated)</label>
                  <input 
                    type="text"
                    value={newWorkflow.tools}
                    onChange={e => setNewWorkflow({...newWorkflow, tools: e.target.value})}
                    className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    placeholder="e.g. Revit API, Python, Dynamo"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-3 bg-aec-accent hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-aec-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Add Workflow
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
