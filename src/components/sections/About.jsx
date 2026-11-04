import * as React from "react";
import { SectionHeader, Tag } from "../SectionHeader";
import { RichText } from "../../lib/richText";
import { portfolioData } from "../../data/portfolioData";
import { asset } from "../../lib/site";

const { about, personal } = portfolioData;

export default function About() {
  return (
    <section id="about" className="relative border-t-2 border-black">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-24 md:py-32 grid lg:grid-cols-12 gap-12 lg:gap-16">
        <div className="lg:col-span-7">
          <SectionHeader index={1} tag={about.tag} headline={about.headline} />
          <p className="text-lg md:text-xl leading-relaxed text-gray-800 font-medium max-w-3xl reveal delay-200">{about.description}</p>

          <div className="mt-8 flex flex-wrap gap-2 reveal delay-300">
            <span className="text-[11px] font-mono uppercase tracking-widest text-gray-500 self-center mr-2">Research interests</span>
            {personal.researchInterests.map((r) => <Tag key={r}>{r}</Tag>)}
          </div>

          <div className="mt-12 max-w-3xl reveal delay-300">
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-gray-500 mb-5">{about.extrasTitle}</h3>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-base md:text-lg text-gray-800 font-medium">
              {about.extras.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 bg-black rounded-full shrink-0" />
                  <span><RichText text={item} /></span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5 flex items-start lg:justify-end">
          <figure className="relative reveal delay-200 w-full max-w-sm">
            <div className="absolute -inset-3 border-2 border-black translate-x-3 translate-y-3 hatch opacity-30" aria-hidden />
            <div className="relative border-4 border-black bg-white overflow-hidden aspect-[4/5]">
              <img src={asset(personal.photo)} alt={`${personal.firstName} ${personal.lastName}`} className="w-full h-full object-cover grayscale contrast-125" />
            </div>
            <figcaption className="relative mt-4 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-gray-500">
              <span>{personal.location}</span>
              <span>{personal.languages.join(" · ")}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
