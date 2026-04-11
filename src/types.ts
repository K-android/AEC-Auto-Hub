export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  timestamp: string;
}

export interface Contribution {
  id: string;
  userId: string;
  userName: string;
  text: string;
  type: 'note' | 'proof';
  timestamp: string;
  url?: string;
}

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
  createdAt?: string;
  isAIDiscovery?: boolean;
  status?: 'Pending' | 'In Progress' | 'Completed';
  isPublic?: boolean;
  proofUrl?: string;
  proofType?: 'image' | 'video';
  comments?: Comment[];
  contributions?: Contribution[];
}

export interface AutomationIdea {
  id: string;
  workflowId: string;
  suggestion: string;
  techStack: string[];
  estimatedHoursSaved: number;
}
