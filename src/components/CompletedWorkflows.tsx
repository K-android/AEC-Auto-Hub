import React, { useState } from 'react';
import { Workflow } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ImageIcon, Video, ExternalLink, Plus, Trash2, HardHat, Building2, Cpu, Zap, RotateCcw, AlertCircle } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

interface Props {
  workflows: Workflow[];
}

export default function CompletedWorkflows({ workflows }: Props) {
  const completedWorkflows = workflows.filter(w => w.status === 'Completed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofType, setProofType] = useState<'image' | 'video'>('image');
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddProof = async (id: string) => {
    if (!proofUrl.trim()) return;
    
    try {
      const workflowRef = doc(db, 'workflows', id);
      await updateDoc(workflowRef, {
        proofUrl: proofUrl.trim(),
        proofType: proofType
      });
      setEditingId(null);
      setProofUrl('');
    } catch (error) {
      console.error("Error adding proof:", error);
    }
  };

  const removeProof = async (id: string) => {
    try {
      const workflowRef = doc(db, 'workflows', id);
      await updateDoc(workflowRef, {
        proofUrl: null,
        proofType: null
      });
    } catch (error) {
      console.error("Error removing proof:", error);
    }
  };

  const revertToPending = async (id: string) => {
    try {
      const workflowRef = doc(db, 'workflows', id);
      await updateDoc(workflowRef, {
        status: 'Pending'
      });
    } catch (error) {
      console.error("Error reverting workflow:", error);
    }
  };

  const deleteWorkflow = async (id: string) => {
    setIsDeleting(true);
    try {
      const workflowRef = doc(db, 'workflows', id);
      await deleteDoc(workflowRef);
      setWorkflowToDelete(null);
    } catch (error) {
      console.error("Error deleting workflow:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {completedWorkflows.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-panel">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-slate-700 opacity-20" />
            <h3 className="text-xl font-bold text-slate-400">No completed workflows yet</h3>
            <p className="text-slate-500 mt-2">Mark a workflow as completed to see it here.</p>
          </div>
        ) : (
          completedWorkflows.map((workflow) => (
            <motion.div
              key={workflow.id}
              layoutId={workflow.id}
              className="glass-panel overflow-hidden flex flex-col group"
            >
              {/* Proof Preview */}
              <div className="aspect-video bg-slate-900 relative overflow-hidden group-hover:bg-slate-800 transition-colors">
                {workflow.proofUrl ? (
                  <>
                    {workflow.proofType === 'image' ? (
                      <img 
                        src={workflow.proofUrl} 
                        alt={workflow.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-aec-accent/5">
                        <Video className="w-12 h-12 text-aec-accent opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                           <a 
                            href={workflow.proofUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-3 bg-aec-accent rounded-full text-white shadow-xl"
                          >
                            <ExternalLink className="w-6 h-6" />
                          </a>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={() => removeProof(workflow.id)}
                      className="absolute top-2 right-2 p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    {editingId === workflow.id ? (
                      <div className="w-full space-y-3">
                        <div className="flex gap-2 p-1 bg-slate-800 rounded-lg">
                          <button 
                            onClick={() => setProofType('image')}
                            className={cn(
                              "flex-1 py-1 text-xs rounded-md transition-all",
                              proofType === 'image' ? "bg-aec-accent text-white" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            Image
                          </button>
                          <button 
                            onClick={() => setProofType('video')}
                            className={cn(
                              "flex-1 py-1 text-xs rounded-md transition-all",
                              proofType === 'video' ? "bg-aec-accent text-white" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            Video
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Paste image/video URL..."
                          value={proofUrl}
                          onChange={(e) => setProofUrl(e.target.value)}
                          className="w-full bg-slate-950 border border-aec-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-aec-accent"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingId(null)}
                            className="flex-1 py-2 text-xs text-slate-400 hover:text-slate-200"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleAddProof(workflow.id)}
                            className="flex-1 py-2 text-xs bg-aec-accent text-white rounded-lg font-bold"
                          >
                            Save Proof
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-slate-700 mb-3" />
                        <p className="text-xs text-slate-500 mb-4">No proof added yet</p>
                        <button 
                          onClick={() => setEditingId(workflow.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add Proof
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-aec-accent bg-aec-accent/10 px-2 py-0.5 rounded">
                    {workflow.category}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Completed</span>
                  </div>
                </div>
                
                <h4 className="font-bold text-slate-100 mb-2 group-hover:text-aec-accent transition-colors">
                  {workflow.title}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                  {workflow.description}
                </p>

                <div className="mt-auto pt-4 border-t border-aec-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {workflow.tools.slice(0, 3).map((tool, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border border-aec-bg flex items-center justify-center text-[8px] font-bold text-slate-400">
                          {tool[0]}
                        </div>
                      ))}
                      {workflow.tools.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-aec-bg flex items-center justify-center text-[8px] font-bold text-slate-400">
                          +{workflow.tools.length - 3}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => revertToPending(workflow.id)}
                      className="p-1.5 bg-slate-800 hover:bg-aec-accent/20 hover:text-aec-accent text-slate-500 rounded-md transition-all group/revert relative"
                      title="Revert to Pending"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[10px] text-white rounded opacity-0 group-hover/revert:opacity-100 pointer-events-none whitespace-nowrap border border-aec-border">
                        Revert to Pending
                      </span>
                    </button>
                    <button 
                      onClick={() => setWorkflowToDelete(workflow.id)}
                      className="p-1.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-500 text-slate-500 rounded-md transition-all group/delete relative"
                      title="Delete Workflow"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[10px] text-white rounded opacity-0 group-hover/delete:opacity-100 pointer-events-none whitespace-nowrap border border-aec-border">
                        Delete Workflow
                      </span>
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ROI: <span className="text-aec-accent">{workflow.roi}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

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
                  onClick={() => deleteWorkflow(workflowToDelete)}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
