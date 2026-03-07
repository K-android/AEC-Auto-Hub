import React from 'react';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Workflow } from '../types';
import { TrendingUp, Users, Zap, Clock } from 'lucide-react';

interface Props {
  workflows: Workflow[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
    name: w.title.substring(0, 10) + '...',
    potential: w.automationPotential,
    roiValue: w.roi === 'Very High' ? 100 : w.roi === 'High' ? 75 : w.roi === 'Medium' ? 50 : 25
  }));

  // Average Stats
  const avgPotential = Math.round(workflows.reduce((acc, w) => acc + w.automationPotential, 0) / workflows.length);
  const highRoiCount = workflows.filter(w => w.roi === 'High' || w.roi === 'Very High').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: workflows.length, icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Avg. Potential', value: `${avgPotential}%`, icon: Zap, color: 'text-aec-accent' },
          { label: 'High ROI Tasks', value: highRoiCount, icon: Users, color: 'text-purple-400' },
          { label: 'Complexity Index', value: 'Medium', icon: Clock, color: 'text-amber-400' },
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
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROI vs Potential Bar Chart */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold text-slate-100 mb-6">ROI vs. Automation Potential</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiPotentialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="potential" name="Potential %" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="roiValue" name="ROI Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                { subject: 'BIM', A: 120, B: 110, fullMark: 150 },
                { subject: 'Arch', A: 98, B: 130, fullMark: 150 },
                { subject: 'Struct', A: 86, B: 130, fullMark: 150 },
                { subject: 'MEP', A: 99, B: 100, fullMark: 150 },
                { subject: 'Const', A: 85, B: 90, fullMark: 150 },
              ]}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar name="Current State" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                <Radar name="Target State" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
