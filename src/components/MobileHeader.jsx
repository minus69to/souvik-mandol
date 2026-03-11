import React from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { portfolioData } from '../data/portfolioData';

export default function MobileHeader({ isMobileMenuOpen, setIsMobileMenuOpen, handleNavClick }) {
  return (
    <>
      <header className="md:hidden bg-black text-white p-4 fixed w-full z-50 flex justify-between items-center border-b border-gray-800 transition-all">
        <div className="flex items-center gap-3 cursor-pointer" onClick={(e) => handleNavClick(e, '#home')}>
          <div className="w-8 h-8 rounded-full border border-gray-700 bg-gray-900 flex items-center justify-center overflow-hidden shrink-0 hover:scale-110 transition-transform">
            <span className="text-[8px] text-gray-500 uppercase">{portfolioData.personal.imagePlaceholderText}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tighter uppercase">{portfolioData.personal.firstName} {portfolioData.personal.lastName}</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-800 rounded-md transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black text-white z-40 pt-20 px-6 flex flex-col h-screen overflow-y-auto pb-10">
          <nav className="flex flex-col gap-6 text-xl">
            {portfolioData.nav.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                onClick={(e) => handleNavClick(e, link.href)}
                className="hover:text-gray-400 transition-colors uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-4"
              >
                <ChevronRight size={16} /> {link.name}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
