# AEC Automator: The Open-Source AEC Automation Hub 🏗️🤖

AEC Automator is a professional-grade platform designed to bridge the gap between Architecture, Engineering, and Construction (AEC) expertise and modern automation. It leverages AI (Google Gemini) to research, plan, and track automation workflows that save hundreds of hours in BIM management, structural design, and construction coordination.

## 🚀 The Vision
The AEC industry is at a turning point. While software like Revit, Rhino, and AutoCAD offer powerful APIs, the barrier to entry for automation remains high. AEC Automator aims to be the **global library of AEC automation knowledge**, where professionals can:
*   **Discover** AI-researched automation ideas.
*   **Plan** technical implementations with step-by-step AI guidance.
*   **Track** progress using a visual Kanban board.
*   **Share** successful workflows with the global community (Coming Soon).

## ✨ Key Features
*   **AI-Powered Discovery:** Daily research into innovative AEC automation ideas using Gemini 3 Flash.
*   **Technical Implementation Plans:** Instant, step-by-step guides for automating specific tasks (Dynamo scripts, Python plugins, C# add-ins).
*   **Kanban Workflow Management:** Drag-and-drop cards to track your automation pipeline from "Pending" to "Completed".
*   **Proof of Concept Gallery:** Showcase your automated results with image and video proofs.
*   **Industry Trends:** Real-time tracking of AEC tech advancements.

## 🛠️ Tech Stack
*   **Frontend:** React 19, TypeScript, Tailwind CSS, Motion (Framer Motion).
*   **Backend:** Firebase (Firestore & Auth).
*   **AI:** Google Gemini API (@google/genai).
*   **Visualization:** Recharts.
*   **Drag & Drop:** @dnd-kit.

## 🏁 Getting Started

### Prerequisites
*   Node.js 18+
*   A Firebase Project
*   A Google Gemini API Key

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/aec-automator.git
    cd aec-automator
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    Create a `.env` file in the root and add:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```
4.  Configure Firebase:
    Replace the contents of `src/firebase-applet-config.json` with your Firebase project credentials.

5.  Run the development server:
    ```bash
    npm run dev
    ```

## 🤝 Contributing
We want to make this **big**. Whether you are a BIM Manager, a Software Developer, or an Architect, your contributions are welcome!
*   Check out our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
*   Join our discussions on [Discord/Slack Link - Placeholder].

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---
*Built for the future of the built environment.*
