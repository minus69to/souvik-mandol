import * as React from "react";
import SceneView from "../three/SceneView";
import { SectionHeader } from "../SectionHeader";
import { portfolioData } from "../../data/portfolioData";

const { skills } = portfolioData;

export default function Skills() {
  return (
    <section id="skills" className="relative border-t-2 border-black">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 pt-24 md:pt-32">
        <SectionHeader index={5} tag={skills.tag} headline={skills.headline} />
      </div>
      <SceneView
        scene="skills"
        interactive
        className="w-full h-[52vh] min-h-[320px] max-h-[640px]"
        fallback={<div className="w-full h-full hatch opacity-10" />}
      />
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 pb-24 md:pb-32">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-8 border-t-2 border-black pt-10">
          {skills.categories.map((c, i) => (
            <div key={c.name} className="reveal" style={{ transitionDelay: `${i * 50}ms` }}>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-3">
                <span className="inline-block w-2 h-2 bg-black rotate-45" /> {c.name}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {c.items.map((s) => (
                  <li key={s} data-cursor className="chip text-[11px] font-mono uppercase tracking-wider border border-black px-2 py-0.5 transition-colors">{s}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
