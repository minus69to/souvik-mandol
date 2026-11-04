import * as React from "react";
import { FileText, Mail, Link as LinkIcon } from "lucide-react";
import SceneView from "../three/SceneView";
import TiltCard from "../fx/TiltCard";
import { SectionHeader } from "../SectionHeader";
import { portfolioData } from "../../data/portfolioData";

const { research, personal } = portfolioData;

export default function Research() {
  return (
    <section id="research" className="relative border-t-2 border-black">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-24 md:py-32">
        <SectionHeader index={4} tag={research.tag} headline={research.headline} />

        <div className="space-y-8">
          {research.items.map((r, i) => (
            <TiltCard as="article" key={r.id} max={3} lift={6} className="reveal grid lg:grid-cols-12 border-2 border-black bg-white hover:shadow-ink">
              <SceneView
                scene={r.scene}
                className={`lg:col-span-4 aspect-[16/9] lg:aspect-auto lg:min-h-[280px] border-b-2 lg:border-b-0 ${i % 2 ? "lg:order-last lg:border-l-2" : "lg:border-r-2"} border-black`}
                fallback={<div className="w-full h-full hatch opacity-10" />}
              />
              <div className="lg:col-span-8 p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1">{r.kind}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider border border-black px-2 py-1">{r.status}</span>
                </div>
                <h3 className="sheen-text w-max max-w-full text-xl md:text-2xl font-black uppercase tracking-tight leading-tight">{r.title}</h3>
                {r.with && <p className="mt-2 text-xs md:text-sm font-mono text-gray-500 leading-relaxed">{r.with}</p>}
                <p className="mt-4 text-sm md:text-base text-gray-700 leading-relaxed">{r.description}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {r.tags.map((t) => (
                    <span key={t} className="chip text-[10px] font-mono uppercase tracking-wider border border-gray-300 px-2 py-0.5 hover:border-black transition-colors">#{t}</span>
                  ))}
                  {r.paperUrl && (
                    <a href={r.paperUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-2 text-xs font-mono font-bold uppercase underline underline-offset-4 hover:opacity-70">
                      <FileText size={14} /> Paper
                    </a>
                  )}
                  {r.doiUrl && (
                    <a href={r.doiUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase underline underline-offset-4 hover:opacity-70">
                      <LinkIcon size={14} /> DOI
                    </a>
                  )}
                </div>
              </div>
            </TiltCard>
          ))}
        </div>

        {personal.openToResearch && (
          <TiltCard max={2} lift={4} className="sheen-strong inverted mt-14 reveal border-2 border-black bg-black text-white p-8 md:p-12 grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-gray-400 mb-3">Collaboration</p>
              <h3 className="sheen-text w-max max-w-full text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">{research.collabTitle}</h3>
              <p className="mt-4 text-gray-300 leading-relaxed max-w-2xl">{research.collabText}</p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <a
                href={`mailto:${personal.email}?subject=Research%20collaboration`}
                className="inline-flex items-center gap-3 bg-white text-black px-6 py-4 text-sm font-bold uppercase tracking-widest border-2 border-white hover:bg-black hover:text-white transition-all hover:-translate-y-1 hover:shadow-paper"
              >
                <Mail size={16} /> Start a conversation
              </a>
            </div>
          </TiltCard>
        )}
      </div>
    </section>
  );
}
