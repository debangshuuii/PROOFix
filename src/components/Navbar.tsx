'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  FolderGit2,
  Settings as SettingsIcon,
  Cpu,
  Shield,
  Layers,
  FileCheck2,
  Search,
  Command,
  Sparkles,
} from 'lucide-react';
import { CommandPaletteModal } from './navigation/CommandPaletteModal';
import { HamburgerButton } from './navigation/HamburgerButton';
import { MobileNavigationDrawer } from './navigation/MobileNavigationDrawer';
import { ThemeSwitcher } from './theme/ThemeSwitcher';

export function Navbar() {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const coreLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/projects', label: 'Projects', icon: FolderGit2 },
    { href: '/#playground', label: 'Sandbox', icon: Sparkles, badge: 'Demo' },
    { href: '/hub', label: 'Operations Hub', icon: Cpu },
  ];

  const enterpriseLinks = [
    { href: '/sandbox', label: 'Sandbox', icon: Shield, badge: 'Cgroups' },
    { href: '/queue', label: 'Queues', icon: Layers, badge: 'DLQ' },
    { href: '/governance', label: 'SOC2', icon: FileCheck2, badge: 'Audit' },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Mobile Hamburger */}
          <div className="flex items-center gap-3 sm:gap-5">
            <HamburgerButton
              isOpen={mobileDrawerOpen}
              onClick={() => setMobileDrawerOpen((prev) => !prev)}
              ariaLabel="Toggle mobile navigation menu"
            />
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  PROOF<span className="text-sky-400">ix</span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/50">
                    Enterprise
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-none hidden sm:block">
                  Prove that it works.
                </p>
              </div>
            </Link>

            {/* Nav Items */}
            <nav className="hidden md:flex items-center gap-1 ml-2">
              {coreLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-sky-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="h-4 w-px bg-slate-800 mx-1.5" />

              {enterpriseLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-sky-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions: Cmd+K Search Button, ThemeSwitcher & Launch */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Search commands...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>

            {/* Desktop Theme Switcher */}
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>

            <Link
              href="/dashboard"
              className="text-xs px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-md shadow-sky-600/20 transition-colors"
            >
              Console
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNavigationDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpenSearch={() => setPaletteOpen(true)}
      />

      {/* Global Command Palette Modal */}
      <CommandPaletteModal isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
