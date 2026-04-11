import React, { useState, useEffect } from 'react';
import { Workflow } from '../types';
import WorkflowCard from './WorkflowCard';
import AIAdvisor from './AIAdvisor';
import WorkflowDiscovery from './WorkflowDiscovery';
import AnalyticsView from './AnalyticsView';
import SettingsView from './SettingsView';
import CompletedWorkflows from './CompletedWorkflows';
import KanbanBoard from './KanbanBoard';
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
  updateDoc,
  deleteDoc
} from '../firebase';
import { 
  LayoutDashboard, 
  Search, 
  Filter, 
  Plus, 
  PlusCircle,
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
  Video,
  Trash2,
  Columns3,
  List as ListIcon,
  Users,
  Globe,
  Lock,
  BookCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

type View = 'dashboard' | 'completed' | 'analytics' | 'settings' | 'community' | 'published';

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
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<'list' | 'kanban'>('list');
  const [publicWorkflows, setPublicWorkflows] = useState<Workflow[]>([]);
  const [isPublicLoading, setIsPublicLoading] = useState(false);
  const [communityTab, setCommunityTab] = useState<'all' | 'proven' | 'collaboration'>('all');
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'plan' | 'community'>('details');
  const [commentText, setCommentText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'proof'>('note');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
          "description": "A professional, contextually relevant description of exactly one or two sentences. Focus on how this workflow automates processes and improves efficiency in the AEC industry.",
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
          isAIDiscovery: true,
          status: 'Pending'
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
    successMetrics: '',
    isPublic: false
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

  useEffect(() => {
    if (activeView !== 'community') return;

    setIsPublicLoading(true);
    const q = query(
      collection(db, 'workflows'),
      where('isPublic', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Workflow[];
      
      // Auto-filter duplicates by title for the community view
      const uniqueDocs = docs.reduce((acc: Workflow[], current) => {
        const x = acc.find(item => item.title.toLowerCase() === current.title.toLowerCase());
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      setPublicWorkflows(uniqueDocs);
      setIsPublicLoading(false);
    }, (error) => {
      console.error("Public fetch error:", error);
      setIsPublicLoading(false);
    });

    return () => unsubscribe();
  }, [activeView]);

  const handleAddWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    // Strict Validation to prevent "random shit"
    if (newWorkflow.title.trim().length < 5) {
      alert("⚠️ Workflow title is too short. Please provide a descriptive name.");
      return;
    }
    if (newWorkflow.description.trim().length < 20) {
      alert("⚠️ Description is too brief. Please explain the workflow in more detail.");
      return;
    }
    if (newWorkflow.tools.trim() === '') {
      alert("⚠️ Please specify at least one tool used in this workflow.");
      return;
    }

    // Duplicate Check - Only for Public workflows
    if (newWorkflow.isPublic) {
      const isDuplicate = publicWorkflows.some(w => w.title.toLowerCase() === newWorkflow.title.toLowerCase());
      if (isDuplicate) {
        alert("⚠️ A workflow with this title already exists in the community library. Please choose a unique name or contribute to the existing one!");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'workflows'), {
        ...newWorkflow,
        tools: newWorkflow.tools.split(',').map(t => t.trim()).filter(t => t !== ''),
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        status: 'Pending'
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
        successMetrics: '',
        isPublic: false
      });
    } catch (error) {
      console.error("Failed to add workflow:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSeedWorkflows = async () => {
    if (!auth.currentUser || workflows.length > 0) return;
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      mockWorkflows.forEach((w) => {
        const newDocRef = doc(collection(db, 'workflows'));
        const { id, ...workflowData } = w;
        batch.set(newDocRef, {
          ...workflowData,
          userId: auth.currentUser?.uid,
          createdAt: new Date().toISOString(),
          status: 'Pending'
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
        model: "gemini-3-flash-preview",
        contents: `Generate a professional, contextually relevant description for an AEC (Architecture, Engineering, Construction) workflow. 
        Title: "${newWorkflow.title}"
        Category: "${newWorkflow.category}"
        
        The description MUST be exactly one or two sentences long. Focus on how this workflow automates processes and improves efficiency in the AEC industry. Do not include any introductory text or formatting.`,
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

  const handleAddComment = async () => {
    if (!selectedWorkflow || !commentText.trim() || !auth.currentUser) return;
    setIsSubmittingFeedback(true);
    try {
      const newComment = {
        id: Date.now().toString(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        userPhoto: auth.currentUser.photoURL || undefined,
        text: commentText,
        timestamp: new Date().toISOString()
      };

      const workflowRef = doc(db, 'workflows', selectedWorkflow.id);
      const updatedComments = [...(selectedWorkflow.comments || []), newComment];
      
      await updateDoc(workflowRef, { comments: updatedComments });
      setSelectedWorkflow({ ...selectedWorkflow, comments: updatedComments });
      setCommentText('');
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleAddContribution = async () => {
    if (!selectedWorkflow || !noteText.trim() || !auth.currentUser) return;
    setIsSubmittingFeedback(true);
    try {
      const newContribution = {
        id: Date.now().toString(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        text: noteText,
        type: noteType,
        timestamp: new Date().toISOString()
      };

      const workflowRef = doc(db, 'workflows', selectedWorkflow.id);
      const updatedContributions = [...(selectedWorkflow.contributions || []), newContribution];
      
      await updateDoc(workflowRef, { contributions: updatedContributions });
      setSelectedWorkflow({ ...selectedWorkflow, contributions: updatedContributions });
      setNoteText('');
    } catch (error) {
      console.error("Failed to add contribution:", error);
    } finally {
      setIsSubmittingFeedback(false);
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

  const handleDeleteWorkflow = async (id: string) => {
    setIsUpdatingStatus(true);
    try {
      const workflowRef = doc(db, 'workflows', id);
      await deleteDoc(workflowRef);
      setSelectedWorkflow(null);
      setWorkflowToDelete(null);
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleWorkflowVisibility = async (workflow: Workflow) => {
    if (!auth.currentUser || workflow.userId !== auth.currentUser.uid) return;
    
    const newVisibility = !workflow.isPublic;

    // Check for duplicates if trying to make public
    if (newVisibility) {
      const isDuplicate = publicWorkflows.some(w => 
        w.id !== workflow.id && 
        w.title.toLowerCase() === workflow.title.toLowerCase()
      );
      if (isDuplicate) {
        alert("⚠️ Cannot share: A workflow with this title already exists in the community library.");
        return;
      }
    }
    
    setIsUpdatingStatus(true);
    try {
      const workflowRef = doc(db, 'workflows', workflow.id);
      await updateDoc(workflowRef, { isPublic: newVisibility });
      
      // Update local state for the selected workflow if it's open
      if (selectedWorkflow?.id === workflow.id) {
        setSelectedWorkflow({ ...selectedWorkflow, isPublic: newVisibility });
      }
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCleanDuplicates = async () => {
    if (!auth.currentUser || workflows.length === 0) return;
    
    setIsCleaningDuplicates(true);
    try {
      const seen = new Set();
      const duplicates: string[] = [];
      
      // Sort by createdAt so we keep the oldest one
      const sortedWorkflows = [...workflows].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      sortedWorkflows.forEach(w => {
        const key = `${w.title.toLowerCase()}_${w.category}`;
        if (seen.has(key)) {
          duplicates.push(w.id);
        } else {
          seen.add(key);
        }
      });

      if (duplicates.length > 0) {
        const batch = writeBatch(db);
        duplicates.forEach(id => {
          batch.delete(doc(db, 'workflows', id));
        });
        await batch.commit();
        alert(`Successfully removed ${duplicates.length} duplicate workflows.`);
      } else {
        alert("No duplicates found.");
      }
    } catch (error) {
      console.error("Failed to clean duplicates:", error);
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const categories = ['All', 'Architecture', 'BIM', 'Structural', 'MEP', 'Construction'];

  const handleSelectWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setActiveModalTab('details');
  };

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

        <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="pb-4 mb-4 border-b border-aec-border/50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-4">Workspace</p>
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
          </div>

          <div className="pb-4 mb-4 border-b border-aec-border/50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-4">Global Library</p>
            <button 
              onClick={() => setActiveView('community')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all font-medium",
                activeView === 'community' ? "bg-aec-accent/10 text-aec-accent" : "text-slate-400 hover:bg-slate-800"
              )}
            >
              <Users className="w-4 h-4" />
              Community
            </button>
            <button 
              onClick={() => setActiveView('published')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all font-medium",
                activeView === 'published' ? "bg-aec-accent/10 text-aec-accent" : "text-slate-400 hover:bg-slate-800"
              )}
            >
              <BookCheck className="w-4 h-4" />
              My Published
            </button>
          </div>
        </nav>

        <div className="pt-4 mt-auto border-t border-aec-border space-y-2">
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
          
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-900/50 rounded-xl border border-aec-border/50">
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
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">
                {activeView === 'dashboard' ? 'Workflow Dashboard' : 
                 activeView === 'completed' ? 'Completed Workflows' :
                 activeView === 'analytics' ? 'Workflow Analytics' : 
                 activeView === 'community' ? 'Community Library' : 
                 activeView === 'published' ? 'My Published Workflows' : 'System Settings'}
              </h2>
              <p className="text-slate-400 text-sm">
                {activeView === 'dashboard' ? 'Manage and discover your AEC automation pipeline.' : 
                 activeView === 'completed' ? 'Showcase of your automated AEC workflows and proofs.' :
                 activeView === 'analytics' ? 'Deep dive into your automation data.' : 
                 activeView === 'community' ? 'Discover automation workflows shared by the AEC community.' : 
                 activeView === 'published' ? 'Workflows you have shared with the community.' : 'Configure your AI preferences.'}
              </p>
            </div>
            {activeView === 'dashboard' && workflows.length > 0 && (
              <button 
                onClick={handleCleanDuplicates}
                disabled={isCleaningDuplicates}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-aec-border transition-all text-xs font-medium disabled:opacity-50"
              >
                <Trash2 className={cn("w-3 h-3", isCleaningDuplicates && "animate-pulse")} />
                {isCleaningDuplicates ? 'Cleaning...' : 'Clean Duplicates'}
              </button>
            )}
          </div>
          {activeView === 'dashboard' && (
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-900 p-1 rounded-lg border border-aec-border mr-2">
                <button 
                  onClick={() => setDashboardMode('list')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    dashboardMode === 'list' ? "bg-aec-accent text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                  title="List View"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setDashboardMode('kanban')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    dashboardMode === 'kanban' ? "bg-aec-accent text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                  title="Kanban Board"
                >
                  <Columns3 className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={() => generateDailyDiscovery(true)}
                disabled={isDailyDiscoveryLoading}
                className="flex items-center gap-2 px-4 py-2 bg-aec-accent/10 hover:bg-aec-accent/20 text-aec-accent rounded-lg border border-aec-accent/30 transition-all font-bold text-sm disabled:opacity-50"
              >
                <Sparkles className={cn("w-4 h-4", isDailyDiscoveryLoading && "animate-spin")} />
                {isDailyDiscoveryLoading ? 'Discovering...' : 'Discover New Idea'}
              </button>
            </div>
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
          <div className={cn(
            "grid gap-8",
            dashboardMode === 'list' ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
          )}>
            <div className={cn(dashboardMode === 'list' ? "lg:col-span-2" : "")}>
              {dashboardMode === 'list' ? (
                <WorkflowDiscovery 
                  workflows={workflows} 
                  isLoading={isLoading} 
                  onSelectWorkflow={handleSelectWorkflow}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onSeedWorkflows={handleSeedWorkflows}
                />
              ) : (
                <KanbanBoard 
                  workflows={workflows}
                  onSelectWorkflow={handleSelectWorkflow}
                />
              )}
            </div>
            {dashboardMode === 'list' && (
              <div className="space-y-6">
                {!selectedWorkflow && (
                  <div className="h-[600px] animate-in fade-in duration-500">
                    <AIAdvisor externalTrigger={automationTrigger} />
                  </div>
                )}
                <div className="glass-panel p-6 bg-gradient-to-br from-aec-card to-aec-bg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-aec-accent" />
                      Industry Trends
                    </h3>
                    <div className="flex gap-1">
                      <button className="p-1.5 hover:bg-slate-800 rounded-md text-slate-500 hover:text-aec-accent transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 hover:bg-slate-800 rounded-md text-slate-500 hover:text-aec-accent transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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
            )}
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

        {activeView === 'community' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <Globe className="w-7 h-7 text-aec-accent" />
                Community Library
              </h2>
              <p className="text-slate-400 mt-1">Discover and collaborate on AEC automation workflows from around the world.</p>
            </div>
            <div className="flex items-center gap-4 mb-8 p-1 bg-slate-900/50 rounded-xl border border-aec-border w-fit">
              <button 
                onClick={() => setCommunityTab('all')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  communityTab === 'all' ? "bg-aec-accent text-white shadow-lg shadow-aec-accent/20" : "text-slate-400 hover:text-slate-200"
                )}
              >
                All Workflows
              </button>
              <button 
                onClick={() => setCommunityTab('proven')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  communityTab === 'proven' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                Proven Automations
              </button>
              <button 
                onClick={() => setCommunityTab('collaboration')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  communityTab === 'collaboration' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Users className="w-4 h-4" />
                Assistance Required
              </button>
            </div>

            {isPublicLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-aec-accent animate-spin mb-4" />
                <p className="text-slate-400">Loading community workflows...</p>
              </div>
            ) : publicWorkflows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicWorkflows
                  .filter(w => {
                    if (communityTab === 'proven') return w.status === 'Completed';
                    if (communityTab === 'collaboration') return w.status !== 'Completed';
                    return true;
                  })
                  .map(workflow => (
                    <WorkflowCard 
                      key={workflow.id} 
                      workflow={workflow} 
                      onClick={() => handleSelectWorkflow(workflow)}
                      showStatus={true}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-aec-card/20 rounded-2xl border border-aec-border border-dashed">
                <Globe className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-300">No public workflows yet</h3>
                <p className="text-slate-500 max-w-md mx-auto mt-2">
                  Be the first to share an automation workflow with the community! 
                  Toggle "Public" when adding a new workflow.
                </p>
              </div>
            )}
          </div>
        )}

        {activeView === 'published' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <BookCheck className="w-7 h-7 text-aec-accent" />
                My Published Workflows
              </h2>
              <p className="text-slate-400 mt-1">Workflows you've shared with the global AEC community.</p>
            </div>
            {workflows.filter(w => w.isPublic).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.filter(w => w.isPublic).map(workflow => (
                  <WorkflowCard 
                    key={workflow.id} 
                    workflow={workflow} 
                    onClick={() => handleSelectWorkflow(workflow)}
                    showStatus={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-aec-card/20 rounded-2xl border border-aec-border border-dashed">
                <BookCheck className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-300">You haven't published anything yet</h3>
                <p className="text-slate-500 max-w-md mx-auto mt-2">
                  Share your expertise! Mark your best workflows as "Public" to see them here and help others in the community.
                </p>
              </div>
            )}
          </div>
        )}

        {activeView === 'settings' && (
          <div className="max-w-4xl mx-auto">
            <SettingsView workflows={workflows} />
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
              className={cn(
                "glass-panel w-full bg-aec-bg overflow-hidden shadow-2xl transition-all duration-300",
                activeModalTab === 'plan' ? "max-w-4xl" : "max-w-2xl"
              )}
            >
              <div className="p-6 border-b border-aec-border flex justify-between items-center bg-aec-card/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-aec-accent/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-aec-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100">{selectedWorkflow.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-aec-border mr-4">
                    <button 
                      onClick={() => setActiveModalTab('details')}
                      className={cn(
                        "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                        activeModalTab === 'details' ? "bg-aec-accent text-white" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      Details
                    </button>
                    <button 
                      onClick={() => setActiveModalTab('plan')}
                      className={cn(
                        "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                        activeModalTab === 'plan' ? "bg-aec-accent text-white" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      Automation Plan
                    </button>
                    {(activeView === 'community' || activeView === 'published') && selectedWorkflow.isPublic && (
                      <button 
                        onClick={() => setActiveModalTab('community')}
                        className={cn(
                          "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                          activeModalTab === 'community' ? "bg-aec-accent text-white" : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        Community
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedWorkflow(null);
                      setActiveModalTab('details');
                    }}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
              
              <div className={cn(
                "max-h-[80vh] flex flex-col",
                (activeModalTab === 'details' || activeModalTab === 'community') ? "p-8 overflow-y-auto space-y-8" : "p-0 overflow-hidden"
              )}>
                {activeModalTab === 'details' ? (
                  <>
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
                      {selectedWorkflow.userId === auth.currentUser?.uid ? (
                        <>
                          <button 
                            onClick={() => {
                              if (selectedWorkflow) {
                                setAutomationTrigger({
                                  workflow: selectedWorkflow,
                                  timestamp: Date.now()
                                });
                                setActiveModalTab('plan');
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
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-aec-border mb-3"
                          >
                            <CheckCircle2 className="w-5 h-5 text-aec-accent" />
                            {isUpdatingStatus ? 'Updating...' : 'Mark as Completed'}
                          </button>
                          <button 
                            onClick={() => toggleWorkflowVisibility(selectedWorkflow)}
                            disabled={isUpdatingStatus}
                            className={cn(
                              "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border mb-3",
                              selectedWorkflow.isPublic 
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" 
                                : "bg-slate-800 border-aec-border text-slate-200 hover:bg-slate-700"
                            )}
                          >
                            {selectedWorkflow.isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                            {isUpdatingStatus ? 'Updating...' : selectedWorkflow.isPublic ? 'Make Private' : 'Share with Community'}
                          </button>
                          <button 
                            onClick={() => setWorkflowToDelete(selectedWorkflow.id)}
                            disabled={isUpdatingStatus}
                            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-red-500/20"
                          >
                            <Trash2 className="w-5 h-5" />
                            Delete Workflow
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={async () => {
                            if (!auth.currentUser) return;
                            setIsUpdatingStatus(true);
                            try {
                              const { id, ...workflowData } = selectedWorkflow;
                              await addDoc(collection(db, 'workflows'), {
                                ...workflowData,
                                userId: auth.currentUser.uid,
                                createdAt: new Date().toISOString(),
                                status: 'Pending',
                                isPublic: false // Keep it private in their own dashboard
                              });
                              alert("✅ Workflow added to your dashboard!");
                              setSelectedWorkflow(null);
                            } catch (error) {
                              console.error("Error cloning workflow:", error);
                            } finally {
                              setIsUpdatingStatus(false);
                            }
                          }}
                          disabled={isUpdatingStatus}
                          className="w-full py-3 bg-aec-accent hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-aec-accent/20 flex items-center justify-center gap-2"
                        >
                          <PlusCircle className="w-5 h-5" />
                          {isUpdatingStatus ? 'Adding...' : 'Add to my Dashboard'}
                        </button>
                      )}
                    </div>
                  </>
                ) : activeModalTab === 'community' ? (
                  <div className="space-y-8">
                    {/* Contributions Section */}
                    <section>
                      <h4 className="text-xs uppercase font-bold text-slate-500 mb-4 tracking-widest flex items-center gap-2">
                        <BookCheck className="w-4 h-4" />
                        Community Contributions & Proof
                      </h4>
                      <div className="space-y-4 mb-6">
                        {selectedWorkflow.contributions && selectedWorkflow.contributions.length > 0 ? (
                          selectedWorkflow.contributions.map(contribution => (
                            <div key={contribution.id} className="p-4 rounded-xl bg-slate-900 border border-aec-border">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-200">{contribution.userName}</span>
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded uppercase font-bold",
                                  contribution.type === 'proof' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                                )}>
                                  {contribution.type}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400">{contribution.text}</p>
                              <div className="text-[10px] text-slate-600 mt-2">
                                {new Date(contribution.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-600 italic">No contributions yet. Be the first to add a note or proof!</p>
                        )}
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/50 border border-aec-border border-dashed">
                        <div className="flex gap-2 mb-3">
                          <button 
                            onClick={() => setNoteType('note')}
                            className={cn(
                              "px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                              noteType === 'note' ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-500"
                            )}
                          >
                            Add Note
                          </button>
                          <button 
                            onClick={() => setNoteType('proof')}
                            className={cn(
                              "px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                              noteType === 'proof' ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500"
                            )}
                          >
                            Add Proof
                          </button>
                        </div>
                        <textarea 
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder={noteType === 'note' ? "Add a technical note or tip..." : "Describe your implementation proof..."}
                          className="w-full bg-slate-900 border border-aec-border rounded-lg p-3 text-sm text-slate-300 focus:ring-1 focus:ring-aec-accent outline-none min-h-[80px]"
                        />
                        <button 
                          onClick={handleAddContribution}
                          disabled={isSubmittingFeedback || !noteText.trim()}
                          className="mt-3 w-full py-2 bg-aec-accent hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {isSubmittingFeedback ? 'Submitting...' : 'Submit Contribution'}
                        </button>
                      </div>
                    </section>

                    {/* Feedback Section */}
                    <section>
                      <h4 className="text-xs uppercase font-bold text-slate-500 mb-4 tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Feedback & Discussion
                      </h4>
                      <div className="space-y-4 mb-6">
                        {selectedWorkflow.comments && selectedWorkflow.comments.length > 0 ? (
                          selectedWorkflow.comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0 flex items-center justify-center overflow-hidden border border-aec-border">
                                {comment.userPhoto ? (
                                  <img src={comment.userPhoto} alt={comment.userName} className="w-full h-full object-cover" />
                                ) : (
                                  <UserIcon className="w-4 h-4 text-slate-500" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-slate-200">{comment.userName}</span>
                                  <span className="text-[10px] text-slate-600">{new Date(comment.timestamp).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-slate-400">{comment.text}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-600 italic">No feedback yet.</p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <input 
                          type="text"
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-aec-accent outline-none"
                        />
                        <button 
                          onClick={handleAddComment}
                          disabled={isSubmittingFeedback || !commentText.trim()}
                          className="px-4 py-2 bg-aec-accent hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                        >
                          Post
                        </button>
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="h-[700px]">
                    <AIAdvisor 
                      externalTrigger={selectedWorkflow ? automationTrigger : null} 
                      embedded={true}
                    />
                  </div>
                )}
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Title</label>
                    <span className={cn(
                      "text-[10px] font-mono",
                      newWorkflow.title.length < 5 ? "text-red-400" : "text-emerald-400"
                    )}>
                      {newWorkflow.title.length}/50
                    </span>
                  </div>
                  <input 
                    required
                    type="text"
                    maxLength={50}
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
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Visibility</label>
                  <button
                    type="button"
                    onClick={() => setNewWorkflow({...newWorkflow, isPublic: !newWorkflow.isPublic})}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2 rounded-lg border text-sm transition-all",
                      newWorkflow.isPublic 
                        ? "bg-aec-accent/10 border-aec-accent text-aec-accent" 
                        : "bg-slate-900 border-aec-border text-slate-400"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {newWorkflow.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {newWorkflow.isPublic ? 'Public' : 'Private'}
                    </div>
                    <div className={cn(
                      "w-8 h-4 rounded-full relative transition-colors",
                      newWorkflow.isPublic ? "bg-aec-accent" : "bg-slate-700"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                        newWorkflow.isPublic ? "right-0.5" : "left-0.5"
                      )} />
                    </div>
                  </button>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Description</label>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] font-mono",
                        newWorkflow.description.length < 20 ? "text-red-400" : "text-emerald-400"
                      )}>
                        {newWorkflow.description.length}/500
                      </span>
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
                  </div>
                  <textarea 
                    required
                    maxLength={500}
                    value={newWorkflow.description}
                    onChange={e => setNewWorkflow({...newWorkflow, description: e.target.value})}
                    className="w-full bg-slate-900 border border-aec-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-aec-accent outline-none h-20 resize-none"
                    placeholder="Describe the workflow in detail..."
                  />
                </div>

                <div className="p-3 bg-aec-accent/5 border border-aec-accent/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-aec-accent shrink-0 mt-0.5" />
                    <div className="text-[10px] text-slate-400 leading-relaxed">
                      <span className="text-aec-accent font-bold uppercase">Quality Check:</span> Ensure your workflow is specific to AEC. Avoid generic titles. High-quality workflows are more likely to be cloned by the community.
                    </div>
                  </div>
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
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {workflowToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-sm bg-aec-bg p-6 border-red-500/20"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 text-center mb-2">Delete Workflow?</h3>
              <p className="text-sm text-slate-400 text-center mb-6">
                This action cannot be undone. All associated data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setWorkflowToDelete(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteWorkflow(workflowToDelete)}
                  disabled={isUpdatingStatus}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
