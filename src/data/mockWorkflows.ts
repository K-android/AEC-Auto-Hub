import { Workflow } from '../types';

export const mockWorkflows: Workflow[] = [
  {
    id: '1',
    title: 'Sheet Creation & Naming',
    category: 'BIM',
    description: 'Manually creating hundreds of sheets in Revit and naming them according to project standards.',
    painPoint: 'Extremely repetitive, prone to typos, takes hours for large projects.',
    automationPotential: 95,
    complexity: 'Low',
    tools: ['Revit API', 'Dynamo', 'PyRevit'],
    roi: 'High',
    priority: 'P1',
    estimatedEffort: '1 week',
    successMetrics: '90% reduction in sheet setup time',
    userId: 'mock-user'
  },
  {
    id: '2',
    title: 'Clash Detection Reporting',
    category: 'BIM',
    description: 'Exporting Navisworks clash reports and assigning them to specific trade contractors.',
    painPoint: 'Navisworks reports are static; tracking resolution status is manual.',
    automationPotential: 80,
    complexity: 'Medium',
    tools: ['Navisworks API', 'BIM Track', 'Power BI'],
    roi: 'Medium',
    priority: 'P2',
    estimatedEffort: '3 weeks',
    successMetrics: 'Faster clash resolution tracking',
    userId: 'mock-user'
  },
  {
    id: '3',
    title: 'Room Data Sheet Generation',
    category: 'Architecture',
    description: 'Extracting room parameters (finishes, equipment) into formatted PDF/Excel sheets.',
    painPoint: 'Data sync between Revit and Excel is often broken.',
    automationPotential: 85,
    complexity: 'Medium',
    tools: ['Dynamo', 'Rhino.Inside.Revit', 'Ideate BIMLink'],
    roi: 'High',
    priority: 'P1',
    estimatedEffort: '2 weeks',
    successMetrics: '100% data consistency',
    userId: 'mock-user'
  },
  {
    id: '4',
    title: 'COBie Data Validation',
    category: 'BIM',
    description: 'Checking if all required parameters for Facility Management are filled correctly.',
    painPoint: 'Manual checking is impossible for thousands of elements.',
    automationPotential: 90,
    complexity: 'High',
    tools: ['Solibri', 'Revit Model Checker', 'Python'],
    roi: 'Very High',
    priority: 'P0',
    estimatedEffort: '1 month',
    successMetrics: 'Zero COBie compliance errors',
    userId: 'mock-user'
  },
  {
    id: '5',
    title: 'Daily Site Progress Photos',
    category: 'Construction',
    description: 'Organizing and tagging site photos by location and date.',
    painPoint: 'Photos end up in a messy folder; hard to find specific issues later.',
    automationPotential: 70,
    complexity: 'Medium',
    tools: ['OpenSpace', 'HoloBuilder', 'AI Vision'],
    roi: 'Medium',
    priority: 'P2',
    estimatedEffort: '2 weeks',
    successMetrics: 'Searchable photo database',
    userId: 'mock-user'
  }
];
