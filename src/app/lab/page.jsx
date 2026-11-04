"use client";
/**
 * Scene lab: /lab?scene=cache&inverted=1  → renders one scene full-screen.
 * Used for screenshot tests. Not linked from the site.
 */
import * as React from "react";
import SceneView from "../../components/three/SceneView";
import { SCENES } from "../../data/portfolioData";

export default function Lab() {
  const [scene, setScene] = React.useState("intersection");
  const [inverted, setInverted] = React.useState(false);
  const [size, setSize] = React.useState("full");
  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("scene")) setScene(q.get("scene"));
    setInverted(q.get("inverted") === "1");
    if (q.get("size")) setSize(q.get("size"));
  }, []);
  const dims = size === "card" ? { width: 480, height: 270 } : size === "tall" ? { width: 420, height: 560 } : { width: "100vw", height: "100vh" };
  return (
    <div className={`relative z-10 min-h-screen ${inverted ? "bg-black text-white" : "bg-white text-black"}`}>
      <div className="fixed top-2 left-2 z-50 flex flex-wrap gap-1 text-[10px] font-mono">
        {SCENES.map((s) => (
          <a key={s} href={`?scene=${s}&inverted=${inverted ? 1 : 0}&size=${size}`} className={`px-1 border ${s === scene ? "bg-current" : ""}`}>
            <span className={s === scene ? (inverted ? "text-black" : "text-white") : ""}>{s}</span>
          </a>
        ))}
      </div>
      <div className="flex items-center justify-center min-h-screen">
        <SceneView scene={scene} inverted={inverted} interactive style={dims} className="border border-current" />
      </div>
    </div>
  );
}
