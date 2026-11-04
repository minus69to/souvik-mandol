"use client";
import * as React from "react";
import { Menu, X, FileText, Github, Linkedin, Mail } from "lucide-react";
import { portfolioData } from "../data/portfolioData";
import { asset } from "../lib/site";

const { personal, nav } = portfolioData;

export default function Nav({ active, onNavigate }) {
  const [open, setOpen] = React.useState(false);
  const go = (e, href) => {
    e.preventDefault();
    setOpen(false);
    onNavigate(href);
  };
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-black text-white border-b-2 border-black">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-6">
          <a href="#home" onClick={(e) => go(e, "#home")} className="flex items-center gap-3 group shrink-0">
            <span className="w-9 h-9 rounded-full overflow-hidden border border-white/50 group-hover:border-white transition-colors">
              <img src={asset(personal.photoSmall)} alt="" className="w-full h-full object-cover grayscale" />
            </span>
            <span className="font-black uppercase tracking-tighter text-lg leading-none">
              {personal.firstName} {personal.lastName}
            </span>
            <span className="hidden xl:inline text-[10px] font-mono uppercase tracking-[0.3em] text-gray-400 ml-2">{personal.tagline}</span>
          </a>

          <nav className="hidden md:flex items-center gap-5 lg:gap-7">
            {nav.map((l) => {
              const id = l.href.replace("#", "");
              const isActive = active === id;
              return (
                <a
                  key={l.name}
                  href={l.href}
                  onClick={(e) => go(e, l.href)}
                  className={`relative text-[11px] lg:text-xs font-bold uppercase tracking-[0.2em] transition-colors ${isActive ? "text-white" : "text-gray-400 hover:text-white"}`}
                >
                  {l.name}
                  <span className={`absolute -bottom-2 left-0 h-[2px] bg-white transition-all duration-300 ${isActive ? "w-full" : "w-0"}`} />
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={asset(personal.resumeFile)}
              download
              className="hidden sm:inline-flex items-center gap-2 bg-white text-black px-3 py-2 text-[11px] font-bold uppercase tracking-widest border-2 border-white hover:bg-black hover:text-white transition-colors"
            >
              <FileText size={14} /> CV
            </a>
            <button
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 border border-white/40 hover:bg-white hover:text-black transition-colors"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black text-white pt-24 px-6 pb-10 flex flex-col overflow-y-auto">
          <nav className="flex flex-col">
            {nav.map((l, i) => (
              <a
                key={l.name}
                href={l.href}
                onClick={(e) => go(e, l.href)}
                className="flex items-baseline gap-4 py-4 border-b border-white/20 text-2xl font-black uppercase tracking-tight hover:pl-2 transition-all"
              >
                <span className="text-xs font-mono text-gray-500">{String(i + 1).padStart(2, "0")}</span>
                {l.name}
              </a>
            ))}
          </nav>
          <div className="mt-auto pt-10 flex items-center gap-6 text-gray-300">
            <a href={personal.githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={22} /></a>
            <a href={personal.linkedinUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={22} /></a>
            <a href={`mailto:${personal.email}`} aria-label="Email"><Mail size={22} /></a>
            <a href={asset(personal.resumeFile)} download className="ml-auto inline-flex items-center gap-2 bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-widest">
              <FileText size={14} /> {personal.resumeText}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
