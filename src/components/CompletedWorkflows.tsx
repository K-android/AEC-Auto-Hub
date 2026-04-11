import React, { useState, useEffect } from 'react';
import { Workflow } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ImageIcon, Video, ExternalLink, Plus, Trash2, HardHat, Building2, Cpu, Zap, RotateCcw, AlertCircle, Globe, Lock, X, FileCode, Link as LinkIcon, FileJson, Loader2, Maximize2 } from 'lucide-react';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [expandedProofId, setExpandedProofId] = useState<string | null>(null);
  const [newResource, setNewResource] = useState({ name: '', url: '', type: 'script' as any });
  const [isAddingResource, setIsAddingResource] = useState<string | null>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!editingId) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) handleFileSelect(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingId]);

  const handleAddProof = async (id: string) => {
    const finalProofUrl = proofPreview || proofUrl.trim();
    if (!finalProofUrl) return;
    
    setIsSaving(true);
    try {
      const workflowRef = doc(db, 'workflows', id);
      await updateDoc(workflowRef, {
        proofUrl: finalProofUrl,
        proofType: proofType,
        updatedAt: new Date().toISOString()
      });
      
      setSaveSuccess(id);
      setTimeout(() => setSaveSuccess(null), 3000);
      
      setEditingId(null);
      setProofUrl('');
      setProofPreview(null);
    } catch (error) {
      console.error("Error adding proof:", error);
      alert("Failed to save proof. The image might still be too large for the database. Try a smaller screenshot or a URL.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddResource = async (workflowId: string) => {
    if (!newResource.name.trim() || !newResource.url.trim()) return;

    try {
      const workflowRef = doc(db, 'workflows', workflowId);
      const resource = {
        id: Date.now().toString(),
        name: newResource.name.trim(),
        url: newResource.url.trim(),
        type: newResource.type
      };

      await updateDoc(workflowRef, {
        resources: arrayUnion(resource)
      });

      setNewResource({ name: '', url: '', type: 'script' });
      setIsAddingResource(null);
    } catch (error) {
      console.error("Error adding resource:", error);
    }
  };

  const removeResource = async (workflowId: string, resource: any) => {
    try {
      const workflowRef = doc(db, 'workflows', workflowId);
      await updateDoc(workflowRef, {
        resources: arrayRemove(resource)
      });
    } catch (error) {
      console.error("Error removing resource:", error);
    }
  };

  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = dataUrl;
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.includes('gif')) {
      alert("Please upload an image or GIF.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target?.result as string;
      if (file.type.includes('gif')) {
        if (file.size > 800000) {
          alert("GIF too large. Please keep it under 800KB.");
          return;
        }
        setProofPreview(rawDataUrl);
      } else {
        const compressedDataUrl = await compressImage(rawDataUrl);
        setProofPreview(compressedDataUrl);
      }
      setProofType('image');
    };
    reader.readAsDataURL(file);
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

  const toggleVisibility = async (id: string, currentStatus: boolean) => {
    try {
      const workflowRef = doc(db, 'workflows', id);
      await updateDoc(workflowRef, {
        isPublic: !currentStatus
      });
    } catch (error) {
      console.error("Error toggling visibility:", error);
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
    <div className="space-y-8 pb-20">
      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={zoomedImage} 
                alt="Zoomed Proof" 
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute -top-4 -right-4 p-3 bg-white text-slate-950 rounded-full shadow-2xl hover:scale-110 transition-transform"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-aec-accent" />
            Automation Showcase
          </h2>
          <p className="text-slate-400 mt-1">A professional portfolio of your successful AEC automations.</p>
        </div>
        <div className="flex items-center gap-4 p-1 bg-slate-900/50 rounded-xl border border-aec-border">
          <div className="px-4 py-2 text-sm font-bold text-slate-300">
            {completedWorkflows.length} Proven Solutions
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              <div className={cn(
                "bg-slate-900 relative overflow-hidden group-hover:bg-slate-800 transition-all duration-500",
                editingId === workflow.id ? "min-h-[550px]" : 
                expandedProofId === workflow.id ? "min-h-[500px]" : "aspect-video"
              )}>
                {workflow.proofUrl ? (
                  <>
                    {workflow.proofType === 'image' ? (
                      <div 
                        className="relative w-full h-full cursor-pointer group/proof" 
                        onClick={() => setZoomedImage(workflow.proofUrl || null)}
                      >
                        <img 
                          src={workflow.proofUrl} 
                          alt={workflow.title} 
                          className={cn(
                            "w-full h-full transition-all duration-700",
                            expandedProofId === workflow.id ? "object-contain" : "object-cover group-hover:scale-110"
                          )}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/proof:opacity-100 transition-opacity">
                          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                            <Maximize2 className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-aec-accent/5">
                        <Video className="w-12 h-12 text-aec-accent opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                           <a 
                            href={workflow.proofUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-4 bg-aec-accent rounded-full text-white shadow-2xl hover:scale-110 transition-transform"
                          >
                            <ExternalLink className="w-7 h-7" />
                          </a>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                      {workflow.proofType === 'image' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedProofId(expandedProofId === workflow.id ? null : workflow.id);
                          }}
                          className="p-2 bg-slate-900/80 hover:bg-aec-accent text-white rounded-xl transition-all backdrop-blur-md border border-white/10"
                          title={expandedProofId === workflow.id ? "Collapse" : "Expand View"}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProof(workflow.id);
                        }}
                        className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all backdrop-blur-md border border-red-500/20"
                        title="Remove Proof"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 to-aec-bg">
                    {editingId === workflow.id ? (
                      <div 
                        className={cn(
                          "w-full space-y-4 animate-in fade-in zoom-in-95 duration-300 p-2 rounded-xl transition-all",
                          isDragging ? "bg-aec-accent/10 border-2 border-dashed border-aec-accent" : ""
                        )}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const file = e.dataTransfer.files[0];
                          if (file) handleFileSelect(file);
                        }}
                      >
                        <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-aec-border">
                          <button 
                            onClick={() => {
                              setProofType('image');
                              setProofUrl('');
                            }}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                              proofType === 'image' ? "bg-aec-accent text-white shadow-lg shadow-aec-accent/20" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            Image
                          </button>
                          <button 
                            onClick={() => {
                              setProofType('video');
                              setProofPreview(null);
                            }}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                              proofType === 'video' ? "bg-aec-accent text-white shadow-lg shadow-aec-accent/20" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            Video
                          </button>
                        </div>

                        {proofType === 'image' && (
                          <div 
                            className={cn(
                              "relative border-2 border-dashed border-aec-border rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden bg-slate-900/50",
                              proofPreview ? "h-[180px] w-full" : "h-[200px] w-full cursor-pointer hover:bg-aec-accent/5 hover:border-aec-accent/50"
                            )}
                            onClick={() => !proofPreview && document.getElementById(`proof-upload-${workflow.id}`)?.click()}
                          >
                            {proofPreview ? (
                              <>
                                <img src={proofPreview} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2 flex gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setZoomedImage(proofPreview);
                                    }}
                                    className="p-1.5 bg-slate-900/80 text-white rounded-full shadow-lg hover:bg-slate-800 transition-colors"
                                    title="Zoom"
                                  >
                                    <Maximize2 className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProofPreview(null);
                                    }}
                                    className="p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    title="Remove"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                                  <ImageIcon className="w-6 h-6 text-aec-accent" />
                                </div>
                                <div className="text-sm text-slate-300 font-bold">Drop Proof Image</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">or click to browse</div>
                                <input 
                                  id={`proof-upload-${workflow.id}`}
                                  type="file"
                                  className="hidden"
                                  accept="image/*,.gif"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file);
                                  }}
                                />
                              </>
                            )}
                          </div>
                        )}

                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder={proofType === 'image' ? "Or paste image URL..." : "Paste video URL (YouTube, Vimeo)..."}
                            value={proofUrl}
                            onChange={(e) => {
                              setProofUrl(e.target.value);
                              if (proofType === 'image') setProofPreview(null);
                            }}
                            className="w-full bg-slate-950/50 border border-aec-border rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-aec-accent/50 transition-all"
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button 
                            onClick={() => {
                              setEditingId(null);
                              setProofUrl('');
                              setProofPreview(null);
                            }}
                            className="flex-1 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-200 transition-colors bg-slate-900/50 rounded-xl border border-aec-border hover:border-slate-700"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleAddProof(workflow.id)}
                            disabled={isSaving || (!proofUrl.trim() && !proofPreview)}
                            className={cn(
                              "flex-1 py-3 text-sm bg-aec-accent text-white rounded-xl font-bold shadow-lg shadow-aec-accent/20 hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                              proofPreview && !isSaving ? "animate-pulse ring-2 ring-aec-accent/50" : ""
                            )}
                          >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSaving ? 'Saving...' : 'Confirm & Save Proof'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-aec-accent/5 rounded-2xl flex items-center justify-center mb-4 border border-aec-accent/10">
                          <ImageIcon className="w-8 h-8 text-aec-accent/40" />
                        </div>
                        <h5 className="text-sm font-bold text-slate-300 mb-1">Visual Proof Required</h5>
                        <p className="text-xs text-slate-500 mb-6 max-w-[200px]">Add an image or video to showcase this automation in your portfolio.</p>
                        <button 
                          onClick={() => setEditingId(workflow.id)}
                          className="flex items-center gap-2 px-6 py-2.5 bg-aec-accent text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-aec-accent/20"
                        >
                          <Plus className="w-4 h-4" />
                          Add Proof
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col bg-gradient-to-b from-aec-card/50 to-aec-bg relative">
                {saveSuccess === workflow.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 backdrop-blur-md rounded-2xl border border-aec-accent/30"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-aec-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-aec-accent" />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-1">Proof Saved!</h4>
                      <p className="text-xs text-slate-400">Your automation is now verified.</p>
                    </div>
                  </motion.div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-aec-accent/10 text-aec-accent border border-aec-accent/20">
                    {workflow.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Proven Solution</span>
                  </div>
                </div>
                
                <h4 className="text-lg font-bold text-slate-100 mb-3 group-hover:text-aec-accent transition-colors leading-tight">
                  {workflow.title}
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 mb-6">
                  {workflow.description}
                </p>

                {/* Resources Section */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resources & Scripts</h5>
                    <button 
                      onClick={() => setIsAddingResource(isAddingResource === workflow.id ? null : workflow.id)}
                      className="p-1 hover:bg-aec-accent/10 text-aec-accent rounded-md transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {isAddingResource === workflow.id && (
                    <div className="p-3 rounded-lg bg-slate-900 border border-aec-accent/20 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <input 
                        type="text" 
                        placeholder="Resource Name (e.g. Dynamo Script)"
                        value={newResource.name}
                        onChange={e => setNewResource({...newResource, name: e.target.value})}
                        className="w-full bg-slate-950 border border-aec-border rounded-md px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-aec-accent"
                      />
                      <input 
                        type="text" 
                        placeholder="Drive/GitHub URL"
                        value={newResource.url}
                        onChange={e => setNewResource({...newResource, url: e.target.value})}
                        className="w-full bg-slate-950 border border-aec-border rounded-md px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-aec-accent"
                      />
                      <div className="flex gap-2">
                        <select 
                          value={newResource.type}
                          onChange={e => setNewResource({...newResource, type: e.target.value as any})}
                          className="flex-1 bg-slate-950 border border-aec-border rounded-md px-2 py-1 text-[10px] text-slate-400 outline-none"
                        >
                          <option value="dynamo">Dynamo (.dyn)</option>
                          <option value="python">Python (.py)</option>
                          <option value="script">Script/Code</option>
                          <option value="other">Other Link</option>
                        </select>
                        <button 
                          onClick={() => handleAddResource(workflow.id)}
                          className="px-3 py-1 bg-aec-accent text-white rounded-md text-[10px] font-bold"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {workflow.resources?.map(resource => (
                      <div key={resource.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-aec-border group/res">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {resource.type === 'dynamo' ? <FileJson className="w-3.5 h-3.5 text-blue-400" /> : 
                           resource.type === 'python' ? <FileCode className="w-3.5 h-3.5 text-emerald-400" /> : 
                           <LinkIcon className="w-3.5 h-3.5 text-slate-500" />}
                          <span className="text-[11px] text-slate-300 truncate font-medium">{resource.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/res:opacity-100 transition-opacity">
                          <a 
                            href={resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-aec-accent/20 text-aec-accent rounded"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button 
                            onClick={() => removeResource(workflow.id, resource)}
                            className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!workflow.resources || workflow.resources.length === 0) && !isAddingResource && (
                      <p className="text-[10px] text-slate-600 italic">No resources attached yet.</p>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-aec-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 mr-2">
                      {workflow.tools.slice(0, 3).map((tool, i) => (
                        <div key={i} className="w-8 h-8 rounded-xl bg-slate-800 border-2 border-aec-bg flex items-center justify-center text-[10px] font-bold text-slate-300 shadow-sm" title={tool}>
                          {tool[0]}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => revertToPending(workflow.id)}
                        className="p-2 bg-slate-800/50 hover:bg-aec-accent/20 hover:text-aec-accent text-slate-500 rounded-xl transition-all group/revert relative border border-aec-border/50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-slate-900 text-[10px] text-white rounded-lg opacity-0 group-hover/revert:opacity-100 pointer-events-none whitespace-nowrap border border-aec-border shadow-2xl z-10">
                          Revert to In-Progress
                        </span>
                      </button>
                      <button 
                        onClick={() => toggleVisibility(workflow.id, !!workflow.isPublic)}
                        className={cn(
                          "p-2 rounded-xl transition-all group/share relative border",
                          workflow.isPublic 
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" 
                            : "bg-slate-800/50 border-aec-border/50 text-slate-500 hover:bg-slate-700"
                        )}
                      >
                        {workflow.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-slate-900 text-[10px] text-white rounded-lg opacity-0 group-hover/share:opacity-100 pointer-events-none whitespace-nowrap border border-aec-border shadow-2xl z-10">
                          {workflow.isPublic ? 'Make Private' : 'Publish to Showcase'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">ROI Yield</span>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-aec-accent" />
                      <span className="text-sm font-bold text-slate-100">{workflow.roi}</span>
                    </div>
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
