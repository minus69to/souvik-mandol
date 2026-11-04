"use client";
import * as React from "react";
import { ArrowDown, Github, Linkedin, Mail } from "lucide-react";
import SceneView from "../three/SceneView";
import { portfolioData } from "../../data/portfolioData";
import { useMotionPrefs } from "../three/useMotionPrefs";
import Magnetic from "../fx/Magnetic";

const { landing, personal } = portfolioData;

function Typewriter({ words }) {
  const { reduced } = useMotionPrefs();
  const [i, setI] = React.useState(0);
  const [txt, setTxt] = React.useState("");
  React.useEffect(() => {
    const word = words[i % words.length];
    if (reduced) {
      setTxt(word);
      const t = setTimeout(() => setI((v) => v + 1), 4000);
      return () => clearTimeout(t);
    }
    let n = 0;
    let t;
    const type = () => {
      n += 1;
      setTxt(word.slice(0, n));
      if (n < word.length) t = setTimeout(type, 38);
      else t = setTimeout(() => setI((v) => v + 1), 2600);
    };
    t = setTimeout(type, 300);
    return () => clearTimeout(t);
  }, [i, words, reduced]);
  return (
    <span className="font-mono">
      {txt}
      <span className="cursor-blink">▌</span>
    </span>
  );
}

export default function Hero({ onNavigate }) {
  return (
    <section id="home" className="relative min-h-screen pt-16 overflow-hidden">
      {/* 3D intersection – right on desktop, top on mobile */}
      <SceneView
        scene="intersection"
        interactive
        className="absolute inset-x-0 top-16 h-[48vh] lg:inset-y-0 lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:w-[56%]"
        fallback={<div className="w-full h-full hatch opacity-10" />}
      />

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 min-h-[calc(100vh-4rem)] flex flex-col justify-end lg:justify-center pt-[50vh] lg:pt-0 pb-20 lg:pb-24">
        <div className="lg:w-[46%] lg:pr-8">
          <p className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-gray-600 mb-5 reveal">{landing.tag}</p>
          <h1 className="sheen-text text-[2.4rem] leading-[0.92] sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl 2xl:text-[5.2rem] font-black uppercase tracking-tighter reveal delay-100 inline">
            {landing.headline}
          </h1>
          <p className="mt-5 text-base md:text-lg leading-relaxed text-gray-700 font-medium max-w-xl reveal delay-200">
            {landing.subheadline}
          </p>
          <div className="mt-4 text-sm text-gray-700 reveal delay-200 h-6">
            <span className="text-gray-600 font-mono text-xs uppercase tracking-widest mr-3">interests</span>
            <Typewriter words={personal.researchInterests} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4 reveal delay-300">
            <Magnetic>
              <a
                href="#projects"
                onClick={(e) => { e.preventDefault(); onNavigate("#projects"); }}
                className="inline-flex items-center gap-3 bg-black text-white px-7 py-4 font-bold uppercase tracking-widest text-sm border-2 border-black hover:bg-white hover:text-black transition-colors duration-300 hover:shadow-ink"
              >
                {landing.ctaText} <ArrowDown size={16} />
              </a>
            </Magnetic>
            {personal.openToResearch && (
              <Magnetic>
                <a
                  href="#research"
                  onClick={(e) => { e.preventDefault(); onNavigate("#research"); }}
                  className="inline-flex items-center gap-3 bg-white text-black px-7 py-4 font-bold uppercase tracking-widest text-sm border-2 border-black hover:bg-black hover:text-white transition-colors duration-300 hover:shadow-ink"
                >
                  {landing.secondaryCtaText}
                </a>
              </Magnetic>
            )}
            <div className="flex items-center gap-4 ml-1 text-black">
              <a href={personal.githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub" className="hover:-translate-y-1 transition-transform"><Github size={22} /></a>
              <a href={personal.linkedinUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:-translate-y-1 transition-transform"><Linkedin size={22} /></a>
              <a href={`mailto:${personal.email}`} aria-label="Email" className="hover:-translate-y-1 transition-transform"><Mail size={22} /></a>
            </div>
          </div>
        </div>
      </div>

      {/* ticker */}
      <div className="absolute bottom-0 inset-x-0 border-t-2 border-b-2 border-black bg-white overflow-hidden">
        <div className="ticker-track flex w-max whitespace-nowrap py-2 text-[11px] font-mono font-bold uppercase tracking-[0.2em]">
          {[...landing.ticker, ...landing.ticker].map((t, i) => (
            <span key={i} className="px-6 flex items-center gap-6">
              {t} <span className="inline-block w-1.5 h-1.5 bg-black rounded-full" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
