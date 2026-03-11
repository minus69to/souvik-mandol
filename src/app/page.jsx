'use client'; // Required for client-side interactivity in Next.js App Router
import React, { useState, useEffect } from 'react';
import { Code2, ExternalLink, Mail, Github, Linkedin } from 'lucide-react';
import { portfolioData } from '../data/portfolioData';
import Sidebar from '../components/Sidebar';
import MobileHeader from '../components/MobileHeader';

export default function Home() {
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    const handleScroll = () => {
      const sections = ['home', ...portfolioData.nav.map(link => link.name.toLowerCase())];
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && element.offsetTop <= scrollPosition && (element.offsetTop + element.offsetHeight) > scrollPosition) {
          setActiveSection(section);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      revealObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      window.scrollTo({ top: element.offsetTop, behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-x-hidden">
      
      <MobileHeader 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
        handleNavClick={handleNavClick} 
      />
      
      <Sidebar 
        activeSection={activeSection} 
        handleNavClick={handleNavClick} 
      />

      {/* Main Content Areas */}
      <main className="flex-1 min-w-0 md:ml-72 md:w-[calc(100%-18rem)] p-4 sm:p-6 pt-24 md:p-10 lg:p-14 xl:p-16 max-w-none">
        
        {/* LANDING */}
        <section id="home" className="min-h-screen flex flex-col xl:flex-row items-center justify-center gap-8 lg:gap-12 pb-24 md:pb-0">
          <div className="flex-1 order-2 md:order-1 reveal">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-6">{portfolioData.landing.tag}</h2>
            <h3 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-none mb-8">
              {portfolioData.landing.headline}
            </h3>
            <p className="text-xl md:text-2xl leading-relaxed text-gray-600 font-medium mb-10 reveal delay-100">
              {portfolioData.landing.subheadline}
            </p>
            <a href="#projects" onClick={(e) => handleNavClick(e, '#projects')} className="inline-block bg-black text-white px-8 py-4 font-bold uppercase tracking-widest hover:bg-white hover:text-black border-2 border-transparent hover:border-black transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] reveal delay-200">
              {portfolioData.landing.ctaText}
            </a>
          </div>
          <div className="order-1 xl:order-2 w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full border-8 border-black bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl reveal hover:scale-105 transition-transform duration-500">
              <span className="text-gray-400 font-bold uppercase tracking-widest">Photo</span>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="py-24 border-t-2 border-black">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-6 reveal">{portfolioData.about.tag}</h2>
          <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-8 reveal delay-100">{portfolioData.about.headline}</h3>
          <p className="text-lg md:text-xl leading-relaxed max-w-3xl text-gray-800 font-medium reveal delay-200 hover:text-black transition-colors">{portfolioData.about.description}</p>
        </section>

        {/* EDUCATION */}
        <section id="education" className="py-24 border-t-2 border-black">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-12 reveal">{portfolioData.education.tag}</h2>
          <div className="space-y-12">
            {portfolioData.education.items.map((edu, index) => (
              <div key={edu.id} className={`flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-black pl-6 hover:border-gray-400 transition-all duration-300 hover:translate-x-2 reveal delay-${(index + 1) * 100}`}>
                <div>
                  <h3 className="text-2xl font-bold uppercase tracking-tight mb-2">{edu.degree}</h3>
                  <p className="text-xl text-gray-800 font-bold mb-1">{edu.institution}</p>
                  <p className="text-gray-500 font-mono">{edu.details}</p>
                </div>
                <div className="bg-black text-white px-4 py-2 text-sm font-mono font-bold uppercase shrink-0 w-max hover:bg-white hover:text-black border-2 border-black transition-colors">{edu.duration}</div>
              </div>
            ))}
          </div>
        </section>

        {/* EXPERIENCE */}
        <section id="experience" className="py-24 border-t-2 border-black">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-12 reveal">{portfolioData.experience.tag}</h2>
          <div className="space-y-16">
            {portfolioData.experience.jobs.map((job, index) => (
              <div key={job.id} className={`group border-l-4 border-black pl-6 md:pl-10 hover:border-black transition-all duration-300 hover:translate-x-2 reveal delay-${(index + 1) * 100}`}>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-2 group-hover:text-gray-700 transition-colors">{job.title}</h3>
                <p className="text-lg font-mono font-bold mb-6 flex items-center gap-4">
                  <span className="bg-black text-white px-3 py-1 text-sm uppercase group-hover:bg-gray-800 transition-colors">{job.company}</span>
                  <span className="text-gray-500">{job.duration}</span>
                </p>
                <ul className="text-lg space-y-4 max-w-3xl text-gray-800">
                  {job.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex gap-4 hover:text-black transition-colors">
                      <span className="mt-2 h-1.5 w-1.5 bg-black rounded-full shrink-0 group-hover:scale-150 transition-transform"></span>
                      <p>{bullet}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* PROJECTS */}
        <section id="projects" className="py-24 border-t-2 border-black">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-12 reveal">{portfolioData.projects.tag}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {portfolioData.projects.items.map((project, index) => (
              <div key={project.id} className={`border-2 border-black p-8 bg-white hover:bg-black hover:text-white transition-all duration-300 group flex flex-col h-full reveal hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${project.featured ? 'md:col-span-2' : ''}`} style={{ transitionDelay: `${index * 50}ms` }}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold uppercase tracking-tight">{project.title}</h3>
                  <div className="flex gap-3 text-gray-400 group-hover:text-white">
                    {project.codeUrl && project.codeUrl !== "#" && project.codeUrl !== "" && (
                      <a href={project.codeUrl} target="_blank" rel="noreferrer" className="hover:scale-110 hover:text-gray-200 transition-all"><Code2 size={24} /></a>
                    )}
                    {project.demoUrl && project.demoUrl !== "#" && project.demoUrl !== "" && (
                      <a href={project.demoUrl} target="_blank" rel="noreferrer" className="hover:scale-110 hover:text-gray-200 transition-all"><ExternalLink size={24} /></a>
                    )}
                  </div>
                </div>
                <p className="text-lg mb-8 flex-grow opacity-90">{project.description}</p>
                <div className="flex gap-2 flex-wrap mt-auto">
                  {project.tags.map(tech => (
                    <span key={tech} className="text-xs font-mono border border-current px-2 py-1 uppercase group-hover:bg-white group-hover:text-black transition-colors">{tech}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RESEARCH */}
        <section id="research" className="py-24 border-t-2 border-black">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-12 reveal">{portfolioData.research.tag}</h2>
          <div className="space-y-8">
            {portfolioData.research.items.map((res, index) => (
              <div key={res.id} className={`bg-gray-50 p-8 border-l-8 border-black hover:bg-gray-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-300 reveal delay-${(index + 1) * 100}`}>
                <div className="mb-4">
                  <span className="inline-block bg-black text-white text-xs font-mono px-2 py-1 uppercase mb-3">Status: {res.status}</span>
                  <h3 className="text-2xl font-bold uppercase tracking-tight">{res.title}</h3>
                </div>
                <p className="text-lg leading-relaxed text-gray-800 mb-6">{res.description}</p>
                <div className="flex gap-2 flex-wrap">
                  {res.tags.map(tag => (
                    <span key={tag} className="text-xs font-bold text-gray-600 uppercase tracking-wider border border-gray-300 px-2 py-1 hover:border-black transition-colors">#{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SKILLS */}
        <section id="skills" className="py-24 border-t-2 border-black">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-12 reveal">{portfolioData.skills.tag}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {portfolioData.skills.categories.map((category, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 group hover:border-black transition-colors duration-300 reveal" style={{ transitionDelay: `${index * 50}ms` }}>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-2 group-hover:translate-x-2 transition-transform duration-300">{category.name}</h3>
                <p className="text-lg text-gray-700 font-mono leading-relaxed group-hover:text-black transition-colors">{category.items}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CERTIFICATIONS */}
        <section id="certifications" className="py-24 border-t-2 border-black">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-12 reveal">{portfolioData.certifications.tag}</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolioData.certifications.items.map((cert, index) => (
              <li key={index} className="flex items-start gap-4 p-4 border-2 border-transparent bg-gray-50 hover:bg-white hover:border-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 reveal" style={{ transitionDelay: `${index * 50}ms` }}>
                <span className="text-xl font-black text-gray-300 shrink-0 group-hover:text-black transition-colors">{(index + 1).toString().padStart(2, '0')}</span>
                <span className="text-lg font-bold text-gray-800">{cert}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CONTACT */}
        <section id="contact" className="py-24 border-t-2 border-black min-h-[70vh] flex flex-col justify-center">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-12 reveal">{portfolioData.contact.tag}</h2>
          <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-12 reveal delay-100" dangerouslySetInnerHTML={{ __html: portfolioData.contact.headline.replace(/something/g, '<br/>something<br/>') }} />
          <div className="flex flex-col gap-6 text-xl font-mono reveal delay-200">
            <a href={`mailto:${portfolioData.personal.email}`} className="flex items-center gap-4 hover:translate-x-4 transition-transform duration-300 w-max group">
              <span className="bg-black text-white p-3 group-hover:bg-gray-800 transition-colors"><Mail size={24} /></span>
              <span className="group-hover:underline underline-offset-8 decoration-4">{portfolioData.personal.email}</span>
            </a>
            <a href={portfolioData.personal.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-4 hover:translate-x-4 transition-transform duration-300 w-max group">
              <span className="bg-black text-white p-3 group-hover:bg-gray-800 transition-colors"><Github size={24} /></span>
              <span className="group-hover:underline underline-offset-8 decoration-4">{portfolioData.personal.github}</span>
            </a>
            <a href={portfolioData.personal.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-4 hover:translate-x-4 transition-transform duration-300 w-max group">
              <span className="bg-black text-white p-3 group-hover:bg-gray-800 transition-colors"><Linkedin size={24} /></span>
              <span className="group-hover:underline underline-offset-8 decoration-4">{portfolioData.personal.linkedin}</span>
            </a>
          </div>
        </section>

      </main>
    </div>
  );
}
