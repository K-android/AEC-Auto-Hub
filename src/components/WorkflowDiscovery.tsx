import React, { useState } from 'react';
import { Workflow } from '../types';
import WorkflowCard from './WorkflowCard';
import { 
  Search, 
  Filter, 
  Plus, 
  BarChart
} from 'lucide-react';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from '../lib/utils';

interface Props {
  workflows: Workflow[];
  isLoading: boolean;
  onSelectWorkflow: (w: Workflow) => void;
  onOpenAddModal: () => void;
  onSeedWorkflows: () => void;
}

export default function WorkflowDiscovery({ workflows, isLoading, onSelectWorkflow, onOpenAddModal, onSeedWorkflows }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Architecture', 'BIM', 'Structural', 'MEP', 'Construction'];

  const filteredWorkflows = workflows.filter(w => {
    if (w.status === 'Completed') return false;
    const matchesCategory = selectedCategory === 'All' || w.category === selectedCategory;
    const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         w.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const chartData = workflows.map(w => ({
    name: w.title.length > 15 ? w.title.substring(0, 15) + '...' : w.title,
    potential: w.automationPotential,
    fullTitle: w.title
  })).sort((a, b) => b.potential - a.potential);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Automation Discovery</h2>
          <p className="text-slate-400 text-sm">Explore and analyze AEC workflows ready for optimization.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-aec-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-aec-accent w-full md:w-64"
            />
          </div>
          <button 
            onClick={onOpenAddModal}
            className="bg-aec-accent hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors shadow-lg shadow-aec-accent/20"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                  selectedCategory === cat 
                    ? "bg-aec-accent border-aec-accent text-white" 
                    : "bg-slate-800 border-aec-border text-slate-400 hover:border-slate-600"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Workflow Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-panel p-5 h-48 animate-pulse bg-slate-800/50" />
              ))
            ) : filteredWorkflows.length > 0 ? (
              filteredWorkflows.map(workflow => (
                <WorkflowCard 
                  key={workflow.id} 
                  workflow={workflow} 
                  onClick={onSelectWorkflow}
                />
              ))
            ) : workflows.length === 0 ? (
              <div className="col-span-full py-20 text-center glass-panel bg-aec-card/30 border-dashed border-2 border-aec-border">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-slate-300 font-medium">No workflows found</p>
                    <p className="text-xs text-slate-500 mt-1">Start by adding your own or explore sample AEC workflows.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={onOpenAddModal}
                      className="w-full py-2 bg-aec-accent text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors"
                    >
                      Add New Workflow
                    </button>
                    <button 
                      onClick={onSeedWorkflows}
                      className="w-full py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors border border-aec-border"
                    >
                      Explore Sample Workflows
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-span-full py-20 text-center glass-panel bg-aec-card/30 border-dashed border-2 border-aec-border">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <Filter className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-slate-300 font-medium">No matches found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }}
                    className="w-full py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors border border-aec-border"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* ROI Chart */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                <BarChart className="w-4 h-4 text-aec-accent" />
                Automation Potential Ranking
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Bar dataKey="potential" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.potential > 85 ? '#10b981' : '#334155'} />
                    ))}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 glass-panel bg-aec-accent/5 border-aec-accent/20">
            <h4 className="text-sm font-bold text-aec-accent mb-2">Quick Insight</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Based on your current list, <span className="text-slate-200 font-bold">BIM Management</span> tasks have the highest automation potential. 
              Focusing on these could save up to 15 hours per project week.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
