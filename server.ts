import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Generate
  app.post("/api/gemini/generate", async (req, res) => {
    const { prompt, systemInstruction, temperature, topP } = req.body;

    // Check if API key is present
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("GEMINI_API_KEY")) {
      // Graceful fallback to rich mock data based on the prompt keywords!
      const mockResponse = getMockAppletResponse(prompt);
      return res.json({
        success: true,
        isMock: true,
        data: mockResponse
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const schema = {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "Friendly, short, literal title of the generated applet (e.g. 'Todo List', 'Simple Timer')"
          },
          description: {
            type: Type.STRING,
            description: "A single concise sentence describing what the applet does"
          },
          components: {
            type: Type.ARRAY,
            description: "A clean set of high-level mockup component elements to present on the sandbox dashboard",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: {
                  type: Type.STRING,
                  description: "Type of the component: 'stat' (for KPIs/metrics), 'input' (input text field), 'button' (interactive action buttons), 'chart' (mini-chart), or 'list' (list container for records)"
                },
                label: { type: Type.STRING, description: "Label text shown on the component" },
                value: { type: Type.STRING, description: "Initial value or text content of the component" },
                data: {
                  type: Type.ARRAY,
                  description: "Optional array of objects with key and val representing simple graph data series, or checklist item titles",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING },
                      val: { type: Type.NUMBER }
                    }
                  }
                }
              }
            }
          },
          codeSnippet: {
            type: Type.STRING,
            description: "A pristine, complete self-contained React functional component code snippet in TypeScript showing how the requested feature would be written. Fully styled with Tailwind CSS."
          },
          systemMessage: {
            type: Type.STRING,
            description: "A short, encouraging and professional 1-2 sentence developer message detailing how the applet was generated and fits their parameters"
          }
        },
        required: ["name", "description", "components", "codeSnippet", "systemMessage"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Generate a minimalist interactive application spec for the prompt: "${prompt}". Configure components list with at least 3 distinct elements to represent it visually.`,
        config: {
          systemInstruction: systemInstruction || "You are a professional software architect prototyping clean minimalist React applets.",
          temperature: typeof temperature === 'number' ? temperature : 0.85,
          topP: typeof topP === 'number' ? topP : 1.0,
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from GenAI model");
      }

      const parsedData = JSON.parse(responseText);
      return res.json({
        success: true,
        isMock: false,
        data: parsedData
      });

    } catch (err: any) {
      console.error("Gemini Generation Error:", err);
      // Fallback on error so the application never breaks
      const mockResponse = getMockAppletResponse(prompt);
      return res.json({
        success: true,
        isMock: true,
        error: err.message,
        data: mockResponse
      });
    }
  });

  // Serve static assets in production, Vite in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Intelligent mock data generator for when API key is missing or calls fail.
// This is essential to guarantee a flawless user experience under all conditions!
function getMockAppletResponse(prompt: string) {
  const lowercase = (prompt || "").toLowerCase();

  if (lowercase.includes("scene") || lowercase.includes("3d")) {
    return {
      name: "3D Scene Generator",
      description: "Generate and configure light positions, camera angles, and rendering materials for 3D viewports.",
      components: [
        { id: "mesh-type", type: "input", label: "Geometry Mesh Shape", value: "Sphere Mesh (Standard)" },
        { id: "light-intensity", type: "stat", label: "Key Light Intensity", value: "1.45 Lumens" },
        { id: "camera-fov", type: "stat", label: "Perspective Camera FOV", value: "45° Diagonal" },
        { id: "render-btn", type: "button", label: "Rebuild Viewport Mesh", value: "exec_rebuild" },
        {
          id: "render-queue",
          type: "list",
          label: "Render Engine Active Queue",
          value: "",
          data: [
            { key: "Shadow Pre-pass", val: 12 },
            { key: "Raymarch Occlusion", val: 40 },
            { key: "Post-Processing Glow", val: 95 }
          ]
        },
        {
          id: "gpu-chart",
          type: "chart",
          label: "Real-time GPU Load (%)",
          value: "",
          data: [
            { key: "10s ago", val: 24 },
            { key: "8s ago", val: 32 },
            { key: "6s ago", val: 55 },
            { key: "4s ago", val: 82 },
            { key: "2s ago", val: 78 },
            { key: "Now", val: 94 }
          ]
        }
      ],
      codeSnippet: `import React, { useState } from 'react';\nimport { Box, Play, Layers } from 'lucide-react';\n\nexport default function SceneGenerator() {\n  const [intensity, setIntensity] = useState(1.45);\n  const [mesh, setMesh] = useState('Sphere Mesh');\n\n  return (\n    <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">\n      <div>\n        <h3 className="font-semibold text-slate-800 text-base">3D Scene Controller</h3>\n        <p className="text-xs text-slate-400">Minimal ambient preview setup</p>\n      </div>\n      \n      <div className="flex gap-4 items-center">\n        <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">\n          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Mesh Active</span>\n          <span className="text-sm font-semibold text-slate-700">{mesh}</span>\n        </div>\n        <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">\n          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Key Light</span>\n          <span className="text-sm font-semibold text-slate-700">{intensity} lm</span>\n        </div>\n      </div>\n\n      <div className="space-y-4">\n        <label className="text-xs font-semibold text-slate-600 block">Configure Light Level</label>\n        <input \n          type="range" \n          min="0.1" \n          max="3.0" \n          step="0.05"\n          value={intensity} \n          onChange={(e) => setIntensity(parseFloat(e.target.value))} \n          className="w-full accent-black"\n        />\n      </div>\n\n      <button \n        onClick={() => setMesh(mesh === 'Sphere Mesh' ? 'Custom Cube Mesh' : 'Sphere Mesh')}\n        className="w-full py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition"\n      >\n        Toggle Geometry Mesh\n      </button>\n    </div>\n  );\n}`,
      systemMessage: "Successfully parsed 3D rendering parameters. Structured layout includes metric stats, custom viewport dimensions, and an interactive material render queue."
    };
  }

  if (lowercase.includes("financial") || lowercase.includes("invest") || lowercase.includes("portfolio")) {
    return {
      name: "Financial Analysis Pro",
      description: "Analyze, plan, and project returns on financial portfolios with multi-variable asset allocations.",
      components: [
        { id: "initial-investment", type: "stat", label: "Total Assets Value", value: "$425,100" },
        { id: "annual-return", type: "stat", label: "Target IRR (CAGR)", value: "12.4%" },
        { id: "risk-level", type: "input", label: "Portfolio Risk Model", value: "Balanced Moderate Growth" },
        { id: "rebalance-btn", type: "button", label: "Trigger Capital Rebalance", value: "exec_rebalance" },
        {
          id: "allocation-list",
          type: "list",
          label: "Asset Allocation Weights",
          value: "",
          data: [
            { key: "Standard Index ETFs", val: 50 },
            { key: "High-yield Custom Bonds", val: 30 },
            { key: "Speculative tech options", val: 15 },
            { key: "Liquid USD Reserves", val: 5 }
          ]
        },
        {
          id: "growth-chart",
          type: "chart",
          label: "Portfolio Projected Growth ($K)",
          value: "",
          data: [
            { key: "Year 1", val: 425 },
            { key: "Year 2", val: 477 },
            { key: "Year 3", val: 536 },
            { key: "Year 4", val: 602 },
            { key: "Year 5", val: 676 },
            { key: "Year 6", val: 760 }
          ]
        }
      ],
      codeSnippet: `import React, { useState } from 'react';\nimport { TrendingUp, Award, RefreshCw } from 'lucide-react';\n\nexport default function FinancialCalculator() {\n  const [irr, setIrr] = useState(12.4);\n  const [risk, setRisk] = useState('Balanced');\n\n  return (\n    <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">\n      <div>\n        <h3 className="font-semibold text-slate-800 text-base">Asset Allocation Planner</h3>\n        <p className="text-xs text-slate-400">Minimal clean financial projections</p>\n      </div>\n\n      <div className="grid grid-cols-2 gap-4 text-center">\n        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">\n          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Proj. Return</span>\n          <span className="text-sm font-semibold text-emerald-600">+{irr}% YoY</span>\n        </div>\n        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">\n          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Profile</span>\n          <span className="text-sm font-semibold text-slate-700">{risk}</span>\n        </div>\n      </div>\n\n      <div className="space-y-2">\n        <div className="flex justify-between text-xs font-semibold text-slate-600">\n          <span>Target Growth rate</span>\n          <span>{irr}%</span>\n        </div>\n        <input \n          type="range" \n          min="2.0" \n          max="30.0" \n          step="0.5"\n          value={irr} \n          onChange={(e) => setIrr(parseFloat(e.target.value))} \n          className="w-full accent-black"\n        />\n      </div>\n\n      <button \n        onClick={() => setRisk(risk === 'Balanced' ? 'Aggressive Alpha' : 'Balanced')}\n        className="w-full py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition"\n      >\n        Rotate Allocation Engine\n      </button>\n    </div>\n  );\n}`,
      systemMessage: "Generated financial portfolio analysis layout. The widget tracks investment projection rates with a sleek slider and allocates index weight graphs."
    };
  }

  if (lowercase.includes("marketing") || lowercase.includes("copy") || lowercase.includes("ad")) {
    return {
      name: "Marketing Copilot",
      description: "Automate, refine, and draft compelling SEO copywriting and ad variants customized for your demographic.",
      components: [
        { id: "demo-input", type: "input", label: "Active Target Audience", value: "Software Developers & Architects" },
        { id: "conversions", type: "stat", label: "Est. Conversion Lift", value: "28.5%" },
        { id: "tone-style", type: "stat", label: "Current Writing Tone", value: "Professional yet Friendly" },
        { id: "gen-copy", type: "button", label: "Write Content Variant", value: "exec_marketing_copy" },
        {
          id: "drafts-list",
          type: "list",
          label: "Draft Ad Variant Outputs",
          value: "",
          data: [
            { key: "Prototyping has never looked this flawless. Try Studio.", val: 1 },
            { key: "Skip the heavy setup. Start with zero-config applets.", val: 2 },
            { key: "Craft clean, human-designed microservices in seconds.", val: 3 }
          ]
        },
        {
          id: "engagement-chart",
          type: "chart",
          label: "Draft Click-through Rate Projection",
          value: "",
          data: [
            { key: "Variant A", val: 1.5 },
            { key: "Variant B", val: 3.2 },
            { key: "Variant C", val: 4.8 }
          ]
        }
      ],
      codeSnippet: `import React, { useState } from 'react';\nimport { Pencil, Send } from 'lucide-react';\n\nexport default function MarketingCopilotWidget() {\n  const [tone, setTone] = useState('Professional yet Friendly');\n  const [copied, setCopied] = useState(false);\n\n  const copyText = () => {\n    setCopied(true);\n    setTimeout(() => setCopied(false), 2000);\n  };\n\n  return (\n    <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">\n      <div>\n        <h3 className="font-semibold text-slate-800 text-base">Ad Copy Variants</h3>\n        <p className="text-xs text-slate-400">Minimal draft generator</p>\n      </div>\n\n      <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg space-y-2">\n        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Current Active Headline</span>\n        <p className="text-xs text-slate-700 font-medium italic">"Skip the heavy setup. Start with zero-config applets."</p>\n      </div>\n\n      <div className="flex items-center justify-between text-xs text-slate-500">\n        <span>Tone: <strong>{tone}</strong></span>\n        <button \n          onClick={() => setTone(tone === 'Professional yet Friendly' ? 'Daring & Bold' : 'Professional yet Friendly')}\n          className="text-xs text-blue-600 hover:underline font-semibold"\n        >\n          Change Tone\n        </button>\n      </div>\n\n      <button \n        onClick={copyText}\n        className="w-full py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition"\n      >\n        {copied ? 'Copied Variant!' : 'Copy Active Headline'}\n      </button>\n    </div>\n  );\n}`,
      systemMessage: "Wrote high-indexing copy formulations. Features conversions indicators and copies reactive text snippets."
    };
  }

  // General fallback for any write-in prompt!
  const friendlyTitle = prompt.length > 25 ? prompt.slice(0, 22) + "..." : prompt;
  return {
    name: friendlyTitle || "Custom Live Applet",
    description: `Prototyping model for: "${prompt}". Generated based on clean design principles.`,
    components: [
      { id: "custom-input", type: "input", label: "Parameter Input Settings", value: "Default Configuration Variable" },
      { id: "perf-metric", type: "stat", label: "Simulated Processor Efficiency", value: "98.7% Optimal" },
      { id: "status-flag", type: "stat", label: "Integration Node Sandbox State", value: "Active Node Run" },
      { id: "randomize", type: "button", label: "Re-run Calculation Engine", value: "exec_rand" },
      {
        id: "step-guide",
        type: "list",
        label: "Validation Queue Matrix Stages",
        value: "",
        data: [
          { key: "Verify source config parameters", val: 100 },
          { key: "Process state calculations", val: 100 },
          { key: "Compute visual metrics", val: 50 },
          { key: "Serve static production builds", val: 5 }
        ]
      },
      {
        id: "activity-rate",
        type: "chart",
        label: "Simulated Processing Amplitude",
        value: "",
        data: [
          { key: "T-5", val: 45 },
          { key: "T-4", val: 50 },
          { key: "T-3", val: 75 },
          { key: "T-2", val: 95 },
          { key: "T-1", val: 100 },
          { key: "T-0", val: 62 }
        ]
      }
    ],
    codeSnippet: `import React, { useState } from 'react';\n\nexport default function CustomApplet() {\n  const [count, setCount] = useState(1);\n\n  return (\n    <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 text-slate-800">\n      <div>\n        <h3 className="font-semibold text-base">Custom Workspace</h3>\n        <p className="text-xs text-slate-400">Generated dynamic component</p>\n      </div>\n      <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center">\n        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Active Multiplier</span>\n        <span className="text-2xl font-light">{count}x</span>\n      </div>\n      <button \n        onClick={() => setCount(c => c * 2)}\n        className="w-full py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition"\n      >\n        Increment Factor Scale\n      </button>\n    </div>\n  );\n}`,
    systemMessage: "Constructed standard multi-variable controller widget matching your system specifications."
  };
}

startServer();
