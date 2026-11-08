import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Code, 
  Plus, 
  Trash2, 
  Paperclip, 
  Image as ImageIcon, 
  Play, 
  Check, 
  Copy, 
  ChevronRight, 
  User, 
  Activity, 
  Terminal, 
  SlidersHorizontal,
  Layers,
  Sparkle,
  Cpu,
  RefreshCw,
  Globe,
  Upload,
  ExternalLink,
  FileDown
} from "lucide-react";
import { Session, GeneratedApplet, ComponentSpec } from "./types";
import { generateAppletPDF } from "./utils/pdfGenerator";

// Standard starter session values matching the original metadata design HTML
const INITIAL_SESSIONS: Session[] = [
  {
    id: "session-1",
    name: "3D Scene Generator",
    prompt: "Build an interactive control panel to edit spotlight angles, material roughness, rendering quality passes, and monitor simulated WebGL GPU loads in real-time.",
    temperature: 0.85,
    topP: 0.95,
    systemInstruction: "You are a creative coder specialized in three.js canvas graphics. Provide strict metric readouts and rendering statuses.",
    dotColor: "bg-blue-500",
    generatedApplet: {
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
      codeSnippet: `import React, { useState } from 'react';\nimport { Box, Play, Layers } from 'lucide-react';\n\nexport default function SceneGenerator() {\n  const [intensity, setIntensity] = useState(1.45);\n  const [mesh, setMesh] = useState('Sphere Mesh');\n\n  return (\n    <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">\n      <div>\n        <h3 className="font-semibold text-slate-800 text-base">3D Scene Controller</h3>\n        <p className="text-xs text-slate-400">Minimal ambient preview setup</p>\n      </div>\n      \n      <div className="flex gap-4 items-center">\n        <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">\n          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold font-mono">Mesh Active</span>\n          <span className="text-sm font-semibold text-slate-700">{mesh}</span>\n        </div>\n        <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">\n          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold font-mono">Key Light</span>\n          <span className="text-sm font-semibold text-slate-700">{intensity} lm</span>\n        </div>\n      </div>\n\n      <div className="space-y-4">\n        <label className="text-xs font-semibold text-slate-600 block">Configure Light Level</label>\n        <input \n          type="range" \n          min="0.1" \n          max="3.0" \n          step="0.05"\n          value={intensity} \n          onChange={(e) => setIntensity(parseFloat(e.target.value))} \n          className="w-full accent-black cursor-pointer"\n        />\n      </div>\n\n      <button \n        onClick={() => setMesh(mesh === 'Sphere Mesh' ? 'Custom Cube Mesh' : 'Sphere Mesh')}\n        className="w-full py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition"\n      >\n        Toggle Geometry Mesh\n      </button>\n    </div>\n  );\n}`,
      systemMessage: "Successfully parsed 3D rendering parameters. Structured layout includes metric stats, custom viewport dimensions, and an interactive material render queue."
    }
  },
  {
    id: "session-2",
    name: "Financial Analysis Pro",
    prompt: "Design a financial planning allocation layout displaying overall return trends, risk indicators, and dynamic weighting bars.",
    temperature: 0.70,
    topP: 1.0,
    systemInstruction: "You are a quantitative finance specialist. Render precise values with meticulous accounting structures.",
    dotColor: "bg-emerald-500",
    generatedApplet: {
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
      codeSnippet: `import React, { useState } from 'react';\nimport { TrendingUp, Award, RefreshCw } from 'lucide-react';\n\nexport default function FinancialCalculator() {\n  const [irr, setIrr] = useState(12.4);\n  const [risk, setRisk] = useState('Balanced');\n\n  return (\n    <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">\n      <div>\n        <h3 className="font-semibold text-slate-800 text-base">Asset Allocation Planner</h3>\n        <p className="text-xs text-slate-400">Minimal clean financial projections</p>\n      </div>\n\n      <div className="grid grid-cols-2 gap-4 text-center">\n        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">\n          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold font-mono">Proj. Return</span>\n          <span className="text-sm font-semibold text-emerald-600">+{irr}% YoY</span>\n        </div>\n        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">\n          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold font-mono">Profile</span>\n          <span className="text-sm font-semibold text-slate-700">{risk}</span>\n        </div>\n      </div>\n\n      <div className="space-y-2">\n        <div className="flex justify-between text-xs font-semibold text-slate-600">\n          <span>Target Growth rate</span>\n          <span>{irr}%</span>\n        </div>\n        <input \n          type="range" \n          min="2.0" \n          max="30.0" \n          step="0.5"\n          value={irr} \n          onChange={(e) => setIrr(parseFloat(e.target.value))} \n          className="w-full accent-black cursor-pointer"\n        />\n      </div>\n\n      <button \n        onClick={() => setRisk(risk === 'Balanced' ? 'Aggressive Alpha' : 'Balanced')}\n        className="w-full py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition"\n      >\n        Rotate Allocation Engine\n      </button>\n    </div>\n  );\n}`,
      systemMessage: "Generated financial portfolio analysis layout. The widget tracks investment projection rates with a sleek slider and allocates index weight graphs."
    }
  },
  {
    id: "session-3",
    name: "Marketing Copilot",
    prompt: "Create an SEO copy generator allowing high-impact variant outputs, predicted conversion ratios, and instant copy buttons.",
    temperature: 1.0,
    topP: 0.80,
    systemInstruction: "You are a top-tier conversions designer and creative director. Write crisp, high-impact minimalist copy.",
    dotColor: "bg-purple-500",
    generatedApplet: {
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
    }
  }
];

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"editor" | "deployments" | "analytics">("editor");

  // Sessions list
  const [sessions, setSessions] = useState<Session[]>(() => {
    const local = localStorage.getItem("studio_sessions");
    return local ? JSON.parse(local) : INITIAL_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>("session-1");

  // Local state mirroring the active session values for real-time editing
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.85);
  const [topP, setTopP] = useState(1.0);
  const [systemInstruction, setSystemInstruction] = useState("");
  const [dotColor, setDotColor] = useState("bg-blue-500");

  // Generation status
  const [generating, setGenerating] = useState(false);
  const [showFlash, setShowFlash] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"sandbox" | "code" | "spec">("sandbox");

  // Simulator active fields
  const [simulatorValues, setSimulatorValues] = useState<Record<string, string>>({});
  const [simulatorLogs, setSimulatorLogs] = useState<string[]>(["Sandbox initialized with custom properties."]);

  // Sync state when active session changes or when sessions list is modified
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    if (activeSession) {
      setPrompt(activeSession.prompt);
      setTemperature(activeSession.temperature);
      setTopP(activeSession.topP);
      setSystemInstruction(activeSession.systemInstruction);
      setDotColor(activeSession.dotColor || "bg-slate-300");
    }
  }, [activeSessionId]);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem("studio_sessions", JSON.stringify(sessions));
  }, [sessions]);

  // Update session parameters immediately when user edits them
  const updateActiveSessionField = <K extends keyof Session>(field: K, value: Session[K]) => {
    setSessions(prev => 
      prev.map(s => s.id === activeSessionId ? { ...s, [field]: value } : s)
    );
  };

  const handleCreateSession = () => {
    const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-rose-500", "bg-yellow-500", "bg-indigo-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newId = `session-${Date.now()}`;
    const newSession: Session = {
      id: newId,
      name: "New Prompt Spec",
      prompt: "Describe an applet interface you want to build...",
      temperature: 0.85,
      topP: 1.0,
      systemInstruction: "You are a professional software architect. Focus on clean layout patterns.",
      dotColor: randomColor
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setPreviewTab("sandbox");
    triggerToast("Created new prototyping workspace");
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      triggerToast("Cannot delete the last remaining session.");
      return;
    }
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0]?.id || "");
    }
    triggerToast("Session configuration deleted.");
  };

  const triggerToast = (msg: string) => {
    setShowFlash(msg);
    setTimeout(() => {
      setShowFlash(null);
    }, 3000);
  };

  // Triggers real API call or fallback
  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.startsWith("Describe an")) {
      triggerToast("Please provide a valid prompt description.");
      return;
    }

    setGenerating(true);
    setSimulatorLogs(["Connecting to compiler context...", "Reading sandbox constraints..."]);

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemInstruction,
          temperature,
          topP
        })
      });

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const payload: GeneratedApplet = resJson.data;
        
        // Save prompt name or derive name if placeholder
        const resolvedName = payload.name || "Custom Applet";

        setSessions(prev => 
          prev.map(s => s.id === activeSessionId ? {
            ...s,
            name: s.name === "New Prompt Spec" ? resolvedName : s.name,
            prompt,
            temperature,
            topP,
            systemInstruction,
            generatedApplet: payload
          } : s)
        );

        setSimulatorLogs(prev => [
          ...prev,
          "Asset mapping complete.",
          `Compiled "${resolvedName}" layout successfully.`,
          payload.systemMessage || "Render complete."
        ]);

        triggerToast(resJson.isMock ? "Mock Preview Rendered" : "Applet compiled successfully!");
      } else {
        throw new Error(resJson.error || "Execution failed");
      }
    } catch (e: any) {
      console.error(e);
      triggerToast(`Preview error: ${e.message}`);
      setSimulatorLogs(prev => [...prev, `[ERROR] ${e.message}`]);
    } finally {
      setGenerating(false);
    }
  };

  // Simulator actions behavior
  const triggerSimulatorAction = (elementLabel: string, actionValue: string) => {
    setSimulatorLogs(prev => [
      ...prev,
      `[EVENT] User clicked action "${elementLabel}" (${actionValue})`,
      `Computed simulated pipeline results for event trigger.`
    ]);
    triggerToast(`Triggered: ${elementLabel}`);
  };

  const handleSimulatedInputChange = (id: string, label: string, val: string) => {
    setSimulatorValues(prev => ({ ...prev, [id]: val }));
    setSimulatorLogs(prev => [
      ...prev,
      `[INPUT] Value of "${label}" amended to: "${val}"`
    ]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast("Copied to clipboard!");
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center p-4">
      
      {/* Toast Alert */}
      {showFlash && (
        <div id="toast-alert" className="fixed top-6 right-6 z-50 bg-black text-white text-xs font-medium px-4 py-3 rounded-lg shadow-xl border border-neutral-800 flex items-center gap-2 animate-bounce">
          <Sparkle className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>{showFlash}</span>
        </div>
      )}

      {/* Main Canvas Frame mimicking the Clean Minimalism design precisely */}
      <div id="workspace-frame" className="w-[1240px] h-[860px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden select-none">
        
        {/* Header Block of Studio Applet */}
        <header id="stage-header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            <span className="font-semibold tracking-tight text-base font-mono">Studio Applet</span>
            <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 rounded border border-slate-200">v2.4.0</span>
          </div>

          {/* Navigation Matrix */}
          <div className="flex items-center gap-6">
            <nav className="flex gap-6 text-sm font-medium text-slate-500">
              <button 
                id="tab-editor"
                onClick={() => setActiveTab("editor")}
                className={`transition-colors py-1 px-2 rounded-md ${activeTab === "editor" ? "text-black bg-slate-100 font-semibold" : "hover:text-black hover:bg-slate-50"}`}
              >
                Editor
              </button>
              <button 
                id="tab-deployments"
                onClick={() => setActiveTab("deployments")}
                className={`transition-colors py-1 px-2 rounded-md ${activeTab === "deployments" ? "text-black bg-slate-100 font-semibold" : "hover:text-black hover:bg-slate-50"}`}
              >
                Deployments
              </button>
              <button 
                id="tab-analytics"
                onClick={() => setActiveTab("analytics")}
                className={`transition-colors py-1 px-2 rounded-md ${activeTab === "analytics" ? "text-black bg-slate-100 font-semibold" : "hover:text-black hover:bg-slate-50"}`}
              >
                Analytics
              </button>
            </nav>
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            <button 
              id="publish-btn"
              onClick={() => triggerToast("Applet prepared! Deploy finished.")}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition duration-150 cursor-pointer"
            >
              Publish App
            </button>
          </div>
        </header>

        {/* Editor Body */}
        {activeTab === "editor" && (
          <main className="flex-1 flex overflow-hidden">
            
            {/* Left Sidebar: Recent list and User */}
            <aside id="left-sidebar" className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 font-mono">Recent Projects</span>
                <button 
                  id="add-session-btn"
                  onClick={handleCreateSession}
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-black rounded"
                  title="New Session Prompt"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto pr-1">
                {sessions.map((item) => {
                  const isActive = activeSessionId === item.id;
                  return (
                    <div 
                      key={item.id}
                      id={`session-card-${item.id}`}
                      onClick={() => setActiveSessionId(item.id)}
                      className={`group p-2.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer transition ${isActive ? "bg-slate-100/80 border border-slate-200/60" : "hover:bg-slate-50/70"}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor || "bg-slate-300"}`}></div>
                        <span className="truncate text-slate-700 font-semibold">{item.name}</span>
                      </div>
                      <button 
                        id={`delete-btn-${item.id}`}
                        onClick={(e) => handleDeleteSession(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 text-slate-400 hover:text-red-500 rounded transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Sidebar Profile */}
              <div className="mt-auto border-t border-slate-100 pt-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs ring-2 ring-slate-100">
                    AR
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-slate-800 truncate">Alex Rivier</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Pro Developer</div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Center Generative Section */}
            <section id="center-generation-view" className="flex-1 flex flex-col bg-slate-50/60 overflow-hidden relative">
              <div className="flex-1 p-6 flex flex-col overflow-hidden">
                
                {/* Generation prompt form */}
                <div className="max-w-3xl w-full mx-auto space-y-4 shrink-0">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-light text-slate-900 tracking-tight">
                      Ready to <span className="font-semibold italic">generate</span>?
                    </h1>
                    <p className="text-slate-400 text-xs font-medium">
                      Enter instructions or choose a mockup from the left panel to prototype.
                    </p>
                  </div>

                  {/* Textarea Prompt Block with tool bar */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-1 flex flex-col ring-1 ring-slate-100 focus-within:ring-black focus-within:border-black transition">
                    <textarea 
                      id="prompt-textarea"
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value);
                        updateActiveSessionField("prompt", e.target.value);
                      }}
                      className="w-full h-24 p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none bg-transparent font-sans leading-relaxed" 
                      placeholder="Build a responsive dashboard for a fitness tracking application with dark mode support..."
                    />
                    
                    <div className="flex items-center justify-between p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => triggerToast("Attached files template: datasource_sample.csv")}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
                          title="Attach CSV/JSON Source"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => triggerToast("Attached design blueprint: mockup_inspiration.png")}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
                          title="Attach Mockup Layout"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <button 
                        id="run-applet-btn"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-4 py-1.5 bg-black hover:bg-neutral-800 disabled:bg-neutral-400 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {generating ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Compiling...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-white text-white" />
                            <span>Run Applet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main results component sandbox space */}
                <div className="flex-1 mt-6 max-w-3xl w-full mx-auto flex flex-col overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
                  
                  {/* Results Tab Bar */}
                  <div className="h-11 border-b border-slate-100 bg-slate-50/70 px-4 flex items-center justify-between font-mono text-[11px] font-bold uppercase shrink-0">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setPreviewTab("sandbox")}
                        className={`py-1 px-2.5 rounded transition ${previewTab === "sandbox" ? "bg-white text-black text-xs shadow-sm ring-1 ring-slate-200/50" : "text-slate-400 hover:text-slate-700"}`}
                      >
                        🎨 Live Simulator
                      </button>
                      <button 
                        onClick={() => setPreviewTab("code")}
                        className={`py-1 px-2.5 rounded transition ${previewTab === "code" ? "bg-white text-black text-xs shadow-sm ring-1 ring-slate-200/50" : "text-slate-400 hover:text-slate-700"}`}
                      >
                        💻 Code Blueprint
                      </button>
                      <button 
                        onClick={() => setPreviewTab("spec")}
                        className={`py-1 px-2.5 rounded transition ${previewTab === "spec" ? "bg-white text-black text-xs shadow-sm ring-1 ring-slate-200/50" : "text-slate-400 hover:text-slate-700"}`}
                      >
                        🛡️ Schema Spec
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-slate-400 tracking-wider">SANDBOX LIVE</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col relative">
                    
                    {/* Sandbox tab */}
                    {previewTab === "sandbox" && (
                      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
                        {activeSession.generatedApplet ? (
                          <div className="space-y-6">
                            
                            {/* Applet Meta Header */}
                            <div className="border-b border-slate-100 pb-4">
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span>COMPILED APPLET SCHEMA</span>
                              </div>
                              <h2 className="text-lg font-semibold text-slate-800">{activeSession.generatedApplet.name}</h2>
                              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{activeSession.generatedApplet.description}</p>
                            </div>

                            {/* Rendered Layout GRID mapping components dynamically! */}
                            <div className="grid grid-cols-2 gap-4">
                              {activeSession.generatedApplet.components.map((c) => {
                                if (c.type === "stat") {
                                  return (
                                    <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">{c.label}</span>
                                      <span className="text-xl font-bold font-mono tracking-tight text-slate-800">{c.value}</span>
                                    </div>
                                  );
                                }

                                if (c.type === "input") {
                                  return (
                                    <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">{c.label}</label>
                                      <input 
                                        type="text"
                                        className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none"
                                        value={simulatorValues[c.id] ?? c.value}
                                        onChange={(e) => handleSimulatedInputChange(c.id, c.label, e.target.value)}
                                      />
                                    </div>
                                  );
                                }

                                if (c.type === "button") {
                                  return (
                                    <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center col-span-2">
                                      <button 
                                        onClick={() => triggerSimulatorAction(c.label, c.value)}
                                        className="py-1.5 px-6 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg tracking-wide shadow-md cursor-pointer transition active:scale-95"
                                      >
                                        {c.label}
                                      </button>
                                    </div>
                                  );
                                }

                                if (c.type === "list" && c.data) {
                                  return (
                                    <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl col-span-2">
                                      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold block mb-2">{c.label}</span>
                                      <div className="space-y-1.5">
                                        {c.data.map((item, idx) => (
                                          <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 text-xs">
                                            <span className="text-slate-600 truncate font-medium">{item.key}</span>
                                            <span className="font-mono text-[10px] text-slate-400">{item.val}%</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }

                                if (c.type === "chart" && c.data) {
                                  return (
                                    <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl col-span-2">
                                      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold block mb-2">{c.label}</span>
                                      <div className="flex items-end justify-between h-20 pt-4 px-4 bg-white rounded border border-slate-100">
                                        {c.data.map((item, idx) => {
                                          const maxVal = Math.max(...(c.data?.map(o => o.val) || [100]));
                                          const heightPercent = maxVal > 0 ? (item.val / maxVal) * 80 + 10 : 30;
                                          return (
                                            <div key={idx} className="flex flex-col items-center flex-1 group">
                                              <div className="w-full text-[9px] font-mono text-center mb-1 text-slate-400 group-hover:block transition">
                                                {item.val}
                                              </div>
                                              <div 
                                                style={{ height: `${heightPercent}%` }}
                                                className="w-4 bg-black rounded-t transition-all hover:bg-zinc-600 duration-150"
                                              />
                                              <span className="text-[9px] text-slate-400 mt-1 truncate font-mono max-w-[50px]">{item.key}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }

                                return null;
                              })}
                            </div>

                            {/* Dev system console log strip inside sandbox */}
                            <div className="border-t border-slate-100 pt-4 space-y-2">
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                                <span>Simulation Console Diagnostics</span>
                              </span>
                              <div className="p-3 bg-slate-900 rounded-lg text-[10.5px] font-mono text-slate-300 space-y-1 overflow-x-auto leading-relaxed max-h-36">
                                {simulatorLogs.map((log, lIdx) => (
                                  <div key={lIdx} className="truncate">
                                    <span className="text-slate-500 font-semibold mr-1.5">&gt;</span>
                                    {log}
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                            <Sparkles className="w-8 h-8 text-slate-300 stroke-1 mb-3 animate-pulse" />
                            <p className="text-sm font-semibold">No active model compilation found</p>
                            <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                              Enter a customized app prompt above or select an existing template, then click "Run Applet" to build the layout.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Code tab */}
                    {previewTab === "code" && (
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                        {activeSession.generatedApplet ? (
                          <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950 rounded-xl border border-slate-800">
                            <div className="h-9 border-b border-slate-900 bg-slate-900/60 flex items-center justify-between px-4 shrink-0">
                              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">React Core Implementation (TypeScript + Tailwind)</span>
                              <button 
                                onClick={() => copyToClipboard(activeSession.generatedApplet?.codeSnippet || "")}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 transition"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </button>
                            </div>
                            <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-300 leading-relaxed bg-slate-950">
                              <code>{activeSession.generatedApplet.codeSnippet}</code>
                            </pre>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                            <Code className="w-8 h-8 text-slate-300 stroke-1 mb-2" />
                            <p className="text-xs">Compile prompt layout to generate TypeScript files.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specifications JSON Tab */}
                    {previewTab === "spec" && (
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                        {activeSession.generatedApplet ? (
                          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 rounded-xl border border-slate-800">
                            <div className="h-9 border-b border-slate-900 bg-slate-900/60 flex items-center justify-between px-4 shrink-0">
                              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Applet Specification Matrix JSON</span>
                              <button 
                                onClick={() => copyToClipboard(JSON.stringify(activeSession.generatedApplet, null, 2))}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 transition"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Spec JSON</span>
                              </button>
                            </div>
                            <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-300 leading-relaxed bg-slate-950">
                              <code>{JSON.stringify(activeSession.generatedApplet, null, 2)}</code>
                            </pre>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                            <Layers className="w-8 h-8 text-slate-300 stroke-1 mb-2" />
                            <p className="text-xs">JSON telemetry specifications schema will output here.</p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </section>

            {/* Right Sidebar: configuration panel */}
            <aside id="right-sidebar" className="w-72 bg-white border-l border-slate-200 shrink-0 p-6 space-y-6 overflow-y-auto">
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4 font-mono">Model Configuration</label>
                <div className="space-y-4">
                  
                  {/* Temperature slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Temperature</span>
                      <span className="font-mono font-bold text-black">{temperature.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={temperature}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTemperature(val);
                          updateActiveSessionField("temperature", val);
                        }}
                        className="w-full h-1 bg-slate-100 hover:bg-slate-200 rounded-full appearance-none cursor-pointer accent-black transition"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 leading-none">Controls randomness: Higher values increase diversity.</span>
                  </div>

                  {/* Top P Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Top P</span>
                      <span className="font-mono font-bold text-black">{topP.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={topP}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTopP(val);
                          updateActiveSessionField("topP", val);
                        }}
                        className="w-full h-1 bg-slate-100 hover:bg-slate-200 rounded-full appearance-none cursor-pointer accent-black transition"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 leading-none">Nucleus sampling threshold setting parameter.</span>
                  </div>

                </div>
              </div>

              {/* System Instructions block */}
              <div id="system-instructions-block" className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">System Instructions</label>
                <textarea 
                  value={systemInstruction}
                  onChange={(e) => {
                    setSystemInstruction(e.target.value);
                    updateActiveSessionField("systemInstruction", e.target.value);
                  }}
                  className="w-full h-24 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 leading-relaxed italic focus:outline-none focus:bg-white focus:ring-1 focus:ring-black transition" 
                  placeholder="System role guidelines for prototyping..."
                />
              </div>

              {/* Export Panel Options */}
              <div className="pt-4 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 font-mono">Export Playground</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      if (!activeSession.generatedApplet) return triggerToast("Compile an applet first!");
                      copyToClipboard(activeSession.generatedApplet.codeSnippet);
                    }}
                    className="py-1.5 text-[10px] border border-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    React/TS
                  </button>
                  <button 
                    onClick={() => {
                      if (!activeSession.generatedApplet) return triggerToast("Compile an applet first!");
                      copyToClipboard(`import "@import 'tailwindcss';"`);
                      triggerToast("Tailwind instructions copied!");
                    }}
                    className="py-1.5 text-[10px] border border-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Tailwind
                  </button>
                  <button 
                    onClick={() => triggerToast("Figma Plugin bundle generated! Download starting...")}
                    className="py-1.5 text-[10px] border border-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Figma Web
                  </button>
                  <button 
                    onClick={() => {
                      if (!activeSession.generatedApplet) return triggerToast("Compile an applet first!");
                      copyToClipboard(JSON.stringify(activeSession.generatedApplet, null, 2));
                    }}
                    className="py-1.5 text-[10px] border border-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Raw Spec
                  </button>
                  <button 
                    onClick={() => {
                      if (!activeSession.generatedApplet) return triggerToast("Compile an applet first!");
                      try {
                        generateAppletPDF(activeSession);
                        triggerToast("PDF Spec downloaded successfully!");
                      } catch (err: any) {
                        triggerToast(`PDF Error: ${err.message}`);
                      }
                    }}
                    className="col-span-2 mt-1 py-1.5 text-[10px] bg-slate-900 hover:bg-black text-white rounded font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download PDF Specification</span>
                  </button>
                </div>
              </div>

            </aside>
          </main>
        )}

        {/* Deployments Section Tab */}
        {activeTab === "deployments" && (
          <div className="flex-1 p-8 flex flex-col bg-slate-50/40 overflow-y-auto">
            <div className="max-w-4xl w-full mx-auto space-y-6">
              <div>
                <h1 className="text-xl font-light text-slate-900 tracking-tight">Active Container <span className="font-semibold">Deployments</span></h1>
                <p className="text-xs text-slate-400 mt-1">Review active, revisioned, and archived production builds hosted in secure sandboxed microservices.</p>
              </div>

              <div className="space-y-3">
                {sessions.map((item, idx) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                    <div className="flex gap-4 items-center">
                      <div className="p-2.5 bg-slate-100 rounded-lg">
                        <Globe className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-[9px] font-bold text-emerald-600 rounded uppercase">Live</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-md truncate">{item.prompt}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right font-mono text-[10px] text-slate-400 leading-tight">
                        <div>REVISION v1.{idx + 2}</div>
                        <div className="text-[9px]">Uptime: 100%</div>
                      </div>
                      <div className="w-px h-6 bg-slate-100"></div>
                      <button 
                        onClick={() => triggerToast(`Navigating to prototype: ${item.name}`)}
                        className="p-1 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-[10.5px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>Open Applet</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Section Tab */}
        {activeTab === "analytics" && (
          <div className="flex-1 p-8 flex flex-col bg-slate-50/40 overflow-y-auto">
            <div className="max-w-4xl w-full mx-auto space-y-6">
              <div>
                <h1 className="text-xl font-light text-slate-900 tracking-tight">Processor <span className="font-semibold">Analytics</span></h1>
                <p className="text-xs text-slate-400 mt-1">Real-time performance instrumentation, compilation quotas, latency tracks, and generation logs.</p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Weekly Executions</span>
                  <span className="text-2xl font-bold tracking-tight text-slate-800">4,124</span>
                  <span className="text-[10px] text-emerald-500 block font-semibold mt-1">↑ 14.8% lift vs. prior period</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Med. Generation Time</span>
                  <span className="text-2xl font-bold tracking-tight text-slate-800">1.84s</span>
                  <span className="text-[10px] text-emerald-500 block font-semibold mt-1">↓ 0.22s speed enhancement</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Gemini Token Budget</span>
                  <span className="text-2xl font-bold tracking-tight text-slate-800">12.5%</span>
                  <span className="text-[10px] text-slate-400 block font-semibold mt-1">Quota reset standard routine</span>
                </div>
              </div>

              {/* Simulated analytics graph */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Platform Token Load Over Past Calendar Span (k-tokens)</span>
                <div className="flex items-end justify-between h-44 pt-4 px-4 bg-slate-50/50 rounded-lg">
                  {[
                    { key: "Mon 4k", val: 30 },
                    { key: "Tue 8k", val: 55 },
                    { key: "Wed 2k", val: 24 },
                    { key: "Thu 11k", val: 92 },
                    { key: "Fri 7k", val: 68 },
                    { key: "Sat 4k", val: 40 },
                    { key: "Sun 5k", val: 51 }
                  ].map((o, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <span className="text-[9px] font-mono text-slate-400 mb-1">{o.val}k</span>
                      <div 
                        style={{ height: `${o.val}%` }} 
                        className="w-10 bg-slate-900 rounded-t hover:bg-neutral-600 transition duration-150"
                      />
                      <span className="text-[9px] font-mono text-slate-400 mt-1.5">{o.key.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
