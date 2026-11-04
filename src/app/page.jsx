"use client";
import * as React from "react";
import Nav from "../components/Nav";
import Hero from "../components/sections/Hero";
import About from "../components/sections/About";
import Experience from "../components/sections/Experience";
import Projects from "../components/sections/Projects";
import Research from "../components/sections/Research";
import Skills from "../components/sections/Skills";
import Education from "../components/sections/Education";
import Contact from "../components/sections/Contact";
import { useReveal } from "../hooks/useReveal";
import { ScrollProgress, IntroWipe } from "../components/fx/Chrome";

export default function Home() {
  useReveal();
  const navigate = React.useCallback((href) => {
    const el = document.getElementById(href.replace("#", ""));
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  return (
    <div className="grain font-sans">
      <IntroWipe />
      <Nav onNavigate={navigate} />
      <ScrollProgress />
      <main id="main">
        <Hero onNavigate={navigate} />
        <About />
        <Experience />
        <Projects />
        <Research />
        <Skills />
        <Education />
        <Contact />
      </main>
    </div>
  );
}
