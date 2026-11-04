import * as React from "react";
import { Mail, Github, Linkedin, FileText, Phone, Instagram, BookOpen } from "lucide-react";
import SceneView from "../three/SceneView";
import { SectionHeader } from "../SectionHeader";
import { portfolioData } from "../../data/portfolioData";
import { asset } from "../../lib/site";

const { contact, personal } = portfolioData;

export default function Contact() {
  const rows = [
    { icon: Mail, label: personal.email, href: `mailto:${personal.email}` },
    { icon: Github, label: personal.github, href: personal.githubUrl },
    { icon: Linkedin, label: personal.linkedin, href: personal.linkedinUrl },
    personal.phone && { icon: Phone, label: personal.phone, href: `tel:${personal.phone.replace(/[^+\d]/g, "")}` },
    personal.blogUrl && { icon: BookOpen, label: personal.blogUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: personal.blogUrl },
    personal.instagramUrl && { icon: Instagram, label: "Instagram", href: personal.instagramUrl },
    { icon: FileText, label: personal.resumeText, href: asset(personal.resumeFile), download: true },
  ].filter(Boolean);

  return (
    <section id="contact" className="relative bg-black text-white border-t-2 border-black">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-24 md:py-32 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <SectionHeader index={8} tag={contact.tag} headline={contact.headline} inverted />
          <p className="text-gray-300 text-lg leading-relaxed max-w-xl reveal delay-200 -mt-6 mb-10">{contact.text}</p>
          <ul className="space-y-4 text-base md:text-lg font-mono reveal delay-300">
            {rows.map(({ icon: Icon, label, href, download }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(download ? { download: true } : href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="group inline-flex items-center gap-4 hover:translate-x-3 transition-transform duration-300"
                >
                  <span className="bg-white text-black p-3 group-hover:bg-gray-200 transition-colors"><Icon size={20} /></span>
                  <span className="group-hover:underline underline-offset-8 decoration-2">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <SceneView
          scene="beacon"
          inverted
          interactive
          className="lg:col-span-5 w-full h-[50vh] min-h-[320px] max-h-[640px]"
          fallback={<div className="w-full h-full hatch-paper opacity-10" />}
        />
      </div>
      <footer className="border-t border-white/20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-[0.25em] text-gray-400">
          <span>© {new Date().getFullYear()} {personal.firstName} {personal.lastName}</span>
          <span>Drawn in real time · Three.js · Next.js</span>
        </div>
      </footer>
    </section>
  );
}
