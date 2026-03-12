import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
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
