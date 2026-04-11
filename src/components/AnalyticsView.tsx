import React from 'react';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Workflow } from '../types';
import { TrendingUp, Users, Zap, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  workflows: Workflow[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];
const AEC_COLORS = {
  primary: '#10b981', // Emerald (Success/Automation)
  secondary: '#3b82f6', // Blue (Technical/BIM)
  accent: '#f59e0b', // Amber (Warning/Complexity)
  danger: '#ef4444', // Red (Pain Point)
  neutral: '#94a3b8', // Slate (Background/Text)
};

export default function AnalyticsView({ workflows }: Props) {
  // Category Distribution
  const categoryData = workflows.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: curr.category, value: 1 });
    }
    return acc;
  }, []);

  // ROI vs Potential
  const roiPotentialData = workflows.map(w => ({
    name: w.title.length > 15 ? w.title.substring(0, 12) + '...' : w.title,
    fullName: w.title,
    potential: w.automationPotential,
    roiValue: w.roi === 'Very High' ? 100 : w.roi === 'High' ? 80 : w.roi === 'Medium' ? 60 : 40,
    roiLabel: w.roi
  }));

  // Average Stats
  const avgPotential = workflows.length > 0 
    ? Math.round(workflows.reduce((acc, w) => acc + w.automationPotential, 0) / workflows.length)
    : 0;
  const highRoiCount = workflows.filter(w => w.roi === 'High' || w.roi === 'Very High').length;
  const completedCount = workflows.filter(w => w.status === 'Completed').length;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-aec-border p-3 rounded-lg shadow-xl">
          <p className="text-xs font-bold text-slate-100 mb-2">{payload[0].payload.fullName || label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-400">{entry.name}:</span>
              <span className="text-slate-100 font-mono">{entry.value}%</span>
            </div>
          ))}
          {payload[0].payload.roiLabel && (
            <div className="mt-2 pt-2 border-t border-aec-border text-[10px]">
              <span className="text-slate-400">ROI Tier: </span>
              <span className="text-aec-accent font-bold">{payload[0].payload.roiLabel}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: workflows.length, icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Avg. Potential', value: `${avgPotential}%`, icon: Zap, color: 'text-aec-accent' },
          { label: 'High ROI Tasks', value: highRoiCount, icon: Users, color: 'text-purple-400' },
          { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Live</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Distribution */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold text-slate-100 mb-6">Workflow Distribution by Sector</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROI vs Potential Bar Chart */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold text-slate-100 mb-6">ROI vs. Automation Potential</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiPotentialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="rect" />
                <Bar dataKey="potential" name="Automation Potential" fill={AEC_COLORS.primary} radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="roiValue" name="ROI Score" fill={AEC_COLORS.secondary} radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart for Overall Readiness */}
        <div className="glass-panel p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-100 mb-6">Automation Readiness Radar</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                  { subject: 'Architecture', A: 85, B: 100, fullMark: 100 },
                  { subject: 'BIM', A: 95, B: 100, fullMark: 100 },
                  { subject: 'Structural', A: 70, B: 90, fullMark: 100 },
                  { subject: 'MEP', A: 60, B: 85, fullMark: 100 },
                  { subject: 'Construction', A: 75, B: 95, fullMark: 100 },
                ]}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Current Efficiency" dataKey="A" stroke={AEC_COLORS.primary} fill={AEC_COLORS.primary} fillOpacity={0.4} />
                  <Radar name="Potential Efficiency" dataKey="B" stroke={AEC_COLORS.secondary} fill={AEC_COLORS.secondary} fillOpacity={0.2} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
