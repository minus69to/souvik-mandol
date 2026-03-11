import React from 'react';
import { Github, Linkedin, Mail } from 'lucide-react';
import { portfolioData } from '../data/portfolioData';

export default function Sidebar({ activeSection, handleNavClick }) {
  return (
    <aside className="hidden md:flex w-72 bg-black text-white fixed h-screen flex-col justify-between p-12 border-r-8 border-neutral-900 z-10 overflow-y-auto">
      <div>
        <div className="mb-12 group cursor-pointer" onClick={(e) => handleNavClick(e, '#home')}>
          <div className="w-24 h-24 rounded-full border-2 border-gray-700 bg-gray-900 flex items-center justify-center mb-6 overflow-hidden group-hover:border-white group-hover:scale-105 transition-all duration-500">
            <img src="/souvik-mandol/profile.jpg" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tighter uppercase leading-none mb-2 group-hover:text-gray-300 transition-colors">
            {portfolioData.personal.firstName}<br/>{portfolioData.personal.lastName}
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-[0.3em] font-semibold">{portfolioData.personal.role}</p>
        </div>
        
        <nav className="flex flex-col gap-5">
          {portfolioData.nav.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={`text-sm transition-all uppercase tracking-[0.2em] font-bold flex items-center gap-3 group ${activeSection === link.name.toLowerCase() ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <span className={`h-[2px] bg-white transition-all duration-300 ${activeSection === link.name.toLowerCase() ? 'w-8' : 'w-0 group-hover:w-4'}`}></span>
              {link.name}
            </a>
          ))}
        </nav>
      </div>
      
      <div className="text-[10px] text-gray-600 uppercase tracking-wider space-y-2 mt-12">
        <div className="flex gap-4 mb-4">
          <a href={portfolioData.personal.githubUrl} target="_blank" rel="noreferrer" className="hover:text-white hover:-translate-y-1 transition-all"><Github size={18} /></a>
          <a href={portfolioData.personal.linkedinUrl} target="_blank" rel="noreferrer" className="hover:text-white hover:-translate-y-1 transition-all"><Linkedin size={18} /></a>
          <a href={`mailto:${portfolioData.personal.email}`} className="hover:text-white hover:-translate-y-1 transition-all"><Mail size={18} /></a>
        </div>
        <p>© {new Date().getFullYear()} {portfolioData.personal.firstName} {portfolioData.personal.lastName}.</p>
      </div>
    </aside>
  );
}