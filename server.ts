import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const db = new Database("aec_workflows.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    description TEXT,
    painPoint TEXT,
    automationPotential INTEGER,
    complexity TEXT,
    tools TEXT,
    roi TEXT,
    priority TEXT,
    estimatedEffort TEXT,
    successMetrics TEXT,
    createdAt TEXT
  )
`);

const initialWorkflows = [
  {
    id: '1',
    title: 'Sheet Creation & Naming',
    category: 'BIM',
    description: 'Manually creating hundreds of sheets in Revit and naming them according to project standards.',
    painPoint: 'Extremely repetitive, prone to typos, takes hours for large projects.',
    automationPotential: 95,
    complexity: 'Low',
    tools: JSON.stringify(['Revit API', 'Dynamo', 'PyRevit']),
    roi: 'High'
  },
  {
    id: '2',
    title: 'Clash Detection Reporting',
    category: 'BIM',
    description: 'Exporting Navisworks clash reports and assigning them to specific trade contractors.',
    painPoint: 'Navisworks reports are static; tracking resolution status is manual.',
    automationPotential: 80,
    complexity: 'Medium',
    tools: JSON.stringify(['Navisworks API', 'BIM Track', 'Power BI']),
    roi: 'Medium'
  },
  {
    id: '3',
    title: 'Room Data Sheet Generation',
    category: 'Architecture',
    description: 'Extracting room parameters (finishes, equipment) into formatted PDF/Excel sheets.',
    painPoint: 'Data sync between Revit and Excel is often broken.',
    automationPotential: 85,
    complexity: 'Medium',
    tools: JSON.stringify(['Dynamo', 'Rhino.Inside.Revit', 'Ideate BIMLink']),
    roi: 'High'
  },
  {
    id: '4',
    title: 'COBie Data Validation',
    category: 'BIM',
    description: 'Checking if all required parameters for Facility Management are filled correctly.',
    painPoint: 'Manual checking is impossible for thousands of elements.',
    automationPotential: 90,
    complexity: 'High',
    tools: JSON.stringify(['Solibri', 'Revit Model Checker', 'Python']),
    roi: 'Very High'
  },
  {
    id: '5',
    title: 'Daily Site Progress Photos',
    category: 'Construction',
    description: 'Organizing and tagging site photos by location and date.',
    painPoint: 'Photos end up in a messy folder; hard to find specific issues later.',
    automationPotential: 70,
    complexity: 'Medium',
    tools: JSON.stringify(['OpenSpace', 'HoloBuilder', 'AI Vision']),
    roi: 'Medium'
  }
];

const insertWorkflow = db.prepare(`
  INSERT OR IGNORE INTO workflows (id, title, category, description, painPoint, automationPotential, complexity, tools, roi, priority, estimatedEffort, successMetrics, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

initialWorkflows.forEach(w => {
  insertWorkflow.run(
    w.id, 
    w.title, 
    w.category, 
    w.description, 
    w.painPoint, 
    w.automationPotential, 
    w.complexity, 
    w.tools, 
    w.roi, 
    'P1', 
    '2 weeks', 
    'Time saved', 
    new Date().toISOString()
  );
});

async function generateDailyWorkflow() {
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare("SELECT * FROM workflows WHERE createdAt LIKE ?").get(`${today}%`);
  
  if (existing) {
    console.log("Daily workflow already exists for", today);
    return;
  }

  console.log("Generating daily AEC workflow...");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [{ text: `Generate a new, unique AEC (Architecture, Engineering, Construction) automation workflow idea. 
        Return ONLY a JSON object with the following structure:
        {
          "title": "Short Title",
          "category": "Architecture" | "BIM" | "Structural" | "MEP" | "Construction",
          "description": "Detailed description",
          "painPoint": "The specific problem it solves",
          "automationPotential": number (0-100),
          "complexity": "Low" | "Medium" | "High",
          "tools": ["Tool 1", "Tool 2"],
          "roi": "Low" | "Medium" | "High" | "Very High"
        }` }]
      }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse(response.text);
    const id = Math.random().toString(36).substring(7);
    insertWorkflow.run(
      id, 
      data.title, 
      data.category, 
      data.description, 
      data.painPoint, 
      data.automationPotential, 
      data.complexity, 
      JSON.stringify(data.tools), 
      data.roi,
      data.priority || 'P2',
      data.estimatedEffort || '1 month',
      data.successMetrics || 'Efficiency gain',
      new Date().toISOString()
    );
    console.log("New workflow added:", data.title);
  } catch (error) {
    console.error("Failed to generate daily workflow:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/workflows", async (req, res) => {
    // Check if we need to generate a new one for today
    await generateDailyWorkflow();
    
    const workflows = db.prepare("SELECT * FROM workflows ORDER BY createdAt DESC").all();
    const parsedWorkflows = workflows.map(w => ({
      ...w,
      tools: JSON.parse(w.tools as string)
    }));
    res.json(parsedWorkflows);
  });

  app.post("/api/workflows", (req, res) => {
    const { title, category, description, painPoint, automationPotential, complexity, tools, roi, priority, estimatedEffort, successMetrics } = req.body;
    
    if (!title || !category || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = Math.random().toString(36).substring(7);
    try {
      insertWorkflow.run(
        id, 
        title, 
        category, 
        description, 
        painPoint || "", 
        automationPotential || 0, 
        complexity || "Medium", 
        JSON.stringify(tools || []), 
        roi || "Medium", 
        priority || "P2",
        estimatedEffort || "",
        successMetrics || "",
        new Date().toISOString()
      );
      res.status(201).json({ id, title });
    } catch (error) {
      console.error("Failed to add manual workflow:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Secure Server-side Gemini API proxies
  app.post("/api/ai/daily-discovery", async (req, res) => {
    try {
      const aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
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

      if (!response.text) {
        throw new Error("No response text from Gemini");
      }

      const data = JSON.parse(response.text);
      res.json(data);
    } catch (error: any) {
      console.error("Daily Discovery API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate workflow" });
    }
  });

  app.post("/api/ai/describe-workflow", async (req, res) => {
    const { title, category } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    try {
      const aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Generate a professional, contextually relevant description for an AEC (Architecture, Engineering, Construction) workflow. 
        Title: "${title}"
        Category: "${category}"
        
        The description MUST be exactly one or two sentences long. Focus on how this workflow automates processes and improves efficiency in the AEC industry. Do not include any introductory text or formatting.`,
      });

      res.json({ text: response.text?.trim() || "" });
    } catch (error: any) {
      console.error("Describe Workflow API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate description" });
    }
  });

  app.post("/api/ai/advisor", async (req, res) => {
    const { userMessage, isPlanRequest } = req.body;
    if (!userMessage) {
      return res.status(400).json({ error: "userMessage is required" });
    }

    try {
      const aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `You are an expert AEC (Architecture, Engineering, Construction) Automation Consultant. 
            
            ${isPlanRequest ? 'The user is requesting a detailed automation plan for an EXISTING workflow. Focus on technical implementation.' : 'If the user describes a new workflow they want to add to their dashboard, you MUST return a JSON object with the workflow details. Set "isPublic" to false by default unless they explicitly ask to share it with the community. BE STRICT: Only suggest adding a workflow if it is a legitimate AEC-related task. If the request is nonsensical or unrelated to AEC, respond with a polite CHAT message explaining your purpose.'}
            If the user is just asking a general question, return a text response.
            
            User request: ${userMessage}` }]
          }
        ],
        config: {
          systemInstruction: `You are a specialized AI for AEC automation. 
          
          Intents:
          - "ADD_WORKFLOW": Use this if the user describes a NEW task they want to track/automate.
          - "PLAN": Use this if the user is asking for a technical implementation plan for a workflow. You MUST use the provided tech stack and follow a structured Markdown format with clear headings.
          - "CHAT": Use this for general questions or conversation.

          If the intent is ADD_WORKFLOW, provide the details in JSON format. 
          The JSON should have:
          - "intent": "ADD_WORKFLOW", "PLAN", or "CHAT"
          - "message": A helpful text response to the user. For "PLAN", this MUST be a highly structured technical guide in Markdown, strictly utilizing the tools mentioned in the user's request or the provided tech stack.
          - "workflow": (Only if intent is ADD_WORKFLOW) An object with:
            - "title": string
            - "category": "Architecture" | "BIM" | "Structural" | "MEP" | "Construction"
            - "description": A professional, contextually relevant description of exactly one or two sentences. Focus on how this workflow automates processes and improves efficiency in the AEC industry.
            - "painPoint": string
            - "automationPotential": number (0-100)
            - "complexity": "Low" | "Medium" | "High"
            - "tools": string[]
            - "roi": string
            - "priority": "P0" | "P1" | "P2" | "P3"
            - "estimatedEffort": string
            - "isPublic": boolean
            - "workflowId": string (if applicable)
            - "successMetrics": string`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING },
              message: { type: Type.STRING },
              workflow: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  painPoint: { type: Type.STRING },
                  automationPotential: { type: Type.NUMBER },
                  complexity: { type: Type.STRING },
                  tools: { type: Type.ARRAY, items: { type: Type.STRING } },
                  roi: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  estimatedEffort: { type: Type.STRING },
                  isPublic: { type: Type.BOOLEAN },
                  successMetrics: { type: Type.STRING }
                }
              }
            }
          }
        }
      });

      if (!response.text) {
        throw new Error("No response text from Gemini");
      }

      const data = JSON.parse(response.text);
      res.json(data);
    } catch (error: any) {
      console.error("Advisor API Error:", error);
      res.status(500).json({ error: error.message || "Failed to process advisor request" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
