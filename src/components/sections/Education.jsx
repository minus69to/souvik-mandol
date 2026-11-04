import * as React from "react";
import { Award, ExternalLink } from "lucide-react";
import SceneView from "../three/SceneView";
import TiltCard from "../fx/TiltCard";
import { SectionHeader } from "../SectionHeader";
import { portfolioData } from "../../data/portfolioData";

const { education, certifications } = portfolioData;

export default function Education() {
  return (
    <section id="education" className="relative border-t-2 border-black">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-24 md:py-32 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <SectionHeader index={6} tag={education.tag} headline={education.headline} />
          <TiltCard max={4} className="mb-10 reveal border-2 border-black bg-white"><SceneView scene="campus" className="w-full aspect-[16/7]" fallback={<div className="w-full h-full hatch opacity-10" />} /></TiltCard>
          <ol className="space-y-8">
            {education.items.map((e, i) => (
              <TiltCard as="li" key={e.id} max={3} lift={4} className="reveal flex flex-col md:flex-row md:items-start justify-between gap-4 border-l-4 border-black pl-6 pr-4 py-3 bg-white/70" style={{ "--d": `${i * 80}ms` }}>
                <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">{e.degree}</h3>
                  <p className="text-base md:text-lg text-gray-800 font-bold mt-1">{e.institution}</p>
                  {e.details && <p className="text-gray-500 font-mono text-sm mt-1">{e.details}</p>}
                </div>
                <div className="bg-black text-white px-3 py-2 text-xs font-mono font-bold uppercase shrink-0 w-max">{e.duration}</div>
              </TiltCard>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-5">
          <SectionHeader index={7} tag={certifications.tag} srHeadline={certifications.tag} />
          <TiltCard max={4} className="mb-8 reveal border-2 border-black bg-white"><SceneView scene="neural" className="w-full aspect-[16/9]" fallback={<div className="w-full h-full hatch opacity-10" />} /></TiltCard>
          <div className="space-y-8">
            {certifications.groups.map((g) => (
              <TiltCard key={g.provider} max={3} lift={4} className="reveal bg-white/70 p-4 -m-4">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-gray-500 mb-3 flex items-center gap-2"><Award size={14} /> {g.provider}</h3>
                <ul className="divide-y divide-gray-200 border-y border-gray-200">
                  {g.items.map((c) => {
                    const item = typeof c === "string" ? { name: c } : c;
                    const Row = item.url ? "a" : "div";
                    return (
                      <li key={item.name}>
                        <Row
                          {...(item.url ? { href: item.url, target: "_blank", rel: "noreferrer" } : {})}
                          className="flex items-center justify-between gap-4 py-3 text-sm md:text-base font-bold text-gray-800 hover:bg-black hover:text-white px-2 -mx-2 transition-colors"
                        >
                          <span>{item.name}</span>
                          {item.url && <ExternalLink size={14} className="shrink-0 opacity-60" />}
                        </Row>
                      </li>
                    );
                  })}
                </ul>
              </TiltCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
