"use client";
import * as React from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import SceneView from "../three/SceneView";
import { SectionHeader, Tag } from "../SectionHeader";
import { LinkedText } from "../../lib/richText";
import { portfolioData } from "../../data/portfolioData";

const { experience } = portfolioData;

function DeepDive({ dive }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="mt-10 border-2 border-black bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-black text-white"
        aria-expanded={open}
      >
        <span className="text-xs font-mono font-bold uppercase tracking-[0.25em]">{dive.title}</span>
        <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div>
          <SceneView
            scene="network"
            interactive
            className="w-full h-[42vh] min-h-[280px] max-h-[460px] border-b-2 border-black"
            fallback={<div className="w-full h-full hatch opacity-10" />}
          />
          <div className="p-5 md:p-8 grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-8">{dive.intro}</p>
              <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                {dive.pillars.map((p) => (
                  <li key={p.name} className="border-l-2 border-black pl-4">
                    <h4 className="font-bold uppercase tracking-tight text-sm mb-1">{p.name}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{p.text}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-gray-500 mb-3">Stack</h4>
                <table className="w-full text-sm">
                  <tbody>
                    {dive.stack.map((s) => (
                      <tr key={s.layer} className="border-t border-gray-200">
                        <td className="py-2 pr-3 font-mono text-[11px] uppercase tracking-wider text-gray-500 w-28">{s.layer}</td>
                        <td className="py-2 font-medium">{s.tech}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-gray-500 mb-3">Owned end to end</h4>
                <div className="flex flex-wrap gap-2">{dive.owned.map((o) => <Tag key={o}>{o}</Tag>)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Experience() {
  return (
    <section id="experience" className="relative border-t-2 border-black">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-24 md:py-32">
        <SectionHeader index={2} tag={experience.tag} headline={experience.headline} />
        <div className="space-y-20">
          {experience.jobs.map((job, i) => (
            <article key={job.id} className="reveal grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-3 flex lg:flex-col gap-4 items-start">
                <div className="bg-black text-white px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider w-max">{job.duration}</div>
                <div className="text-xs font-mono uppercase tracking-widest text-gray-500 pt-2">{job.location}</div>
                {job.id !== "brtc" && (
                  <SceneView scene={job.scene} className="hidden lg:block w-full aspect-[4/3] mt-4" />
                )}
              </div>
              <div className="lg:col-span-9 border-l-4 border-black pl-6 md:pl-10">
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight mb-2">{job.title}</h3>
                <p className="flex flex-wrap items-center gap-3 mb-6">
                  {job.companyUrl ? (
                    <a href={job.companyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-black text-white px-3 py-1 text-xs font-mono font-bold uppercase hover:bg-gray-800">
                      {job.company} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="bg-black text-white px-3 py-1 text-xs font-mono font-bold uppercase">{job.company}</span>
                  )}
                </p>
                <ul className="space-y-4 text-base md:text-lg text-gray-800 max-w-3xl">
                  {job.bullets.map((b, idx) => (
                    <li key={idx} className="flex gap-4">
                      <span className="mt-2.5 h-1.5 w-1.5 bg-black rounded-full shrink-0" />
                      <p><LinkedText text={b} links={job.bulletLinks} /></p>
                    </li>
                  ))}
                </ul>
                {job.deepDive && <DeepDive dive={job.deepDive} />}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
