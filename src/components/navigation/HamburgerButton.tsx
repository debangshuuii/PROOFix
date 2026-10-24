'use client';

/**
 * Mobile Hamburger Menu Toggle Button
 *
 * Provides a touch-friendly animated toggle button for viewports < 768px
 * with accessibility ARIA controls and state transition indicators.
 */

import React from 'react';
import { Menu, X } from 'lucide-react';

interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

export function HamburgerButton({ isOpen, onClick, className = '', ariaLabel }: HamburgerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || (isOpen ? 'Close navigation menu' : 'Open navigation menu')}
      aria-expanded={isOpen}
      aria-controls="mobile-nav-drawer"
      className={`md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all focus:outline-none focus:ring-1 focus:ring-sky-500 ${className}`}
    >
      {isOpen ? (
        <X className="w-4 h-4 text-sky-400 transition-transform duration-200 rotate-90 scale-105" />
      ) : (
        <Menu className="w-4 h-4 text-slate-300 transition-transform duration-200" />
      )}
    </button>
  );
}
