import React, { useState, useEffect } from 'react';
import { Workflow } from '../types';
import WorkflowCard from './WorkflowCard';
import AIAdvisor from './AIAdvisor';
import WorkflowDiscovery from './WorkflowDiscovery';
import AnalyticsView from './AnalyticsView';
import SettingsView from './SettingsView';
import CompletedWorkflows from './CompletedWorkflows';
import { mockWorkflows } from '../data/mockWorkflows';
import { 
  auth, 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  signOut,
  Timestamp,
  writeBatch,
  doc,
  updateDoc
} from '../firebase';
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
  Loader2,
  Clock,
  Target,
  AlertCircle,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

type View = 'dashboard' | 'completed' | 'analytics' | 'settings';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isDailyDiscoveryLoading, setIsDailyDiscoveryLoading] = useState(false);
  const [automationTrigger, setAutomationTrigger] = useState<{ workflow: Workflow; timestamp: number } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const checkDailyDiscovery = async () => {
      if (!auth.currentUser || isLoading) return;

      const today = new Date().toISOString().split('T')[0];
      const storageKey = `lastDiscoveryDate_${auth.currentUser.uid}`;
      const lastDiscoveryDate = localStorage.getItem(storageKey);

      if (lastDiscoveryDate !== today) {
        setIsDailyDiscoveryLoading(true);
        await generateDailyDiscovery();
        localStorage.setItem(storageKey, today);
        setIsDailyDiscoveryLoading(false);
      }
    };

    checkDailyDiscovery();
  }, [auth.currentUser, isLoading]);

  const generateDailyDiscovery = async (isManual = false) => {
    if (!auth.currentUser) return;

    setIsDailyDiscoveryLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a unique and innovative AEC (Architecture, Engineering, Construction) automation workflow idea. 
        The idea should be practical but forward-thinking.
        Return it as a JSON object matching this structure:
        {
          "title": "string",
          "category": "Architecture" | "BIM" | "Structural" | "MEP" | "Construction",
          "description": "string (max 2 sentences)",
          "painPoint": "string",
          "automationPotential": number (0-100),
          "complexity": "Low" | "Medium" | "High",
          "tools": ["string", "string"],
          "roi": "Low" | "Medium" | "High" | "Very High",
          "priority": "P0" | "P1" | "P2" | "P3",
          "estimatedEffort": "string",
          "successMetrics": "string"
        }`,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        const workflowData = JSON.parse(response.text);
        await addDoc(collection(db, 'workflows'), {
          ...workflowData,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString(),
          isAIDiscovery: true
        });
        
        if (isManual) {
          // If manual, we don't necessarily update the lastDiscoveryDate 
          // to allow the auto-one to still run tomorrow if they just wanted an extra one today
          // but for simplicity let's just say it counts as today's
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem(`lastDiscoveryDate_${auth.currentUser.uid}`, today);
        }
      }
    } catch (error) {
      console.error("Failed to generate daily discovery:", error);
    } finally {
      setIsDailyDiscoveryLoading(false);
    }
  };

  // Form state
  const [newWorkflow, setNewWorkflow] = useState({
    title: '',
    category: 'Architecture' as Workflow['category'],
    description: '',
    painPoint: '',
    automationPotential: 50,
    complexity: 'Medium' as Workflow['complexity'],
    tools: '',
    roi: 'Medium',
    priority: 'P2' as Workflow['priority'],
    estimatedEffort: '',
    successMetrics: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'workflows'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Workflow[];
      setWorkflows(docs);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'workflows'), {
        ...newWorkflow,
        tools: newWorkflow.tools.split(',').map(t => t.trim()).filter(t => t !== ''),
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      
      setIsAddModalOpen(false);
      setNewWorkflow({
        title: '',
        category: 'Architecture',
        description: '',
        painPoint: '',
        automationPotential: 50,
        complexity: 'Medium',
        tools: '',
        roi: 'Medium',
        priority: 'P2',
        estimatedEffort: '',
        successMetrics: ''
      });
    } catch (error) {
      console.error("Failed to add workflow:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSeedWorkflows = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      mockWorkflows.forEach((w) => {
        const newDocRef = doc(collection(db, 'workflows'));
        const { id, ...workflowData } = w;
        batch.set(newDocRef, {
          ...workflowData,
          userId: auth.currentUser?.uid,
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to seed workflows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIDescription = async () => {
    if (!newWorkflow.title) return;
    
    setIsGeneratingDescription(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-latest",
        contents: `Generate a professional, concise description (max 2 sentences) for an AEC (Architecture, Engineering, Construction) workflow titled: "${newWorkflow.title}". Focus on the automation aspect.`,
      });
      
      if (response.text) {
        setNewWorkflow(prev => ({ ...prev, description: response.text.trim() }));
      }
    } catch (error) {
      console.error("Failed to generate AI description:", error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const markAsCompleted = async (id: string) => {
    setIsUpdatingStatus(true);
    try {
      const workflowRef = doc(db, 'workflows', id);
      await updateDoc(workflowRef, {
        status: 'Completed'
      });
      setSelectedWorkflow(null);
    } catch (error) {
      console.error("Error marking as completed:", error);
    } finally {
      setIsUpdatingStatus(false);
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
            <h1 className="font-bold text-lg leading-tight">AEC Automator</h1>
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
            onClick={() => setActiveView('completed')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all font-medium",
              activeView === 'completed' ? "bg-aec-accent/10 text-aec-accent" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            Completed
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

        <div className="pt-6 mt-auto border-t border-aec-border space-y-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-aec-border flex items-center justify-center overflow-hidden">
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{auth.currentUser?.displayName || 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{auth.currentUser?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">
              {activeView === 'dashboard' ? 'Workflow Dashboard' : 
               activeView === 'completed' ? 'Completed Workflows' :
               activeView === 'analytics' ? 'Workflow Analytics' : 'System Settings'}
            </h2>
            <p className="text-slate-400 text-sm">
              {activeView === 'dashboard' ? 'Manage and discover your AEC automation pipeline.' : 
               activeView === 'completed' ? 'Showcase of your automated AEC workflows and proofs.' :
               activeView === 'analytics' ? 'Deep dive into your automation data.' : 'Configure your AI preferences.'}
            </p>
          </div>
          {activeView === 'dashboard' && (
            <button 
              onClick={() => generateDailyDiscovery(true)}
              disabled={isDailyDiscoveryLoading}
              className="flex items-center gap-2 px-4 py-2 bg-aec-accent/10 hover:bg-aec-accent/20 text-aec-accent rounded-lg border border-aec-accent/30 transition-all font-bold text-sm disabled:opacity-50"
            >
              <Sparkles className={cn("w-4 h-4", isDailyDiscoveryLoading && "animate-spin")} />
              {isDailyDiscoveryLoading ? 'Discovering...' : 'Discover New Idea'}
            </button>
          )}
        </div>

        {isDailyDiscoveryLoading && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-aec-accent/10 border border-aec-accent/20 rounded-xl flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-aec-accent rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-200">Generating Daily AI Discovery...</h4>
              <p className="text-xs text-slate-400">Gemini is researching a new AEC automation idea for you.</p>
            </div>
          </motion.div>
        )}

        {activeView === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <WorkflowDiscovery 
                workflows={workflows} 
                isLoading={isLoading} 
                onSelectWorkflow={setSelectedWorkflow}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onSeedWorkflows={handleSeedWorkflows}
              />
            </div>
            <div className="space-y-6">
              <AIAdvisor externalTrigger={automationTrigger} />
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

        {activeView === 'completed' && (
          <div className="max-w-6xl mx-auto">
            <CompletedWorkflows workflows={workflows} />
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="max-w-6xl mx-auto">
            <AnalyticsView workflows={workflows} />
          </div>
        )}

        {activeView === 'settings' && (
          <div className="max-w-4xl mx-auto">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-aec-border flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Priority</div>
                      <div className="text-xs font-semibold text-slate-200">{selectedWorkflow.priority || 'P2'}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-aec-border flex items-center gap-3">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Effort</div>
                      <div className="text-xs font-semibold text-slate-200">{selectedWorkflow.estimatedEffort || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-aec-border flex items-center gap-3">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Success</div>
                      <div className="text-xs font-semibold text-slate-200 truncate max-w-[100px]">{selectedWorkflow.successMetrics || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-aec-border">
                  <button 
                    onClick={() => {
                      if (selectedWorkflow) {
                        setAutomationTrigger({
                          workflow: selectedWorkflow,
                          timestamp: Date.now()
                        });
                        setSelectedWorkflow(null);
                        // Scroll to AI Advisor
                        const advisor = document.getElementById('ai-advisor');
                        if (advisor) {
                          advisor.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    className="w-full py-3 bg-aec-accent hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-aec-accent/20 flex items-center justify-center gap-2 mb-3"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Automation Plan
                  </button>
                  <button 
                    onClick={() => markAsCompleted(selectedWorkflow.id)}
                    disabled={isUpdatingStatus}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-aec-border"
                  >
                    <CheckCircle2 className="w-5 h-5 text-aec-accent" />
                    {isUpdatingStatus ? 'Updating...' : 'Mark as Completed'}
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
                      onChange={e => setNewWorkflow({...newWorkflow, category: e.target.value as any})}
                      className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    >
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                    <select 
                      value={newWorkflow.priority}
                      onChange={e => setNewWorkflow({...newWorkflow, priority: e.target.value as any})}
                      className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    >
                      <option value="P0">P0 - Critical</option>
                      <option value="P1">P1 - High</option>
                      <option value="P2">P2 - Medium</option>
                      <option value="P3">P3 - Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Description</label>
                    <button 
                      type="button"
                      onClick={generateAIDescription}
                      disabled={!newWorkflow.title || isGeneratingDescription}
                      className="text-[10px] font-bold text-aec-accent hover:text-emerald-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Suggest
                    </button>
                  </div>
                  <textarea 
                    required
                    value={newWorkflow.description}
                    onChange={e => setNewWorkflow({...newWorkflow, description: e.target.value})}
                    className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none h-20 resize-none"
                    placeholder="Describe the workflow..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Est. Effort</label>
                    <input 
                      type="text"
                      value={newWorkflow.estimatedEffort}
                      onChange={e => setNewWorkflow({...newWorkflow, estimatedEffort: e.target.value})}
                      className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                      placeholder="e.g. 2 weeks"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Success Metrics</label>
                    <input 
                      type="text"
                      value={newWorkflow.successMetrics}
                      onChange={e => setNewWorkflow({...newWorkflow, successMetrics: e.target.value})}
                      className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                      placeholder="e.g. 20% time reduction"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Potential (%)</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={newWorkflow.automationPotential}
                      onChange={e => setNewWorkflow({...newWorkflow, automationPotential: parseInt(e.target.value)})}
                      className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none"
                    />
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
