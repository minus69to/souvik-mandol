"use client";
import * as React from "react";
import { Menu, X, FileText, Github, Linkedin, Mail } from "lucide-react";
import { portfolioData } from "../data/portfolioData";
import { asset } from "../lib/site";
import { useActiveSection } from "../hooks/useReveal";

const { personal, nav } = portfolioData;
const SECTION_IDS = ["home", ...nav.map((l) => l.href.replace("#", ""))];

export default function Nav({ onNavigate }) {
  const active = useActiveSection(SECTION_IDS);
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef(null);
  const firstLinkRef = React.useRef(null);

  const go = (e, href) => {
    e.preventDefault();
    setOpen(false);
    onNavigate(href);
  };

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return () => (document.body.style.overflow = "");
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    firstLinkRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the menu if the viewport grows past the mobile breakpoint.
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="fixed top-0 inset-x-0 z-50 bg-black text-white border-b-2 border-black">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4 lg:gap-6 min-w-0">
          <a href="#home" onClick={(e) => go(e, "#home")} className="flex items-center gap-3 group min-w-0 shrink">
            <span className="w-9 h-9 shrink-0 rounded-full overflow-hidden border border-white/50 group-hover:border-white transition-colors">
              <img src={asset(personal.photoSmall)} alt="" className="w-full h-full object-cover grayscale" />
            </span>
            <span className="font-black uppercase tracking-tighter text-lg leading-none truncate">
              {personal.firstName} {personal.lastName}
            </span>
            <span className="hidden 2xl:inline text-[10px] font-mono uppercase tracking-[0.3em] text-gray-400 ml-2 whitespace-nowrap">{personal.tagline}</span>
          </a>

          <nav aria-label="Primary" className="hidden lg:flex items-center gap-5 xl:gap-7 shrink-0">
            {nav.map((l) => {
              const id = l.href.replace("#", "");
              const isActive = active === id;
              return (
                <a
                  key={l.name}
                  href={l.href}
                  onClick={(e) => go(e, l.href)}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative text-[11px] xl:text-xs font-bold uppercase tracking-[0.15em] xl:tracking-[0.2em] transition-colors ${isActive ? "text-white" : "text-gray-400 hover:text-white"}`}
                >
                  {l.name}
                  <span className={`absolute -bottom-2 left-0 h-[2px] bg-white transition-all duration-300 ${isActive ? "w-full" : "w-0"}`} />
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={asset(personal.resumeFile)}
              download
              className="hidden sm:inline-flex items-center gap-2 bg-white text-black px-3 py-2 text-[11px] font-bold uppercase tracking-widest border-2 border-white hover:bg-black hover:text-white transition-colors"
            >
              <FileText size={14} /> CV
            </a>
            <button
              ref={buttonRef}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 border border-white/40 hover:bg-white hover:text-black transition-colors"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="lg:hidden fixed inset-0 z-40 bg-black text-white pt-24 px-6 pb-10 flex flex-col overflow-y-auto">
          <nav aria-label="Mobile" className="flex flex-col">
            {nav.map((l, i) => (
              <a
                key={l.name}
                ref={i === 0 ? firstLinkRef : undefined}
                href={l.href}
                onClick={(e) => go(e, l.href)}
                className="flex items-baseline gap-4 py-4 border-b border-white/20 text-2xl font-black uppercase tracking-tight hover:pl-2 focus:pl-2 transition-all outline-none"
              >
                <span className="text-xs font-mono text-gray-400">{String(i + 1).padStart(2, "0")}</span>
                {l.name}
              </a>
            ))}
          </nav>
          <div className="mt-auto pt-10 flex items-center gap-2 text-gray-300">
            <a href={personal.githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub" className="p-3 -ml-3"><Github size={22} /></a>
            <a href={personal.linkedinUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="p-3"><Linkedin size={22} /></a>
            <a href={`mailto:${personal.email}`} aria-label="Email" className="p-3"><Mail size={22} /></a>
            <a href={asset(personal.resumeFile)} download className="ml-auto inline-flex items-center gap-2 bg-white text-black px-4 py-3 text-xs font-bold uppercase tracking-widest">
              <FileText size={14} /> {personal.resumeText}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
