import * as React from "react";
import { Code2, ExternalLink } from "lucide-react";
import SceneView from "../three/SceneView";
import TiltCard from "../fx/TiltCard";
import { SectionHeader } from "../SectionHeader";
import { portfolioData } from "../../data/portfolioData";

const { projects } = portfolioData;
const ok = (u) => u && u !== "#";

export default function Projects() {
  return (
    <section id="projects" className="relative border-t-2 border-black">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-24 md:py-32">
        <SectionHeader index={3} tag={projects.tag} headline={projects.headline} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {projects.items.map((p, i) => (
            <TiltCard
              as="article"
              key={p.id}
              max={5}
              className={`group reveal border-2 border-black bg-white flex flex-col hover:shadow-ink ${p.featured ? "md:col-span-2 xl:col-span-2" : ""}`}
              style={{ transitionDelay: `${(i % 3) * 60}ms` }}
            >
              <SceneView
                scene={p.scene}
                className={`w-full border-b-2 border-black ${p.featured ? "aspect-[16/7]" : "aspect-[16/9]"}`}
                fallback={<div className="w-full h-full hatch opacity-10" />}
              />
              <div className="p-6 md:p-7 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="sheen-text w-max max-w-full text-xl md:text-2xl font-black uppercase tracking-tight leading-tight">{p.title}</h3>
                    {p.subtitle && <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mt-1">{p.subtitle}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {ok(p.codeUrl) && (
                      <a href={p.codeUrl} target="_blank" rel="noreferrer" aria-label="Source code" className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"><Code2 size={18} /></a>
                    )}
                    {ok(p.demoUrl) && (
                      <a href={p.demoUrl} target="_blank" rel="noreferrer" aria-label="Live demo" className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"><ExternalLink size={18} /></a>
                    )}
                  </div>
                </div>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed mt-3 mb-6 flex-1">{p.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="chip text-[10px] font-mono uppercase tracking-wider border border-black px-2 py-0.5 transition-colors">{t}</span>
                  ))}
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
