export interface Workflow {
  id: string;
  title: string;
  category: 'Architecture' | 'BIM' | 'Structural' | 'MEP' | 'Construction';
  description: string;
  painPoint: string;
  automationPotential: number; // 0-100
  complexity: 'Low' | 'Medium' | 'High';
  tools: string[];
  roi: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  estimatedEffort: string;
  successMetrics: string;
  userId: string;
}

export interface AutomationIdea {
  id: string;
  workflowId: string;
  suggestion: string;
  techStack: string[];
  estimatedHoursSaved: number;
}
